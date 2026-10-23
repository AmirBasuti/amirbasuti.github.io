import * as THREE from '../vendor/three-r180/three.module.min.js';
import { GLTFLoader } from '../vendor/three-r180/addons/loaders/GLTFLoader.js';
import { createMotionData } from './fog-motion-data.js?v=20261023d';
import { createOverlay } from './scene-overlay.js?v=20261023a';

const clamp = n => Math.max(0, Math.min(1, n));
const mix = (a, b, t) => a + (b - a) * t;
const ease = (a, b, p) => { const t = clamp((p - a) / (b - a)); return t * t * (3 - 2 * t); };

/**
 * Simple Quaternius CC0 full-body character; see assets/models/README.md.
 * Authored walking and idle clips keep the limbs connected. Four trajectories
 * sampled at 60 Hz from this exact blend and contact correction drive the curves.
 * They are illustrative kinematics, not clinical IMUs or model predictions.
 * Four placements feed both representation streams. The selected 2 s window
 * illustrates offline detection; no forecasting or real-time claim is made.
 * The caller owns frame scheduling, reduced motion and context recovery.
 */
export async function createScene(host) {
  const asset = await new GLTFLoader().loadAsync(new URL('../assets/models/fog-simple-person.glb', import.meta.url).href);
  const model = asset.scene;
  const walkClip = asset.animations.find(clip => clip.name === 'HumanArmature|Man_Walk');
  const idleClip = asset.animations.find(clip => clip.name === 'HumanArmature|Man_Idle');
  if (!walkClip || !idleClip) throw new Error('The character requires its walking and idle clips.');
  const namedBones = new Map();
  model.traverse(object => {
    if (object.isBone) namedBones.set(object.name.replace(/[^a-z0-9]/gi, '').toLowerCase(), object);
  });
  const bones = ['footl', 'footr', 'abdomen', 'palmr'].map(name => namedBones.get(name));
  if (bones.some(bone => !bone)) throw new Error('The movement attachments are missing.');

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setClearColor(0xf3f1eb, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .96;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 50);
  const view = new THREE.Vector3(0, .16, 1).normalize();
  camera.position.copy(view).multiplyScalar(6.8);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb3ada0, 1.5));
  const key = new THREE.DirectionalLight(0xfffaf2, 2.3);
  key.position.set(-3, 5, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xe8edef, .85);
  rim.position.set(3, 3, -4);
  scene.add(rim);

  const geometries = new Set(), materials = new Set(), textures = new Set(), skeletons = new Set();
  const bodyMaterials = new Map();
  const keepGeometry = geometry => { geometries.add(geometry); return geometry; };
  const keepMaterial = material => { materials.add(material); return material; };
  const palette = { Shirt: 0x788476, Pants: 0x3d4944, Skin: 0xc9baa4, Eyes: 0x3b403c, Socks: 0xc9c6ba, Hair: 0x57544d };
  model.traverse(object => {
    if (!object.isMesh) return;
    geometries.add(object.geometry);
    if (object.skeleton) skeletons.add(object.skeleton);
    object.frustumCulled = false;
    object.castShadow = false;
    object.receiveShadow = false;
    const surfaces = Array.isArray(object.material) ? object.material : [object.material];
    surfaces.forEach(material => {
      if (palette[material.name] !== undefined) material.color.setHex(palette[material.name]);
      material.metalness = 0;
      material.roughness = .9;
      material.transparent = true;
      material.forceSinglePass = true;
      Object.values(material).forEach(value => { if (value?.isTexture) textures.add(value); });
      materials.add(material);
      bodyMaterials.set(material, material.opacity);
    });
  });
  const mixer = new THREE.AnimationMixer(model);
  const walk = mixer.clipAction(walkClip).play();
  const idle = mixer.clipAction(idleClip).play();
  idle.setEffectiveWeight(0);
  mixer.setTime(0);
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const scale = 3.05 / Math.max(size.y, .001);
  // Preserve the armature and mesh's authored transforms; normalize one wrapper.
  const normalized = new THREE.Group();
  normalized.scale.setScalar(scale);
  normalized.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
  normalized.add(model);
  const actor = new THREE.Group();
  actor.add(normalized);
  scene.add(actor);
  actor.updateMatrixWorld(true);
  const motion = createMotionData(normalized, mixer, walk, idle, bones);
  const end = motion.readVector(motion.root, motion.duration, new THREE.Vector3());
  const heading = Math.hypot(end.x, end.z) > .05 ? Math.atan2(end.x, end.z) : 0;
  // A near-profile view keeps all four placements, including the lower back, visible.
  actor.rotation.y = Math.atan2(.94, .34) - heading;
  const direction = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), actor.rotation.y);
  const endWorld = end.clone().applyQuaternion(direction);
  const origin = new THREE.Vector3(-endWorld.x * .35, -1.53, -endWorld.z * .35);
  // Footfalls from the same sampled feet: a contact is a low, nearly still foot.
  // Shortening strides and the planted feet appear as a cluster.
  const footfalls = [];
  [0, 1].forEach(foot => {
    const values = motion.positions[foot], speeds = motion.velocities[foot], frames = values.length / 3;
    let low = Infinity;
    for (let i = 0; i < frames; i++) low = Math.min(low, values[i * 3 + 1]);
    let touching = false;
    for (let i = 0; i < frames; i++) {
      const height = values[i * 3 + 1] - low, speed = Math.hypot(speeds[i * 3], speeds[i * 3 + 2]);
      const contact = height < .05 && speed < .6;
      if (contact && !touching) {
        const at = new THREE.Vector3(values[i * 3], 0, values[i * 3 + 2]).applyQuaternion(direction).add(origin);
        at.y = origin.y + .01;
        const near = footfalls.find(mark => mark.foot === foot && mark.at.distanceTo(at) < .06);
        if (near) near.repeats.push(i / motion.rate);
        else footfalls.push({ foot, at, time: i / motion.rate, repeats: [] });
      }
      touching = contact;
    }
  });

  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 128;
  const shadowContext = shadowCanvas.getContext('2d');
  if (!shadowContext) throw new Error('A 2D canvas is required for contact shadows.');
  const gradient = shadowContext.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(35,48,32,.3)');
  gradient.addColorStop(.45, 'rgba(35,48,32,.12)');
  gradient.addColorStop(1, 'rgba(35,48,32,0)');
  shadowContext.fillStyle = gradient;
  shadowContext.fillRect(0, 0, 128, 128);
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  textures.add(shadowTexture);
  const shadowGeometry = keepGeometry(new THREE.PlaneGeometry(.68, 1.0));
  const shadows = [0, 1].map(() => {
    const material = keepMaterial(new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, toneMapped: false }));
    const shadow = new THREE.Mesh(shadowGeometry, material);
    shadow.rotation.set(-Math.PI / 2, 0, -actor.rotation.y);
    scene.add(shadow);
    return shadow;
  });
  const groundShadow = new THREE.Mesh(
    keepGeometry(new THREE.PlaneGeometry(2.1, 1.45)),
    keepMaterial(new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, opacity: .23, depthWrite: false, toneMapped: false }))
  );
  groundShadow.rotation.x = -Math.PI / 2;
  scene.add(groundShadow);
  const contactHeight = Math.min(motion.positions[0][1], motion.positions[1][1]);
  const sensorColors = [0x405f49, 0x6c8877, 0x9a8558, 0x637158].map(value => new THREE.Color(value));
  const markerGeometry = keepGeometry(new THREE.SphereGeometry(.06, 20, 14));
  const markers = sensorColors.map(color => {
    // Sensor pods sit on the body surface and are hidden by it when behind.
    const material = keepMaterial(new THREE.MeshStandardMaterial({ color, roughness: .45, metalness: .05, transparent: true, opacity: 0 }));
    const marker = new THREE.Mesh(markerGeometry, material);
    marker.scale.set(1, .72, 1);
    scene.add(marker);
    return marker;
  });

  // A point-light walker: only the joints are shown, as soft points of light.
  // The textured character stays hidden; its skeleton and the same authored
  // walking/idle blend move every point, so the motion and traces are unchanged.
  model.traverse(object => { if (object.isMesh) object.visible = false; });
  markers.forEach(marker => { marker.visible = false; });
  const joint = name => namedBones.get(name.toLowerCase());
  const P = {};
  const names = ['UpperLegL', 'UpperLegR', 'LowerLegL', 'LowerLegR', 'FootL', 'FootR', 'Abdomen', 'Neck', 'Head',
    'UpperArmL', 'UpperArmR', 'LowerArmL', 'LowerArmR', 'PalmL', 'PalmR'];
  names.forEach(name => { if (!joint(name)) throw new Error('The point-light walker needs ' + name + '.'); P[name] = new THREE.Vector3(); });
  ['ankleL', 'ankleR', 'pelvis', 'headCenter', 'lowerBack'].forEach(name => { P[name] = new THREE.Vector3(); });
  const up = new THREE.Vector3(0, 1, 0), along = new THREE.Vector3(), side = new THREE.Vector3(), forward = new THREE.Vector3();
  // Classic 13 joint points plus the lower-back placement. Sensor points last.
  const lights = ['headCenter', 'UpperArmL', 'UpperArmR', 'LowerArmL', 'LowerArmR', 'PalmL', 'UpperLegL', 'UpperLegR', 'LowerLegL', 'LowerLegR',
    'ankleL', 'ankleR', 'lowerBack', 'PalmR'];
  const sensorJoints = ['ankleL', 'ankleR', 'lowerBack', 'PalmR'];
  const links = [['headCenter', 'shoulders'], ['UpperArmL', 'UpperArmR'], ['UpperArmL', 'LowerArmL'], ['LowerArmL', 'PalmL'], ['UpperArmR', 'LowerArmR'], ['LowerArmR', 'PalmR'],
    ['shoulders', 'pelvis'], ['UpperLegL', 'UpperLegR'], ['UpperLegL', 'LowerLegL'], ['LowerLegL', 'ankleL'], ['UpperLegR', 'LowerLegR'], ['LowerLegR', 'ankleR']];
  P.shoulders = new THREE.Vector3();
  const sensorPoints = sensorJoints.map(name => P[name]);
  function updateMannequin() {
    names.forEach(name => joint(name).getWorldPosition(P[name]));
    side.subVectors(P.UpperLegL, P.UpperLegR).setY(0).normalize();
    forward.crossVectors(side, up).normalize();
    P.ankleL.copy(P.FootL).addScaledVector(up, .09);
    P.ankleR.copy(P.FootR).addScaledVector(up, .09);
    P.pelvis.copy(P.UpperLegL).add(P.UpperLegR).multiplyScalar(.5).addScaledVector(up, .05);
    P.shoulders.copy(P.UpperArmL).add(P.UpperArmR).multiplyScalar(.5);
    along.subVectors(P.Head, P.Neck).normalize();
    P.headCenter.copy(P.Head).addScaledVector(along, .15);
    // The animated figure faces away from its rest-pose +z axis, so its back is +forward here.
    P.lowerBack.copy(P.Abdomen).lerp(P.pelvis, .45).addScaledVector(forward, .2);
  }

  const signalRoot = new THREE.Group();
  signalRoot.quaternion.copy(camera.quaternion);
  scene.add(signalRoot);
  const count = 180, indices = [];
  for (let i = 0; i < count; i++) { const n = i * 2; indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2); }
  const brass = new THREE.Color(0xa08042), quiet = new THREE.Color(0x8a9b83);
  const ribbons = Array.from({ length: 8 }, (_, index) => {
    const sensor = index % 4, branch = Math.floor(index / 4);
    const positions = new Float32Array((count + 1) * 6), colors = new Float32Array((count + 1) * 6);
    const centers = new Float32Array((count + 1) * 3);
    const geometry = keepGeometry(new THREE.BufferGeometry());
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setIndex(indices);
    const material = keepMaterial(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    signalRoot.add(mesh);
    return { sensor, branch, positions, colors, centers, geometry, material, mesh, port: new THREE.Vector3() };
  });
  // The highlighted window is the 2 s window (on the 0.5 s hop grid) inside the freeze.
  const windowStart = motion.freeze[0] / motion.duration, windowEnd = (motion.freeze[0] + 2) / motion.duration;
  const leftBound = -2.35 + 4.7 * windowStart, rightBound = -2.35 + 4.7 * windowEnd;
  const boundsGeometry = keepGeometry(new THREE.BufferGeometry());
  boundsGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
    leftBound, -.91, .07, leftBound, -.43, .07, rightBound, -.91, .07, rightBound, -.43, .07
  ], 3));
  const boundsMaterial = keepMaterial(new THREE.LineBasicMaterial({ color: brass, transparent: true, opacity: 0, toneMapped: false }));
  signalRoot.add(new THREE.LineSegments(boundsGeometry, boundsMaterial));
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 512; labelCanvas.height = 192;
  const labelContext = labelCanvas.getContext('2d');
  if (!labelContext) throw new Error('A 2D canvas is required for the interval label.');
  labelContext.textAlign = 'center';
  labelContext.fillStyle = '#40553d';
  labelContext.font = '500 64px Arial, sans-serif';
  labelContext.fillText('FoG', 256, 82);
  labelContext.fillStyle = '#65715b';
  labelContext.font = '26px Arial, sans-serif';
  labelContext.fillText('Illustrative 2 s window', 256, 132);
  const labelTexture = new THREE.CanvasTexture(labelCanvas);
  labelTexture.colorSpace = THREE.SRGBColorSpace;
  textures.add(labelTexture);
  const labelMaterial = keepMaterial(new THREE.MeshBasicMaterial({ map: labelTexture, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  const label = new THREE.Mesh(keepGeometry(new THREE.PlaneGeometry(2.8, 1.05)), labelMaterial);
  label.position.set((leftBound + rightBound) / 2, .04, .08);
  signalRoot.add(label);

  const translation = new THREE.Vector3(), follow = new THREE.Vector3();
  const bonePosition = new THREE.Vector3();
  let disposed = false, lastProgress = 0, lastPoseSeconds = -1;
  function frameScene(p) {
    const portrait = 1 - ease(.95, 1.15, camera.aspect);
    const close = Math.max(5.8, mix(5.0, 4.1, portrait) / camera.aspect);
    const wide = Math.max(8.1, 8.2 / camera.aspect);
    const distance = mix(close, wide, ease(.38, .64, p));
    follow.copy(actor.position).sub(origin).multiplyScalar(.65);
    // Portrait follows the actual person from the first frame, including the
    // initial path offset. Desktop retains its more spacious partial follow.
    follow.lerp(actor.position, portrait).multiplyScalar(1 - ease(.40, .64, p));
    follow.y = 0;
    camera.position.copy(view).multiplyScalar(distance).add(follow);
    // View direction is constant; this small follow keeps genuine root travel in frame.
    signalRoot.position.copy(follow);
  }
  function resize() {
    if (disposed) return;
    const { width, height } = host.getBoundingClientRect();
    if (width < 1 || height < 1) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 700 ? 1.25 : 1.5));
    renderer.setSize(width, height, false);
    overlay.resize(width, height);
    camera.aspect = width / height;
    frameScene(lastProgress);
    camera.updateProjectionMatrix();
  }
  function render(progress) {
    if (disposed) return;
    const p = clamp(Number.isFinite(progress) ? progress : 0);
    lastProgress = p;
    const seconds = Math.min(1, p / .5) * motion.duration;
    // The same pose() and root trajectory were used by the 60 Hz sampler.
    if (seconds !== lastPoseSeconds) {
      motion.pose(seconds);
      motion.readVector(motion.root, seconds, translation).applyQuaternion(direction);
      actor.position.copy(origin).add(translation);
      actor.updateMatrixWorld(true);
      updateMannequin();
      lastPoseSeconds = seconds;
    }
    const bodyOpacity = 1 - ease(.48, .64, p);
    actor.visible = bodyOpacity > .001;
    bones[2].getWorldPosition(bonePosition);
    groundShadow.position.set(bonePosition.x, origin.y + .004, bonePosition.z);
    groundShadow.material.opacity = .23 * bodyOpacity;
    bodyMaterials.forEach((opacity, material) => { material.opacity = opacity * bodyOpacity; material.depthWrite = bodyOpacity > .999; });
    frameScene(p);
    signalRoot.updateMatrixWorld(true);
    bones.forEach((bone, index) => {
      bone.getWorldPosition(bonePosition);
      if (index < 2) {
        const height = Math.max(0, bonePosition.y - origin.y - contactHeight);
        shadows[index].position.set(bonePosition.x, origin.y + .008, bonePosition.z);
        shadows[index].material.opacity = bodyOpacity * Math.exp(-height * 14);
        shadows[index].scale.setScalar(1 + height * .25);
      }
    });
    const emergence = ease(.32, .48, p), release = ease(.38, .64, p);
    const models = ease(.64, .84, p), output = ease(.84, 1, p);
    const history = seconds / motion.duration;
    boundsMaterial.opacity = ease(.90, 1, p) * .55;
    // The crisp overlay below replaces the textured interval label.
    labelMaterial.opacity = 0;
    ribbons.forEach(ribbon => {
      const { sensor, branch, centers, positions, colors } = ribbon;
      ribbon.port.copy(sensorPoints[sensor]);
      signalRoot.worldToLocal(ribbon.port);
      ribbon.material.opacity = emergence * (branch ? models : 1) * mix(.92, .60, output);
      ribbon.mesh.visible = ribbon.material.opacity > .001;
      if (!ribbon.mesh.visible) return;
      const sensorColor = sensorColors[sensor];
      for (let i = 0; i <= count; i++) {
        const u = i / count, sample = u * history;
        const value = motion.signalAt(sensor, sample);
        const plotX = -2.35 + 4.7 * sample;
        const plotY = (1.5 - sensor) * .48 + (value - .35) * .24;
        const attached = ease(0, .25, u) * ease(.32, .55, p);
        let x = mix(ribbon.port.x, plotX, u * emergence);
        let y = mix(ribbon.port.y, plotY, attached);
        let z = mix(ribbon.port.z, .08, attached);
        x = mix(x, plotX, release); y = mix(y, plotY, release); z = mix(z, 0, release);
        // Both model lanes retain all four sampled histories. Only their layout
        // and visual scale change: no new synthetic waveform replaces them.
        const modelY = (branch ? -.56 : .56) + (sensor - 1.5) * .065 + (value - .35) * .13;
        x = mix(x, -2.22 + 4.44 * sample, models);
        y = mix(y, modelY, models);
        z = mix(z, (sensor - 1.5) * .035, models);
        x = mix(x, plotX, output);
        y = mix(y, -.67 + (sensor - 1.5) * .026 + (branch ? .008 : -.008) + value * .028, output);
        z = mix(z, .02, output);
        const at = i * 3;
        centers[at] = x; centers[at + 1] = y; centers[at + 2] = z;
        const selected = sample >= windowStart && sample <= windowEnd;
        const finalColor = selected ? brass : quiet, colorMix = output * (selected ? 1 : .75);
        const colorAt = i * 6;
        colors[colorAt] = colors[colorAt + 3] = mix(sensorColor.r, finalColor.r, colorMix);
        colors[colorAt + 1] = colors[colorAt + 4] = mix(sensorColor.g, finalColor.g, colorMix);
        colors[colorAt + 2] = colors[colorAt + 5] = mix(sensorColor.b, finalColor.b, colorMix);
      }
      for (let i = 0; i <= count; i++) {
        const before = Math.max(0, i - 1) * 3, after = Math.min(count, i + 1) * 3;
        const dx = centers[after] - centers[before], dy = centers[after + 1] - centers[before + 1];
        const length = Math.hypot(dx, dy) || 1;
        const thickness = mix(.012, .019, output);
        const nx = -dy / length * thickness, ny = dx / length * thickness;
        const from = i * 3, to = i * 6;
        positions[to] = centers[from] + nx; positions[to + 1] = centers[from + 1] + ny; positions[to + 2] = centers[from + 2];
        positions[to + 3] = centers[from] - nx; positions[to + 4] = centers[from + 1] - ny; positions[to + 5] = centers[from + 2];
      }
      ribbon.geometry.attributes.position.needsUpdate = true;
      ribbon.geometry.attributes.color.needsUpdate = true;
    });
    renderer.render(scene, camera);
    walker(p, bodyOpacity, seconds);
    annotate(p, models, output);
  }
  const overlay = createOverlay(host);
  const projected = new THREE.Vector3();
  const at = (x, y) => { projected.set(x, y, 0); signalRoot.localToWorld(projected); return overlay.project(projected, camera); };
  const world = new THREE.Vector3(), screen = {};
  function walker(p, bodyOpacity, seconds) {
    overlay.clear();
    if (bodyOpacity <= .01) return;
    footfalls.forEach(mark => {
      if (mark.time > seconds) return;
      const pressed = mark.repeats.filter(time => time <= seconds).length;
      const frozen = mark.time >= motion.freeze[0] - .4 && mark.time <= motion.freeze[1] || pressed > 0;
      const recency = Math.exp(-(seconds - Math.max(mark.time, ...mark.repeats.filter(time => time <= seconds))) / 2.2);
      world.copy(mark.at);
      const point = overlay.project(world, camera);
      const w = 17 + Math.min(pressed, 6) * 2.6, h = 6 + Math.min(pressed, 6) * .7;
      overlay.bar(point.x - w / 2, point.y - h / 2, w, h, frozen ? '#a8843f' : '#27402f', bodyOpacity * Math.min(1, (.18 + .42 * recency) * (frozen ? 1.5 : 1)));
    });
    lights.concat('shoulders', 'pelvis').forEach(name => {
      world.copy(P[name]);
      const depth = world.distanceTo(camera.position);
      screen[name] = { ...overlay.project(world, camera), depth };
    });
    const height = Math.abs(screen.ankleL.y - screen.headCenter.y) || 300;
    const near = Math.min(...lights.map(name => screen[name].depth)), far = Math.max(...lights.map(name => screen[name].depth));
    const nearness = name => far - near < 1e-4 ? 1 : 1 - (screen[name].depth - near) / (far - near);
    const ink = '#1f3628', sensor = ease(.29, .37, p);
    links.forEach(([a, b]) => overlay.line([[screen[a].x, screen[a].y], [screen[b].x, screen[b].y]], ink, Math.max(1.2, height * .005), .2 * bodyOpacity));
    lights.forEach(name => {
      const isSensor = sensorJoints.includes(name), depthAlpha = .55 + .45 * nearness(name);
      const radius = Math.max(3.2, Math.min(9, height * .019)) * (.82 + .18 * nearness(name));
      if (name === 'lowerBack' && sensor <= .01) return;
      const emphasis = isSensor ? sensor : 0;
      const alpha = bodyOpacity * (name === 'lowerBack' ? sensor : depthAlpha), r = radius * (1 + emphasis * .4);
      overlay.glow(screen[name].x, screen[name].y, r, ink, alpha * (1 - emphasis), 0);
      overlay.glow(screen[name].x, screen[name].y, r, '#a8843f', alpha * emphasis, 1);
    });
    // The freeze is explained with a callout on the legs, not exaggerated motion.
    const callout = ease(.2, .25, p) * (1 - ease(.35, .39, p)) * bodyOpacity;
    if (callout > .01) {
      const knee = screen.LowerLegR, ankle = screen.ankleR;
      const target = { x: (knee.x + ankle.x) / 2, y: (knee.y + ankle.y) / 2 };
      [['UpperLegL', 'LowerLegL'], ['LowerLegL', 'ankleL'], ['UpperLegR', 'LowerLegR'], ['LowerLegR', 'ankleR']].forEach(([a, b]) =>
        overlay.line([[screen[a].x, screen[a].y], [screen[b].x, screen[b].y]], '#a8843f', Math.max(2, height * .009), .75 * callout));
      const narrow = overlay.width < 640;
      const boxW = narrow ? Math.min(140, overlay.width * .36) : 268, boxH = narrow ? 96 : 82;
      // Narrow screens: the box sits left of the figure, clear of the body.
      const boxX = narrow ? 12 : Math.min(overlay.width - boxW - 12, target.x + 90);
      const boxY = Math.max(12, target.y - boxH - (narrow ? 34 : 70));
      const anchor = narrow ? [boxX + boxW, boxY + boxH * .7] : [boxX, boxY + boxH * .62];
      overlay.line([[target.x, target.y], anchor], '#6e5527', 1.3, callout);
      overlay.glow(target.x, target.y, 4, '#a8843f', callout, 1);
      overlay.frame(boxX, boxY, boxW, boxH, { color: 'rgba(110,85,39,.45)', fill: 'rgba(255,253,247,.94)', radius: 14, alpha: callout });
      const title = narrow ? ['Freezing happens', 'in the legs'] : ['Freezing happens in the legs'];
      title.forEach((line, i) => overlay.text(line, boxX + 14, boxY + 20 + i * 17, { size: narrow ? 12.5 : 14, weight: 650, color: '#1e2d22', alpha: callout }));
      const lines = narrow ? ['The feet feel stuck', 'to the floor.'] : ['The feet feel stuck to the floor;', 'the next step does not start.'];
      const top = narrow ? boxY + 58 : boxY + 46;
      lines.forEach((line, i) => overlay.text(line, boxX + 14, top + i * (narrow ? 16 : 19), { size: narrow ? 11 : 13, color: '#4b5a45', alpha: callout }));
    }
  }
  function annotate(p, models, output) {
    const narrow = overlay.width < 640, size = narrow ? 11 : 13;
    // Two frozen models read all four sampled placements, then cross-attention fuses them.
    const lanes = ease(.66, .74, p) * (1 - ease(.82, .88, p));
    [['UniShape', .56], ['MantisV2', -.56]].forEach(([name, y]) => {
      const left = at(-2.22, y + .2);
      overlay.text(name, Math.max(12, left.x), left.y - 8, { size, weight: 600, color: '#1e2d22', alpha: lanes });
    });
    const middle = at(0, 0);
    overlay.chip('cross-attention', middle.x, middle.y, { size: narrow ? 11 : 12, color: '#6e5527', alpha: lanes });
    // Offline windows: two seconds long, one every half second; one label each.
    const show = ease(.86, .94, p);
    if (show <= .01) return;
    const duration = motion.duration, left = at(-2.35, -.67), right = at(2.35, -.67);
    const x = t => left.x + (right.x - left.x) * t / duration;
    const count = Math.floor((duration - 2) / .5) + 1, rows = 4, rowGap = narrow ? 7 : 9, top = left.y + (narrow ? 26 : 34);
    overlay.text(narrow ? '2 s windows · 0.5 s hop' : '2 s windows · 0.5 s hop · one label per window', left.x, top - 14, { size: narrow ? 10.5 : 12, color: '#5d6b57', alpha: show });
    for (let k = 0; k < count; k++) {
      const start = k * .5, end = start + 2;
      const overlap = Math.max(0, Math.min(end, motion.freeze[1]) - Math.max(start, motion.freeze[0]));
      const fog = overlap >= 1, appear = ease(.88 + k / count * .08, .9 + k / count * .08, p);
      overlay.bar(x(start), top + (k % rows) * rowGap, x(end) - x(start), narrow ? 4 : 5, fog ? '#a08042' : '#9aa893', appear * (fog ? .95 : .6));
    }
    const a = x(motion.freeze[0]), b = x(motion.freeze[0] + 2), above = at(0, .04);
    overlay.chip('FoG', (a + b) / 2, above.y, { size: narrow ? 12 : 14, color: '#6e5527', fill: 'rgba(160,128,66,.14)', stroke: 'rgba(160,128,66,.55)', alpha: show });
    overlay.text('illustrative window label', (a + b) / 2, above.y + (narrow ? 20 : 24), { size: narrow ? 10.5 : 12, color: '#5d6b57', align: 'center', alpha: show });
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    mixer.stopAllAction();
    mixer.uncacheRoot(model);
    skeletons.forEach(skeleton => skeleton.dispose());
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
    const bitmaps = new Set();
    textures.forEach(texture => {
      const data = texture.source?.data;
      if (typeof data?.close === 'function') bitmaps.add(data);
      texture.dispose();
    });
    bitmaps.forEach(bitmap => bitmap.close());
    scene.clear();
    renderer.dispose();
    renderer.domElement.remove();
    overlay.dispose();
  }
  resize();
  render(0);
  return { render, resize, dispose };
}
