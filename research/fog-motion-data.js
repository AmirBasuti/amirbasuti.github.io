import * as THREE from '../vendor/three-r180/three.module.min.js';

const clamp = n => Math.max(0, Math.min(1, n));
const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const ease = (a, b, t) => smooth((t - a) / (b - a));
const integral = (a, b, t) => {
  const x = clamp((t - a) / (b - a));
  return (b - a) * (x * x * x - .5 * x * x * x * x) + Math.max(0, t - b);
};

/**
 * Illustrative kinematics sampled from the same posed skeleton as the scene.
 * These are not FoG-STAR IMUs: no gravity, sensor orientation, clinical data,
 * calibrated acceleration units, or model inference is claimed.
 * Fixed 60 Hz finite differences are independent of scroll/frame timing.
 */
export function createMotionData(model, mixer, walk, idle, bones) {
  const rate = 60, duration = 6, count = rate * duration + 1;
  const slowStart = duration * .17 / .57;
  const slowEnd = duration * .27 / .57;
  function pose(seconds) {
    const t = Math.max(0, Math.min(duration, seconds));
    const hesitation = ease(slowStart, slowEnd, t);
    const walkTime = t - .94 * integral(slowStart, slowEnd, t);
    walk.setEffectiveWeight(1 - hesitation * .94);
    idle.setEffectiveWeight(hesitation * .94);
    mixer.setTime(walkTime);
    // Idle breathing remains actual authored animation, not a frozen mannequin.
    idle.time = (t * .55) % idle.getClip().duration;
    mixer.update(0);
    model.updateWorldMatrix(true, true);
  }
  const raw = bones.map(() => new Float32Array(count * 3));
  const root = new Float32Array(count * 3);
  const point = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    pose(i / rate);
    bones.forEach((bone, sensor) => {
      bone.getWorldPosition(point);
      point.toArray(raw[sensor], i * 3);
    });
  }
  // The asset's walk is in-place. Cancel displacement of the lower foot in
  // world space; a soft support weighting avoids jumps when contact changes.
  const initialFootY = Math.min(raw[0][1], raw[1][1]);
  for (let i = 1; i < count; i++) {
    const at = i * 3, previous = at - 3;
    const low = Math.min(raw[0][at + 1], raw[1][at + 1]);
    const leftWeight = Math.exp(-(raw[0][at + 1] - low) / .045);
    const rightWeight = Math.exp(-(raw[1][at + 1] - low) / .045);
    const weight = leftWeight + rightWeight;
    for (const axis of [0, 2]) {
      const displacement = (leftWeight * (raw[0][at + axis] - raw[0][previous + axis])
        + rightWeight * (raw[1][at + axis] - raw[1][previous + axis])) / weight;
      root[at + axis] = root[previous + axis] - displacement;
    }
    root[at + 1] = initialFootY - low;
  }
  const positions = raw.map(source => {
    const values = new Float32Array(source.length);
    for (let i = 0; i < source.length; i++) values[i] = source[i] + root[i];
    return values;
  });
  const velocities = positions.map(() => new Float32Array(count * 3));
  const accelerations = positions.map(() => new Float32Array(count * 3));
  const signals = positions.map((values, sensor) => {
    const velocity = velocities[sensor], acceleration = accelerations[sensor];
    for (let i = 0; i < count; i++) {
      const before = Math.max(0, i - 1), after = Math.min(count - 1, i + 1);
      const dt = (after - before) / rate;
      for (let axis = 0; axis < 3; axis++) {
        velocity[i * 3 + axis] = (values[after * 3 + axis] - values[before * 3 + axis]) / dt;
      }
    }
    const magnitude = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const before = Math.max(0, i - 1), after = Math.min(count - 1, i + 1);
      const dt = (after - before) / rate;
      for (let axis = 0; axis < 3; axis++) {
        acceleration[i * 3 + axis] = (velocity[after * 3 + axis] - velocity[before * 3 + axis]) / dt;
      }
      magnitude[i] = Math.hypot(acceleration[i * 3], acceleration[i * 3 + 1], acceleration[i * 3 + 2]);
    }
    // A symmetric five-sample display average suppresses authored keyframe
    // corners. This is presentation smoothing, not the clinical preprocessing.
    const filtered = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      let total = 0, used = 0;
      for (let j = Math.max(0, i - 2); j <= Math.min(count - 1, i + 2); j++) { total += magnitude[j]; used++; }
      filtered[i] = total / used;
    }
    const ordered = Array.from(filtered).sort((a, b) => a - b);
    const scale = Math.max(ordered[Math.floor(ordered.length * .95)], .0001);
    return Float32Array.from(filtered, value => Math.min(value / scale, 1.5));
  });
  function readVector(values, seconds, target) {
    const frame = clamp(seconds / duration) * (count - 1);
    const a = Math.floor(frame), b = Math.min(count - 1, a + 1), f = frame - a;
    target.set(values[a * 3] + (values[b * 3] - values[a * 3]) * f,
      values[a * 3 + 1] + (values[b * 3 + 1] - values[a * 3 + 1]) * f,
      values[a * 3 + 2] + (values[b * 3 + 2] - values[a * 3 + 2]) * f);
    return target;
  }
  function signalAt(sensor, fraction) {
    const frame = clamp(fraction) * (count - 1);
    const a = Math.floor(frame), b = Math.min(count - 1, a + 1), f = frame - a;
    return signals[sensor][a] + (signals[sensor][b] - signals[sensor][a]) * f;
  }
  pose(0);
  return { rate, duration, root, positions, velocities, accelerations, signals, pose, readVector, signalAt };
}
