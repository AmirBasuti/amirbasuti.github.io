import * as THREE from '../vendor/three-r180/three.module.min.js';

const clamp = n => Math.max(0, Math.min(1, n));
const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const ease = (a, b, t) => smooth((t - a) / (b - a));

/**
 * Illustrative kinematics sampled from the same posed skeleton as the scene.
 * These are not FoG-STAR IMUs: no gravity, sensor orientation, clinical data,
 * calibrated acceleration units, or model inference is claimed.
 * Fixed 60 Hz finite differences are independent of scroll/frame timing.
 */
export function createMotionData(model, mixer, walk, bones, contactBones) {
  const rate = 60, duration = 6, count = rate * duration + 1;
  const clipDuration = walk.getClip().duration;
  const cycleCount = Math.max(2, Math.round(clipDuration * rate));
  const point = new THREE.Vector3(), toe = new THREE.Vector3();
  const feet = bones.slice(0, 2);
  const cycle = Array.from({ length: cycleCount }, () => new Float32Array(12));
  const floors = new Float32Array(4).fill(Infinity);
  walk.setEffectiveWeight(1);

  // Inspect the actual authored loop before choosing a stopping phase. Ankle
  // and toe heights are measured separately; neither is the shoe's ground plane.
  for (let i = 0; i < cycleCount; i++) {
    mixer.setTime(i * clipDuration / cycleCount);
    model.updateWorldMatrix(true, true);
    feet.forEach((foot, side) => {
      foot.getWorldPosition(point).toArray(cycle[i], side * 6);
      contactBones[side].getWorldPosition(point).toArray(cycle[i], side * 6 + 3);
      floors[side * 2] = Math.min(floors[side * 2], cycle[i][side * 6 + 1]);
      floors[side * 2 + 1] = Math.min(floors[side * 2 + 1], cycle[i][side * 6 + 4]);
    });
  }
  const clearance = (frame, side) => Math.min(
    frame[side * 6 + 1] - floors[side * 2],
    frame[side * 6 + 4] - floors[side * 2 + 1]);
  let stopFrame = 0, bestScore = Infinity;
  const margin = Math.max(1, Math.round(.06 * rate));
  for (let i = 0; i < cycleCount; i++) {
    const before = cycle[(i - margin + cycleCount) % cycleCount];
    const after = cycle[(i + margin) % cycleCount];
    // Prefer the interior of double support, with quiet vertical movement.
    // A complete planted step stays intact; no unrelated idle pose is blended in.
    const support = Math.max(...[cycle[i], before, after].flatMap(frame =>
      [clearance(frame, 0), clearance(frame, 1)]));
    const verticalChange = Math.abs(after[4] - before[4]) + Math.abs(after[10] - before[10]);
    const score = support + verticalChange * .35;
    if (score < bestScore) { bestScore = score; stopFrame = i; }
  }
  const stopPhase = stopFrame * clipDuration / cycleCount;
  const stopTime = 3, slowStart = 2.1, slowDuration = stopTime - slowStart;
  const traveledClipTime = slowStart + slowDuration * .5;
  const startPhase = ((stopPhase - traveledClipTime) % clipDuration + clipDuration) % clipDuration;
  function pose(seconds) {
    const t = Math.max(0, Math.min(duration, seconds));
    const u = clamp((t - slowStart) / slowDuration);
    // The integral of 1 - smoothstep gives ordinary cadence, then continuous
    // velocity and acceleration into a fully planted hold at exactly 3 s.
    const walkTime = t <= slowStart ? t : t >= stopTime ? traveledClipTime
      : slowStart + slowDuration * (u - u * u * u + .5 * u * u * u * u);
    mixer.setTime(startPhase + walkTime);
    model.updateWorldMatrix(true, true);
  }

  // Construct a small heel proxy in each foot's local coordinates at the
  // selected planted pose. It then follows the authored foot rotation, while
  // the supplied ball bone supplies the toe. These are visual contact aids,
  // not anatomical measurements or inferred clinical contact labels.
  mixer.setTime(stopPhase);
  model.updateWorldMatrix(true, true);
  let footLength = 0;
  const heelOffsets = feet.map((foot, side) => {
    foot.getWorldPosition(point);
    contactBones[side].getWorldPosition(toe);
    footLength += point.distanceTo(toe) * .5;
    const heel = point.clone().addScaledVector(toe.clone().sub(point), -.25);
    heel.y = toe.y;
    return foot.worldToLocal(heel);
  });
  const contactHeight = (floors[1] + floors[3]) * .5;
  const touchHeight = Math.max(.006, footLength * .08);
  const releaseHeight = Math.max(.018, footLength * .20);
  const raw = bones.map(() => new Float32Array(count * 3));
  const contacts = Array.from({ length: 4 }, () => new Float32Array(count * 3));
  const root = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pose(i / rate);
    bones.forEach((bone, sensor) => {
      bone.getWorldPosition(point);
      point.toArray(raw[sensor], i * 3);
    });
    feet.forEach((foot, side) => {
      point.copy(heelOffsets[side]).applyMatrix4(foot.matrixWorld).toArray(contacts[side * 2], i * 3);
      contactBones[side].getWorldPosition(point).toArray(contacts[side * 2 + 1], i * 3);
    });
  }

  // This clip is in-place. Keep a contact point latched for each stance and
  // cancel its horizontal motion. Hysteresis prevents support flicker, and
  // weights ease through double support instead of swapping on ankle height.
  const planted = [false, false], selected = [0, 2], weights = [0, 0];
  const blend = 1 - Math.exp(-1 / (rate * .045));
  for (let i = 0; i < count; i++) {
    const at = i * 3, previous = at - 3;
    if (i / rate > stopTime) {
      root[at] = root[previous]; root[at + 1] = root[previous + 1]; root[at + 2] = root[previous + 2];
      continue;
    }
    feet.forEach((_, side) => {
      const heelIndex = side * 2, toeIndex = heelIndex + 1;
      const low = Math.min(contacts[heelIndex][at + 1], contacts[toeIndex][at + 1]) - contactHeight;
      if (!planted[side] && low < touchHeight) {
        planted[side] = true;
        selected[side] = contacts[heelIndex][at + 1] <= contacts[toeIndex][at + 1] ? heelIndex : toeIndex;
      } else if (planted[side] && low > releaseHeight) planted[side] = false;
      const target = planted[side] ? 1 - ease(touchHeight, releaseHeight, low) : 0;
      weights[side] = i === 0 ? target : weights[side] + (target - weights[side]) * blend;
    });
    const weight = weights[0] + weights[1];
    if (weight < .0001) {
      if (i) root.set(root.subarray(previous, previous + 3), at);
      continue;
    }
    for (const axis of [0, 2]) {
      if (!i) continue;
      const displacement = weights.reduce((total, value, side) => {
        const values = contacts[selected[side]];
        return total + value * (values[at + axis] - values[previous + axis]);
      }, 0) / weight;
      root[at + axis] = root[previous + axis] - displacement;
    }
    const supportedHeight = weights.reduce((total, value, side) =>
      total + value * contacts[selected[side]][at + 1], 0) / weight;
    const vertical = contactHeight - supportedHeight;
    root[at + 1] = i ? root[previous + 1] + (vertical - root[previous + 1]) * blend : vertical;
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
  return { rate, duration, root, positions, velocities, accelerations, signals, pose, readVector, signalAt,
    stopTime, stopPhase, contactHeight };
}
