import * as THREE from '../vendor/three-r180/three.module.min.js';
import { GLTFLoader } from '../vendor/three-r180/addons/loaders/GLTFLoader.js';
import { createMotionData } from './fog-motion-data.js?v=20261022k';

const clamp = n => Math.max(0, Math.min(1, n));
const mix = (a, b, t) => a + (b - a) * t;
const ease = (a, b, p) => { const t = clamp((p - a) / (b - a)); return t * t * (3 - 2 * t); };

/**
 * MakeHuman / Innerscene CC0 character; see assets/models/README.md.
 * One authored walk settles onto its own support pose. Four bone trajectories
 * sampled at 60 Hz from this exact pose and contact correction drive the curves.
 * They are illustrative kinematics, not clinical IMUs or model predictions.
 * Four placements feed both representation streams. The selected 2 s window
 * illustrates offline detection; no forecasting or real-time claim is made.
 * The caller owns frame scheduling, reduced motion and context recovery.
 */
export async function createScene(host) {
  const asset = await new GLTFLoader().loadAsync(new URL('../assets/models/fog-person.glb', import.meta.url).href);
  const model = asset.scene;
  // The source includes a phone; it is unrelated to this four-IMU illustration.
  const accessory = model.getObjectByName('Phone');
  if (accessory) accessory.visible = false;
  const walkClip = asset.animations.find(clip => clip.name === 'Walk_Relaxed');
  if (!walkClip) throw new Error('The character requires its authored walking clip.');
  const namedBones = new Map();
  model.traverse(object => {
    if (object.isBone) namedBones.set(object.name.replace(/[^a-z0-9]/gi, '').toLowerCase(), object);
  });
  const bones = ['footl', 'footr', 'spine01', 'handr'].map(name => namedBones.get(name));
  const contactBones = ['balll', 'ballr'].map(name => namedBones.get(name));
  if ([...bones, ...contactBones].some(bone => !bone)) throw new Error('The movement and contact attachments are missing.');

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
  model.traverse(object => {
    if (!object.isMesh) return;
    geometries.add(object.geometry);
    if (object.skeleton) skeletons.add(object.skeleton);
    object.frustumCulled = false;
    object.castShadow = false;
    object.receiveShadow = false;
    const surfaces = Array.isArray(object.material) ? object.material : [object.material];
    surfaces.forEach(material => {
      material.metalness = 0;
      material.transparent = true;
      material.forceSinglePass = true;
      Object.values(material).forEach(value => { if (value?.isTexture) textures.add(value); });
      materials.add(material);
      bodyMaterials.set(material, material.opacity);
    });
  });
  const mixer = new THREE.AnimationMixer(model);
  const walk = mixer.clipAction(walkClip).play();
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
  const motion = createMotionData(normalized, mixer, walk, bones, contactBones);
  const end = motion.readVector(motion.root, motion.duration, new THREE.Vector3());
  const heading = Math.hypot(end.x, end.z) > .05 ? Math.atan2(end.x, end.z) : 0;
  actor.rotation.y = Math.atan2(.80, .60) - heading;
  const direction = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), actor.rotation.y);
  const endWorld = end.clone().applyQuaternion(direction);
  const origin = new THREE.Vector3(-endWorld.x * .35, -1.53, -endWorld.z * .35);

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
  const contactHeight = motion.contactHeight;
  const sensorColors = [0x405f49, 0x6c8877, 0x9a8558, 0x637158].map(value => new THREE.Color(value));
  const markerGeometry = keepGeometry(new THREE.SphereGeometry(.043, 12, 8));
  const markers = sensorColors.map(color => {
    const material = keepMaterial(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, depthTest: false, toneMapped: false }));
    const marker = new THREE.Mesh(markerGeometry, material);
    marker.renderOrder = 4;
    scene.add(marker);
    return marker;
  });

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
  const windowStart = 3.5 / motion.duration, windowEnd = 5.5 / motion.duration;
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
      markers[index].position.copy(bonePosition);
      markers[index].material.opacity = ease(.29, .37, p) * bodyOpacity;
      if (index < 2) {
        contactBones[index].getWorldPosition(bonePosition);
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
    labelMaterial.opacity = ease(.90, 1, p);
    ribbons.forEach(ribbon => {
      const { sensor, branch, centers, positions, colors } = ribbon;
      bones[sensor].getWorldPosition(ribbon.port);
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
  }
  resize();
  render(0);
  return { render, resize, dispose };
}
