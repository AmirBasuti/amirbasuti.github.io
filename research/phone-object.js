/**
 * Original generic handset. All dimensions and ports are in local coordinates.
 * Front: +Z. Body: approximately 1.62 × 3.30 × 0.16; camera hardware adds depth.
 * The screen is an illustrative sensing surface, not a measured SHL chart.
 * Lighting, transforms, rendering and animation belong to the caller.
 */
export function createPhone(THREE) {
  const group = new THREE.Group();
  group.name = 'Sensing handset';
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  const originalMaterials = new Map();
  let disposed = false;
  let previousOpacity = 1;

  function roundedRect(width, height, radius) {
    const x = -width / 2, y = -height / 2;
    const r = Math.min(radius, width / 2, height / 2);
    const shape = new THREE.Shape();
    shape.moveTo(x + r, y);
    shape.lineTo(x + width - r, y);
    shape.quadraticCurveTo(x + width, y, x + width, y + r);
    shape.lineTo(x + width, y + height - r);
    shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    shape.lineTo(x + r, y + height);
    shape.quadraticCurveTo(x, y + height, x, y + height - r);
    shape.lineTo(x, y + r);
    shape.quadraticCurveTo(x, y, x + r, y);
    shape.closePath();
    return shape;
  }
  function material(parameters, physical = false) {
    const Constructor = physical ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
    const result = new Constructor({ transparent: true, ...parameters });
    materials.add(result);
    originalMaterials.set(result, { opacity: result.opacity, depthWrite: result.depthWrite });
    return result;
  }
  function add(name, geometry, surface, x = 0, y = 0, z = 0) {
    geometries.add(geometry);
    const mesh = new THREE.Mesh(geometry, surface);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.castShadow = surface.opacity > .9;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }
  function slab(name, width, height, radius, depth, bevel, surface, x = 0, y = 0, z = 0) {
    const geometry = new THREE.ExtrudeGeometry(roundedRect(width, height, radius), {
      depth, steps: 1, curveSegments: 12,
      bevelEnabled: bevel > 0, bevelSegments: 4,
      bevelSize: bevel, bevelThickness: bevel
    });
    geometry.translate(0, 0, -depth / 2);
    return add(name, geometry, surface, x, y, z);
  }
  function disc(name, radius, surface, x, y, z, back = false) {
    const mesh = add(name, new THREE.CircleGeometry(radius, 40), surface, x, y, z);
    if (back) mesh.rotation.y = Math.PI;
    return mesh;
  }

  const graphite = material({ color: 0x485049, metalness: .91, roughness: .25 }, true);
  const edge = material({ color: 0xa6ad98, metalness: .95, roughness: .22 });
  const back = material({ color: 0x34483b, metalness: .35, roughness: .38, clearcoat: .7, clearcoatRoughness: .28 }, true);
  const black = material({ color: 0x070b09, metalness: .3, roughness: .24 });
  const buttonMetal = material({ color: 0x6f7864, metalness: .9, roughness: .25 });
  const cameraMetal = material({ color: 0x69745b, metalness: .92, roughness: .21 }, true);
  const brass = material({ color: 0x9d9170, metalness: .91, roughness: .25 });
  const lens = material({ color: 0x0b1716, metalness: .35, roughness: .09, clearcoat: 1, clearcoatRoughness: .05 }, true);
  const lensCenter = material({ color: 0x132522, metalness: .35, roughness: .12, clearcoat: 1, clearcoatRoughness: .05 }, true);
  const lensReflection = material({ color: 0xa7c8ba, emissive: 0x294c44, emissiveIntensity: .24, opacity: .35, roughness: .16, depthWrite: false });
  const flashMaterial = material({ color: 0xcfc4a4, roughness: .38, metalness: .12 });

  slab('Beveled titanium-tone frame', 1.588, 3.268, .226, .13, .016, graphite);
  slab('Satin green back', 1.54, 3.22, .208, .009, .009, back, 0, 0, -.073);
  slab('Front glass edge', 1.538, 3.218, .210, .008, .007, black, 0, 0, .080);

  const lipShape = roundedRect(1.585, 3.265, .223);
  lipShape.holes.push(roundedRect(1.568, 3.248, .215));
  add('Fine polished front rim', new THREE.ShapeGeometry(lipShape, 12), edge, 0, 0, .081);

  const screenWidth = 1.447, screenHeight = 3.086;
  const traceRows = Array.from({ length: 9 }, (_, index) => 360 + index * 53);
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('A 2D canvas is required to draw the handset screen.');

  const backdrop = ctx.createLinearGradient(0, 0, 512, 1024);
  backdrop.addColorStop(0, '#26382c');
  backdrop.addColorStop(.48, '#15261e');
  backdrop.addColorStop(1, '#101b17');
  ctx.fillStyle = backdrop;
  ctx.fillRect(0, 0, 512, 1024);
  const glow = ctx.createRadialGradient(122, 180, 10, 170, 200, 400);
  glow.addColorStop(0, 'rgba(188,201,149,.11)');
  glow.addColorStop(1, 'rgba(188,201,149,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 512, 1024);

  // Quiet status marks and an original trajectory motif; no dashboard labels.
  ctx.fillStyle = '#cbd4bd';
  for (let i = 0; i < 4; i++) ctx.fillRect(398 + i * 7, 58 - i * 3, 4, 6 + i * 3);
  ctx.strokeStyle = 'rgba(205,216,187,.6)';
  ctx.lineWidth = 2;
  ctx.strokeRect(447, 45, 26, 14);
  ctx.fillRect(450, 48, 19, 8);
  ctx.fillRect(474, 49, 2, 6);
  ctx.fillStyle = 'rgba(210,220,196,.7)';
  ctx.fillRect(48, 49, 31, 4);
  ctx.fillRect(48, 56, 19, 3);

  ctx.strokeStyle = 'rgba(190,206,163,.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(256, 204, 99, 70, -.25, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(205,215,180,.66)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(163, 220);
  ctx.bezierCurveTo(191, 142, 243, 248, 271, 181);
  ctx.bezierCurveTo(292, 133, 311, 193, 348, 169);
  ctx.stroke();
  ctx.fillStyle = '#d4c69f';
  ctx.beginPath();
  ctx.arc(348, 169, 4, 0, Math.PI * 2);
  ctx.fill();

  const colors = ['#d6dfc7', '#bdcbb0', '#a3b997', '#d7c79e', '#c4b68e', '#afa886', '#a8c3ad', '#98b99f', '#8cae91'];
  traceRows.forEach((row, channel) => {
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(172,191,151,.08)';
    ctx.beginPath();
    ctx.moveTo(48, row);
    ctx.lineTo(464, row);
    ctx.stroke();
    ctx.strokeStyle = colors[channel];
    ctx.lineWidth = channel % 3 === 0 ? 2 : 1.5;
    ctx.shadowColor = colors[channel];
    ctx.shadowBlur = 3;
    ctx.beginPath();
    for (let step = 0; step <= 208; step++) {
      const t = step / 208;
      const envelope = Math.sin(Math.PI * t);
      const pulse = Math.exp(-Math.pow((t - .62) / .19, 2));
      const wave = Math.sin(t * (26 + channel * 1.7) + channel * .9) * (4 + pulse * 8)
        + Math.sin(t * 70 + channel * .7) * pulse * 4;
      const x = 48 + t * 416;
      const y = row - wave * envelope;
      if (!step) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = colors[channel];
    ctx.beginPath();
    ctx.arc(464, row, 2.5, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = 'rgba(204,216,188,.17)';
  ctx.fillRect(48, 876, 416, 1);
  ctx.fillStyle = 'rgba(204,216,188,.34)';
  ctx.fillRect(48, 902, 65, 3);
  ctx.fillStyle = 'rgba(204,216,188,.12)';
  ctx.fillRect(48, 914, 102, 3);
  ctx.fillStyle = 'rgba(227,233,216,.65)';
  ctx.beginPath();
  ctx.roundRect(202, 976, 108, 5, 2.5);
  ctx.fill();

  const screenTexture = new THREE.CanvasTexture(canvas);
  screenTexture.colorSpace = THREE.SRGBColorSpace;
  screenTexture.anisotropy = 4;
  textures.add(screenTexture);
  // The display emits its own image; studio illumination belongs to the cover glass.
  const screenMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff, map: screenTexture, transparent: true, toneMapped: false
  });
  materials.add(screenMaterial);
  originalMaterials.set(screenMaterial, { opacity: screenMaterial.opacity, depthWrite: screenMaterial.depthWrite });
  const screenGeometry = new THREE.ShapeGeometry(roundedRect(screenWidth, screenHeight, .168), 18);
  const positions = screenGeometry.getAttribute('position');
  const uv = screenGeometry.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, positions.getX(i) / screenWidth + .5, positions.getY(i) / screenHeight + .5);
  }
  uv.needsUpdate = true;
  add('Nine-channel sensing display', screenGeometry, screenMaterial, 0, 0, .094);
  const glassMaterial = material({
    color: 0xcbd8cd, roughness: .08, metalness: .04,
    opacity: .075, depthWrite: false, clearcoat: 1, clearcoatRoughness: .05
  }, true);
  const cover = add('Optical cover glass', screenGeometry, glassMaterial, 0, 0, .098);
  cover.castShadow = false;
  cover.renderOrder = 3;
  disc('Front camera aperture', .028, black, 0, 1.421, .101);
  slab('Earpiece inset', .20, .012, .006, .002, .001, black, 0, 1.573, .092);

  slab('Rear camera platform', .61, .90, .153, .032, .014, back, -.431, 1.096, -.108);
  [1.29, .91].forEach((y, index) => {
    const x = -.448;
    const barrel = add(`Rear camera ${index + 1} machined bezel`, new THREE.CylinderGeometry(.151, .153, .034, 48), cameraMetal, x, y, -.150);
    barrel.rotation.x = Math.PI / 2;
    const rim = add(`Rear camera ${index + 1} fine rim`, new THREE.TorusGeometry(.124, .008, 8, 48), index ? brass : edge, x, y, -.170);
    rim.rotation.y = Math.PI;
    disc(`Rear camera ${index + 1} glass`, .116, lens, x, y, -.171, true);
    disc(`Rear camera ${index + 1} optical core`, .063, lensCenter, x, y, -.173, true);
    const reflection = disc(`Rear camera ${index + 1} reflection`, .028, lensReflection, x - .033, y + .035, -.175, true);
    reflection.scale.set(.5, 1, 1);
    reflection.castShadow = false;
  });
  disc('Rear diffuse flash', .038, flashMaterial, -.236, 1.287, -.141, true);
  disc('Rear microphone', .013, black, -.236, 1.14, -.141, true);

  const rightButton = slab('Side power key', .038, .31, .017, .055, .005, buttonMetal, .808, .585, -.002);
  rightButton.rotation.y = Math.PI / 2;
  const volumeUp = slab('Volume up key', .032, .21, .014, .05, .004, buttonMetal, -.807, .67, -.002);
  volumeUp.rotation.y = Math.PI / 2;
  const volumeDown = slab('Volume down key', .032, .21, .014, .05, .004, buttonMetal, -.807, .36, -.002);
  volumeDown.rotation.y = Math.PI / 2;
  const port = slab('Bottom connector recess', .18, .038, .017, .003, .001, black, 0, -1.65, 0);
  port.rotation.x = Math.PI / 2;
  const antenna = material({ color: 0x9da18f, metalness: .15, roughness: .55 });
  [-1, 1].forEach(side => {
    [-1.08, 1.08].forEach(y => {
      const line = add('Antenna seam', new THREE.BoxGeometry(.004, .017, .108), antenna, side * .807, y, 0);
      line.castShadow = false;
    });
  });

  const screenPorts = traceRows.map(row => new THREE.Vector3(
    (464 / 512 - .5) * screenWidth,
    (.5 - row / 1024) * screenHeight,
    .103
  ));

  function setOpacity(value) {
    if (disposed) return;
    const opacity = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
    if (opacity === previousOpacity) return;
    previousOpacity = opacity;
    group.visible = opacity > .001;
    originalMaterials.forEach((original, surface) => {
      surface.opacity = original.opacity * opacity;
      surface.depthWrite = opacity > .999 ? original.depthWrite : false;
    });
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    group.removeFromParent();
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(surface => surface.dispose());
    textures.forEach(texture => texture.dispose());
    group.clear();
    geometries.clear();
    materials.clear();
    textures.clear();
    originalMaterials.clear();
  }
  return { group, screenPorts, setOpacity, dispose };
}
