import * as THREE from '../vendor/three-r180/three.module.min.js';

const clamp = n => Math.max(0, Math.min(1, n));
const mix = (a, b, t) => a + (b - a) * t;
const ease = (a, b, p) => {
  const t = clamp((p - a) / (b - a));
  return t * t * (3 - 2 * t);
};
// Integral of smoothstep: slowing the gait never reverses its phase.
const easedTime = (a, b, p) => {
  const t = clamp((p - a) / (b - a));
  return (b - a) * (t * t * t - .5 * t * t * t * t) + Math.max(0, p - b);
};

/**
 * Original explanatory FoG scene, not a recording or a model prediction.
 * FoG-STAR: four IMUs (both ankles, lower back, affected-side wrist), 24
 * channels at 60 Hz. The study uses 2 s windows / 0.5 s hop and frozen
 * UniShape + MantisV2 with cross-attention and offline zero-phase processing.
 * The footwear illustrates gait only; the four ribbons represent all four
 * placements. Each model stream receives all four colors, not a sensor subset.
 * The highlighted interval illustrates detection, never future warning.
 * The caller owns scheduling, reduced motion, context recovery and HTML copy.
 */
export function createScene(host) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setClearColor(0xf3f1eb, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.append(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 50);
  const viewingDirection = new THREE.Vector3(0, 3.7, 8).normalize();
  camera.position.copy(viewingDirection).multiplyScalar(8.2);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x89917a, 2.4));
  const key = new THREE.DirectionalLight(0xfff6e5, 3.8);
  key.position.set(-3, 6, 5);
  scene.add(key);
  const edgeLight = new THREE.DirectionalLight(0xd5e0d1, 2.0);
  edgeLight.position.set(4, 2, -3);
  scene.add(edgeLight);

  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  const footwearMaterials = new Map();
  const keepGeometry = geometry => { geometries.add(geometry); return geometry; };
  function shoeMaterial(parameters) {
    const material = new THREE.MeshStandardMaterial({ roughness: .68, transparent: true, ...parameters });
    materials.add(material);
    footwearMaterials.set(material, material.opacity);
    return material;
  }
  const upperMaterial = shoeMaterial({ color: 0x70816c, roughness: .82 });
  const panelMaterial = shoeMaterial({ color: 0x4c6555, roughness: .76 });
  const soleMaterial = shoeMaterial({ color: 0xd9dbc7, roughness: .72 });
  const outsoleMaterial = shoeMaterial({ color: 0x58614e, roughness: .9 });
  const laceMaterial = shoeMaterial({ color: 0xc6cdb5, roughness: .92 });
  const insideMaterial = shoeMaterial({ color: 0x263c30, roughness: 1, side: THREE.DoubleSide });
  const stitchMaterial = shoeMaterial({ color: 0xa2ad8f, roughness: .9 });

  const shoeRoot = new THREE.Group();
  shoeRoot.rotation.y = -.28;
  shoeRoot.position.set(0, -.72, -.72);
  scene.add(shoeRoot);

  // A continuous loft gives the upper a rounded toe, fitted waist and heel.
  // The geometry is authored here; no third-party shoe or human assets.
  const profile = [
    [0, .008, .19], [.06, .24, .43], [.19, .29, .57],
    [.36, .31, .56], [.53, .37, .44], [.70, .40, .32],
    [.84, .35, .24], [.95, .20, .15], [1, .008, .08]
  ];
  function sectionAt(t) {
    let index = 1;
    while (index < profile.length - 1 && t > profile[index][0]) index++;
    const a = profile[index - 1], b = profile[index];
    const f = ease(a[0], b[0], t);
    // An elliptical cap has a blunt, rounded front rather than a pointed taper.
    const cap = clamp((t - .74) / .26);
    const width = t > .74 ? Math.max(.003, .39 * Math.sqrt(1 - cap * cap)) : mix(a[1], b[1], f);
    return { width, height: mix(a[2], b[2], f) };
  }
  const openingX = .17, openingZ = .24, openingCenter = -.61;
  function upperHeight(x, z) {
    const t = clamp((z + 1.08) / 2.2), section = sectionAt(t);
    const asymmetry = .045 * Math.sin(Math.PI * t) * Math.sin(Math.PI * (t - .2));
    const cosine = clamp(Math.abs(x - asymmetry) / section.width);
    const sine = Math.sqrt(1 - cosine * cosine);
    return .16 + Math.pow(sine, mix(.30, .72, ease(.35, .75, t))) * section.height;
  }
  function loft(kind) {
    const rows = 48, sides = 32;
    const positions = [], indices = [];
    for (let row = 0; row <= rows; row++) {
      const t = row / rows, section = sectionAt(t);
      const asymmetry = .045 * Math.sin(Math.PI * t) * Math.sin(Math.PI * (t - .2));
      for (let side = 0; side <= sides; side++) {
        const angle = side / sides * Math.PI * 2;
        const sine = Math.sin(angle);
        const width = section.width + (kind === 'upper' ? 0 : .025 * Math.sin(Math.PI * t));
        const x = Math.cos(angle) * width + asymmetry;
        const upperRoundness = mix(.30, .72, ease(.35, .75, t));
        const y = kind === 'upper'
          ? .16 + (sine > 0 ? Math.pow(sine, upperRoundness) * section.height : sine * .025)
          : (kind === 'sole' ? .115 : .047) + sine * (kind === 'sole' ? .067 : .028);
        positions.push(x, y, -1.08 + t * 2.2);
      }
    }
    function triangle(a, b, c) {
      if (kind === 'upper') {
        const x = (positions[a * 3] + positions[b * 3] + positions[c * 3]) / 3;
        const y = (positions[a * 3 + 1] + positions[b * 3 + 1] + positions[c * 3 + 1]) / 3;
        const z = (positions[a * 3 + 2] + positions[b * 3 + 2] + positions[c * 3 + 2]) / 3;
        if (y > .4 && x * x / (openingX * openingX) + (z - openingCenter) * (z - openingCenter) / (openingZ * openingZ) < 1) return;
      }
      indices.push(a, b, c);
    }
    for (let row = 0; row < rows; row++) {
      for (let side = 0; side < sides; side++) {
        const a = row * (sides + 1) + side, b = a + sides + 1;
        triangle(a, a + 1, b);
        triangle(b, a + 1, b + 1);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return keepGeometry(geometry);
  }
  const upperGeometry = loft('upper');
  const soleGeometry = loft('sole');
  const outsoleGeometry = loft('outsole');
  const openingPoints = Array.from({ length: 64 }, (_, index) => {
    const angle = index / 64 * Math.PI * 2;
    const x = openingX * Math.cos(angle), z = openingCenter + openingZ * Math.sin(angle);
    return new THREE.Vector3(x, upperHeight(x, z) + .008, z);
  });
  const collarCurve = new THREE.CatmullRomCurve3(openingPoints, true);
  const collarGeometry = keepGeometry(new THREE.TubeGeometry(collarCurve, 64, .018, 8, true));
  const linerPositions = [], linerIndices = [];
  openingPoints.forEach(point => linerPositions.push(point.x, point.y - .005, point.z, point.x * .94, .51, openingCenter + (point.z - openingCenter) * .94));
  for (let index = 0; index < openingPoints.length; index++) {
    const a = index * 2, b = ((index + 1) % openingPoints.length) * 2;
    linerIndices.push(a, a + 1, b, a + 1, b + 1, b);
  }
  const linerGeometry = keepGeometry(new THREE.BufferGeometry());
  linerGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linerPositions, 3));
  linerGeometry.setIndex(linerIndices);
  linerGeometry.computeVertexNormals();
  const insideGeometry = keepGeometry(new THREE.CircleGeometry(1, 40));

  const details = [];
  function detail(points, radius, material) {
    const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
    details.push({ geometry: keepGeometry(new THREE.TubeGeometry(curve, 22, radius, 6, false)), material });
  }
  // Small seams and laces provide scale without a logo or decorative dashboard.
  [-1, 1].forEach(side => {
    detail([[side * .27, .24, -.78], [side * .305, .28, -.35], [side * .37, .26, .28], [side * .31, .21, .75]], .008, stitchMaterial);
    detail([[side * .22, .49, -.54], [side * .22, .52, -.22], [side * .25, .39, .16]], .021, panelMaterial);
  });
  for (let i = 0; i < 5; i++) {
    const z = -.28 + i * .105;
    const y = .16 + sectionAt((z + 1.08) / 2.2).height + .012;
    detail([[-.17, y - .045, z], [0, y + .012, z + .025], [.17, y - .045, z + .047]], .012, laceMaterial);
  }
  const shoes = [-1, 1].map(side => {
    const pose = new THREE.Group();
    const shape = new THREE.Group();
    shape.scale.x = side;
    pose.add(shape);
    shoeRoot.add(pose);
    [[upperGeometry, upperMaterial], [soleGeometry, soleMaterial], [outsoleGeometry, outsoleMaterial]].forEach(([geometry, material]) => {
      shape.add(new THREE.Mesh(geometry, material));
    });
    const collar = new THREE.Mesh(collarGeometry, panelMaterial);
    shape.add(collar);
    shape.add(new THREE.Mesh(linerGeometry, insideMaterial));
    const inside = new THREE.Mesh(insideGeometry, insideMaterial);
    inside.rotation.x = -Math.PI / 2;
    inside.scale.set(openingX * .94, openingZ * .94, 1);
    inside.position.set(0, .512, openingCenter);
    shape.add(inside);
    details.forEach(({ geometry, material }) => shape.add(new THREE.Mesh(geometry, material)));
    return pose;
  });

  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 128;
  const context = shadowCanvas.getContext('2d');
  if (!context) throw new Error('A 2D canvas is required for the footwear shadow.');
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(34,48,31,.26)');
  gradient.addColorStop(.42, 'rgba(34,48,31,.12)');
  gradient.addColorStop(1, 'rgba(34,48,31,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  textures.add(shadowTexture);
  const shadowGeometry = keepGeometry(new THREE.PlaneGeometry(1.6, 3.1));
  const shadows = shoes.map(() => {
    const material = new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, toneMapped: false });
    materials.add(material);
    const mesh = new THREE.Mesh(shadowGeometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = .005;
    shoeRoot.add(mesh);
    return mesh;
  });

  // The signal plane faces the fixed viewing direction throughout the dolly.
  const signalRoot = new THREE.Group();
  signalRoot.quaternion.copy(camera.quaternion);
  scene.add(signalRoot);
  const count = 160;
  const sensorColors = [0x405f49, 0x6c8877, 0x9a8558, 0x637158].map(value => new THREE.Color(value));
  const brass = new THREE.Color(0xa08042);
  const quiet = new THREE.Color(0x8a9b83);
  const ribbonIndices = [];
  for (let i = 0; i < count; i++) {
    const n = i * 2;
    ribbonIndices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
  }
  // Branch 1 initially overlaps invisibly. Both model streams later contain
  // every sensor, keeping the illustration faithful to a shared input window.
  const ribbons = Array.from({ length: 8 }, (_, index) => {
    const sensor = index % 4, branch = Math.floor(index / 4);
    const positions = new Float32Array((count + 1) * 6);
    const colors = new Float32Array((count + 1) * 6);
    const centers = new Float32Array((count + 1) * 3);
    const geometry = keepGeometry(new THREE.BufferGeometry());
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setIndex(ribbonIndices);
    const material = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
    materials.add(material);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    signalRoot.add(mesh);
    return { sensor, branch, positions, colors, centers, geometry, material, mesh };
  });

  const boundsGeometry = keepGeometry(new THREE.BufferGeometry());
  const leftBound = -2.35 + 4.7 * .43, rightBound = -2.35 + 4.7 * .69;
  boundsGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
    leftBound, -.92, .06, leftBound, -.48, .06,
    rightBound, -.92, .06, rightBound, -.48, .06
  ], 3));
  const boundsMaterial = new THREE.LineBasicMaterial({ color: brass, transparent: true, opacity: 0, toneMapped: false });
  materials.add(boundsMaterial);
  signalRoot.add(new THREE.LineSegments(boundsGeometry, boundsMaterial));

  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 512;
  labelCanvas.height = 192;
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
  const labelMaterial = new THREE.MeshBasicMaterial({ map: labelTexture, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  materials.add(labelMaterial);
  const label = new THREE.Mesh(keepGeometry(new THREE.PlaneGeometry(2.8, 1.05)), labelMaterial);
  label.position.set((leftBound + rightBound) / 2, .03, .08);
  signalRoot.add(label);

  let disposed = false, lastProgress = 0;
  function frameScene(p) {
    // Give the footwear a close product view. Retreat continuously as the
    // recordings spread, retaining the full portrait framing for the output.
    const close = Math.max(6.8, 4.6 / camera.aspect);
    const wide = Math.max(8.1, 8.2 / camera.aspect);
    const distance = mix(close, wide, ease(.25, .51, p));
    camera.position.copy(viewingDirection).multiplyScalar(distance);
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
    frameScene(p);
    const hesitation = ease(.16, .22, p) * (1 - ease(.30, .37, p));
    const clock = p - (easedTime(.16, .22, p) - easedTime(.30, .37, p));
    const footwearOpacity = 1 - ease(.29, .48, p);
    shoeRoot.visible = footwearOpacity > .001;
    footwearMaterials.forEach((opacity, material) => {
      material.opacity = opacity * footwearOpacity;
      material.depthWrite = footwearOpacity > .999;
    });
    shoes.forEach((shoe, index) => {
      const cycle = clock * 6.5 + index * .5 + .12;
      const step = Math.floor(cycle);
      const phase = cycle - step;
      const stance = phase < .62;
      const swing = clamp((phase - .62) / .38);
      const stanceTime = clamp(phase / .62);
      let roll = stance
        ? -.15 * (1 - ease(0, .23, stanceTime)) + .32 * ease(.64, 1, stanceTime)
        : mix(.32, -.15, ease(0, 1, swing));
      const lift = stance ? 0 : Math.pow(Math.sin(Math.PI * swing), 2) * .32 * (1 - hesitation * .9);
      // Small residual movement during the illustrative hesitation: FoG is not
      // represented as universal total immobility or as a measured gait trace.
      roll *= 1 - hesitation * .75;
      roll += Math.sin(p * 290 + index * 1.8) * .016 * hesitation;
      // A planted contact does not slide backwards. Only swing advances the
      // next contact; toe/heel compensation keeps the active pivot stationary.
      const contact = step * 1.1 - index * .55 + (stance ? 0 : 1.1 * ease(0, 1, swing));
      const pivot = roll >= 0 ? 1.08 : -1.08;
      shoe.position.set(index ? .58 : -.58, lift + Math.abs(Math.sin(roll)) * 1.08,
        contact + pivot * (1 - Math.cos(roll)));
      shoe.rotation.set(roll, (index ? -.045 : .045) + Math.sin(phase * Math.PI * 2) * .025, 0);
      const shadow = shadows[index];
      shadow.position.x = shoe.position.x;
      shadow.position.z = shoe.position.z;
      shadow.scale.setScalar(1 + lift * .3);
      shadow.material.opacity = footwearOpacity * (1 - lift * 1.3);
    });

    const emergence = ease(.24, .45, p);
    const models = ease(.50, .75, p);
    const output = ease(.76, .97, p);
    boundsMaterial.opacity = ease(.86, .98, p) * .55;
    labelMaterial.opacity = ease(.86, .97, p);
    ribbons.forEach(ribbon => {
      const { sensor, branch, centers, positions, colors } = ribbon;
      ribbon.material.opacity = emergence * (branch ? models : 1) * mix(.88, .56, output);
      ribbon.mesh.visible = ribbon.material.opacity > .001;
      const sensorColor = sensorColors[sensor];
      for (let i = 0; i <= count; i++) {
        const u = i / count;
        const envelope = Math.sin(Math.PI * u);
        // Explanatory oscillation only: no participant data or model logits.
        const wave = Math.sin(u * 35 + sensor * 1.4) * .085 + Math.sin(u * 71 + sensor) * .023;
        const spread = ease(.25, .48, p);
        let x = mix((sensor - 1.5) * .38 + (u - .5) * .55, -2.35 + 4.7 * u, spread);
        let y = mix(-.45 + envelope * .5, (1.5 - sensor) * .46 + wave * envelope, spread);
        let z = .12 * Math.sin(u * Math.PI + sensor * .3) * (1 - spread);
        const angle = u * Math.PI * 3 + sensor * .35;
        const modelY = (branch ? -.57 : .57) + Math.sin(angle) * .15 * envelope + (sensor - 1.5) * .045;
        const modelZ = Math.cos(angle) * .20 * envelope;
        x = mix(x, -2.22 + 4.44 * u, models);
        y = mix(y, modelY, models);
        z = mix(z, modelZ, models);
        const interval = ease(.425, .445, u) * (1 - ease(.675, .695, u));
        x = mix(x, -2.35 + 4.7 * u, output);
        y = mix(y, -.70 + (sensor - 1.5) * .025 + (branch ? .009 : -.009), output);
        z = mix(z, .02, output);
        const at = i * 3;
        centers[at] = x; centers[at + 1] = y; centers[at + 2] = z;
        const finalColor = interval > .5 ? brass : quiet;
        const colorMix = output * (interval > .5 ? 1 : .75);
        const r = mix(sensorColor.r, finalColor.r, colorMix);
        const g = mix(sensorColor.g, finalColor.g, colorMix);
        const b = mix(sensorColor.b, finalColor.b, colorMix);
        const colorAt = i * 6;
        colors[colorAt] = colors[colorAt + 3] = r;
        colors[colorAt + 1] = colors[colorAt + 4] = g;
        colors[colorAt + 2] = colors[colorAt + 5] = b;
      }
      // Orient width across the path, avoiding disappearing vertical segments.
      for (let i = 0; i <= count; i++) {
        const before = Math.max(0, i - 1) * 3, after = Math.min(count, i + 1) * 3;
        const dx = centers[after] - centers[before], dy = centers[after + 1] - centers[before + 1];
        const length = Math.hypot(dx, dy) || 1;
        const u = i / count;
        const taper = .35 + .65 * Math.sin(Math.PI * u);
        const thickness = mix(.014, .020, output) * taper;
        const nx = -dy / length * thickness, ny = dx / length * thickness;
        const from = i * 3, to = i * 6;
        positions[to] = centers[from] + nx;
        positions[to + 1] = centers[from + 1] + ny;
        positions[to + 2] = centers[from + 2];
        positions[to + 3] = centers[from] - nx;
        positions[to + 4] = centers[from + 1] - ny;
        positions[to + 5] = centers[from + 2];
      }
      ribbon.geometry.attributes.position.needsUpdate = true;
      ribbon.geometry.attributes.color.needsUpdate = true;
    });
    renderer.render(scene, camera);
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
    textures.forEach(texture => texture.dispose());
    scene.clear();
    renderer.dispose();
    renderer.domElement.remove();
  }
  resize();
  render(0);
  return { render, resize, dispose };
}
