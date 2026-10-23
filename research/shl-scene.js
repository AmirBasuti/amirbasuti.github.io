import * as THREE from '../vendor/three-r180/three.module.min.js';
import { createPhone } from './phone-object.js';
import { createOverlay } from './scene-overlay.js?v=20261023a';

const clamp = n => Math.max(0, Math.min(1, n));
const ease = (a, b, p) => { const t = clamp((p - a) / (b - a)); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;

// One persistent object and nine persistent ribbons. No scene swaps or camera pans.
export function createScene(host) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setClearColor(0xf3f1eb, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, innerWidth < 700 ? 1.25 : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 40);
  camera.position.set(0, .1, 8);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x777967, 2.5));
  const key = new THREE.DirectionalLight(0xfff8e8, 4.5);
  key.position.set(-3, 5, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xc5dfd7, 3);
  rim.position.set(4, 1, -1);
  scene.add(rim);

  // A tiny original studio environment gives the metal broad, quiet reflections.
  const studio = new THREE.Scene();
  studio.background = new THREE.Color(0xaaa99c);
  const studioGeometry = new THREE.PlaneGeometry(8, 12);
  const studioMaterials = [];
  [[-5, 3, 1, 2.2], [5, 2, 0, 1.5], [0, 8, -3, 2]].forEach(([x, y, z, intensity]) => {
    const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(intensity, intensity, intensity), side: THREE.DoubleSide });
    studioMaterials.push(material);
    const panel = new THREE.Mesh(studioGeometry, material);
    panel.position.set(x, y, z);
    panel.lookAt(0, 0, 0);
    studio.add(panel);
  });
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(studio, .15, .1, 30);
  scene.environment = environment.texture;
  pmrem.dispose();
  studioGeometry.dispose();
  studioMaterials.forEach(material => material.dispose());

  const overlay = createOverlay(host);
  const projected = new THREE.Vector3();
  const phone = createPhone(THREE);
  scene.add(phone.group);
  const N = 144;
  const palette = [0x405d47, 0x53877c, 0x9f8043];
  const ribbons = Array.from({ length: 9 }, (_, channel) => {
    const positions = new Float32Array((N + 1) * 6);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    const indices = [];
    for (let i = 0; i < N; i++) { const k = i * 2; indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    geometry.setIndex(indices);
    const material = new THREE.MeshBasicMaterial({ color: palette[Math.floor(channel / 3)], transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    scene.add(mesh);
    return { positions, geometry, material, mesh, port: new THREE.Vector3() };
  });

  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 128;
  const ctx = shadowCanvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(24,39,29,.25)');
  gradient.addColorStop(.4, 'rgba(24,39,29,.10)');
  gradient.addColorStop(1, 'rgba(24,39,29,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  const shadowMaterial = new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false });
  const shadowGeometry = new THREE.PlaneGeometry(3, .55);
  const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
  shadow.position.set(0, -1.95, -.5);
  scene.add(shadow);

  let disposed = false, lastProgress = 0;
  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (width < 1 || height < 1 || disposed) return;
    renderer.setSize(width, height, false);
    overlay.resize(width, height);
    camera.aspect = width / height;
    camera.position.z = Math.max(7.6, 5.4 / camera.aspect);
    camera.updateProjectionMatrix();
  }
  function render(progress) {
    if (disposed) return;
    const p = clamp(progress);
    lastProgress = p;
    const extract = ease(.13, .43, p);
    const release = ease(.34, .53, p);
    const group = ease(.49, .77, p);
    const converge = ease(.75, 1, p);
    const bob = Math.sin(p * 25) * .08 * (1 - release);
    phone.group.position.set(mix(.1, -2.25, extract), .04 + bob, 0);
    phone.group.rotation.set(mix(.1, -.12, extract), mix(-.62, .12, extract), mix(-.18, .04, extract) + Math.sin(p * 20) * .025 * (1 - release));
    phone.group.scale.setScalar(mix(1.04, .7, extract));
    phone.setOpacity(1 - ease(.40, .48, p));
    phone.group.updateMatrixWorld(true);
    shadow.position.x = phone.group.position.x;
    shadow.scale.setScalar(mix(1, .65, extract));
    shadowMaterial.opacity = 1 - ease(.36, .56, p);

    ribbons.forEach((ribbon, channel) => {
      ribbon.port.copy(phone.screenPorts[channel]);
      phone.group.localToWorld(ribbon.port);
      // Each model stream carries one channel from every sensor: all three
      // models see the full input, so no stream stands for a single sensor.
      const stream = channel % 3, sub = Math.floor(channel / 3);
      const alpha = ease(.13, .26, p) * (1 - ease(.94, 1, p) * .40);
      ribbon.material.opacity = alpha * (sub === 1 ? .95 : .64);
      ribbon.mesh.visible = alpha > .001;
      const growth = ease(.13, .40, p);
      for (let i = 0; i <= N; i++) {
        const u = i / N;
        // The waveform is explanatory, not a signal or prediction from the study.
        const wave = Math.sin(u * (30 + channel * 1.7) + channel * .9) * (.045 + .11 * Math.exp(-Math.pow((u - .62) / .19, 2)))
          + Math.sin(u * 70 + channel * .7) * .025;
        const envelope = Math.sin(Math.PI * u);
        const xWave = -2.45 + 4.9 * u;
        const yWave = (4 - channel) * .29 + wave * envelope;
        const anchorMix = ease(0, .30, u) * growth;
        const emergedX = mix(ribbon.port.x, -.95 + u * 3.4, u * growth);
        const emergedY = mix(ribbon.port.y, yWave, anchorMix);
        const emergedZ = mix(ribbon.port.z, .12 * Math.sin(u * Math.PI), u * growth);
        let x = mix(emergedX, xWave, release);
        let y = mix(emergedY, yWave, release);
        let z = mix(emergedZ, 0, release);
        // Keep the same vertices as channels gather into three flowing streams.
        const turn = u * Math.PI * 2 + stream * .28 + p * 2;
        const bundleX = -2.2 + 4.4 * u;
        const bundleY = (1 - stream) * .85 + Math.sin(turn) * .27 * Math.sin(Math.PI * u) + (sub - 1) * .065;
        const bundleZ = Math.cos(turn) * .35 * Math.sin(Math.PI * u) + (sub - 1) * .04;
        x = mix(x, bundleX, group);
        y = mix(y, bundleY, group);
        z = mix(z, bundleZ, group);
        // The three streams fold into a single orbit around the example output.
        const angle = u * Math.PI * 2 + channel * .035;
        const radius = 1.22 + (channel - 4) * .018;
        x = mix(x, Math.cos(angle) * radius, converge);
        y = mix(y, Math.sin(angle) * radius, converge);
        z = mix(z, Math.sin(angle * 2) * .04, converge);
        const thickness = mix(.009, .013, group) * Math.sin(Math.PI * Math.max(.012, Math.min(.988, u)));
        const at = i * 6;
        ribbon.positions[at] = x;
        ribbon.positions[at + 1] = y - thickness;
        ribbon.positions[at + 2] = z;
        ribbon.positions[at + 3] = x;
        ribbon.positions[at + 4] = y + thickness;
        ribbon.positions[at + 5] = z;
      }
      ribbon.geometry.attributes.position.needsUpdate = true;
    });
    renderer.render(scene, camera);
    annotate(p, release, group, converge);
  }
  const at = (x, y) => overlay.project(projected.set(x, y, 0), camera);
  function annotate(p, release, group, converge) {
    overlay.clear();
    const narrow = overlay.width < 640, size = narrow ? 11 : 13;
    // Five-second window: the flattened ribbons are one window of nine channels.
    const sensors = ease(.46, .52, p) * (1 - ease(.56, .62, p));
    const a = at(-2.55, 1.42), b = at(2.55, -1.42);
    ['Accelerometer', 'Gyroscope', 'Magnetometer'].forEach((name, g) => {
      const left = at(-2.45, (4 - (g * 3 + 1)) * .29);
      if (narrow || a.x < 140) overlay.text(name, Math.max(12, a.x + 10), left.y - 24, { size, color: '#3d4f40', alpha: sensors });
      else overlay.text(name, a.x - 14, left.y, { size, color: '#3d4f40', align: 'right', alpha: sensors });
    });
    overlay.frame(a.x, a.y, b.x - a.x, b.y - a.y, { color: '#a08042', alpha: sensors * .9, radius: 16, fill: 'rgba(160,128,66,.04)' });
    overlay.chip(narrow ? '5 s · 500 samples' : '5 s window · 500 samples per channel', (a.x + b.x) / 2, a.y, { size: narrow ? 11 : 12, color: '#6e5527', alpha: sensors });
    // Three frozen-model classifiers; their probabilities are weighted and summed.
    const models = ease(.62, .7, p) * (1 - ease(.78, .84, p));
    [['NuTime', '0.54'], ['MantisV2', '0.29'], ['TiRex', '0.17']].forEach(([name, weight], stream) => {
      const y = (1 - stream) * .85, left = at(-2.2, y), right = at(2.2, y);
      if (narrow || left.x < 110) overlay.text(name, Math.max(12, left.x), left.y - 22, { size, weight: 600, color: '#1e2d22', alpha: models });
      else overlay.text(name, left.x - 14, left.y, { size, weight: 600, color: '#1e2d22', align: 'right', alpha: models });
      overlay.chip(`× ${weight}`, narrow ? Math.min(overlay.width - 34, right.x) : right.x + 34, right.y, { size: narrow ? 10.5 : 12, color: '#6e5527', alpha: models });
    });
    const top = at(2.2, 1.35);
    if (!narrow) overlay.text('weighted probabilities', top.x + 34, top.y - 6, { size: 12, color: '#5d6b57', align: 'center', alpha: models });
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    phone.dispose();
    ribbons.forEach(({ geometry, material }) => { geometry.dispose(); material.dispose(); });
    shadowGeometry.dispose(); shadowMaterial.dispose(); shadowTexture.dispose();
    environment.dispose(); renderer.dispose(); renderer.domElement.remove(); overlay.dispose();
  }
  resize();
  render(lastProgress);
  return { render, resize, dispose };
}
