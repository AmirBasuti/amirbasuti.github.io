// A crisp 2D annotation layer over a WebGL scene. Labels follow projected
// scene positions, so names and windows stay attached to the moving geometry.
export function createOverlay(host) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
  host.append(canvas);
  const c = canvas.getContext('2d');
  const sans = getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif';
  let width = 1, height = 1;
  const point = { x: 0, y: 0 };
  return {
    get width() { return width; },
    get height() { return height; },
    resize(w, h) {
      width = Math.max(1, w); height = Math.max(1, h);
      const ratio = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
      c.setTransform(ratio, 0, 0, ratio, 0, 0);
    },
    clear() { c.clearRect(0, 0, width, height); },
    // Projects a world-space THREE.Vector3 (modified in place) to CSS pixels.
    project(vector, camera) {
      vector.project(camera);
      point.x = (vector.x + 1) / 2 * width; point.y = (1 - vector.y) / 2 * height;
      return { x: point.x, y: point.y };
    },
    text(value, x, y, { size = 13, weight = 500, color = '#2b3a2e', align = 'left', alpha = 1 } = {}) {
      if (alpha <= .01) return;
      c.globalAlpha = alpha; c.fillStyle = color; c.textAlign = align; c.textBaseline = 'middle';
      c.font = `${weight} ${size}px ${sans}`; c.fillText(value, x, y); c.globalAlpha = 1;
    },
    measure(value, size = 13, weight = 500) { c.font = `${weight} ${size}px ${sans}`; return c.measureText(value).width; },
    chip(value, x, y, { size = 12, color = '#2b3a2e', fill = 'rgba(255,255,255,.7)', stroke = 'rgba(32,39,34,.14)', align = 'center', alpha = 1, weight = 600 } = {}) {
      if (alpha <= .01) return;
      c.font = `${weight} ${size}px ${sans}`;
      const w = c.measureText(value).width + size * 1.6, h = size * 2;
      const left = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
      c.globalAlpha = alpha; c.beginPath(); c.roundRect(left, y - h / 2, w, h, h / 2);
      c.fillStyle = fill; c.fill(); c.strokeStyle = stroke; c.lineWidth = 1; c.stroke(); c.globalAlpha = 1;
      this.text(value, left + w / 2, y + .5, { size, weight, color, align: 'center', alpha });
    },
    frame(x, y, w, h, { color = '#a08042', alpha = 1, radius = 14, fill = null, dash = null } = {}) {
      if (alpha <= .01) return;
      c.globalAlpha = alpha; c.beginPath(); c.roundRect(x, y, w, h, radius);
      if (fill) { c.fillStyle = fill; c.fill(); }
      if (dash) c.setLineDash(dash);
      c.strokeStyle = color; c.lineWidth = 1.2; c.stroke(); c.setLineDash([]); c.globalAlpha = 1;
    },
    bar(x, y, w, h, color, alpha = 1) {
      if (alpha <= .01) return;
      c.globalAlpha = alpha; c.fillStyle = color; c.beginPath(); c.roundRect(x, y, Math.max(1, w), h, h / 2); c.fill(); c.globalAlpha = 1;
    },
    line(points, color, width = 1, alpha = 1) {
      if (alpha <= .01 || points.length < 2) return;
      c.globalAlpha = alpha; c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); c.globalAlpha = 1;
    },
    // A soft point of light; halo adds a faint ring for emphasised points.
    glow(x, y, radius, color, alpha = 1, halo = 0) {
      if (alpha <= .01) return;
      const g = c.createRadialGradient(x, y, 0, x, y, radius * 3.2);
      g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.globalAlpha = alpha * .28; c.fillStyle = g; c.beginPath(); c.arc(x, y, radius * 3.2, 0, Math.PI * 2); c.fill();
      c.globalAlpha = alpha; c.fillStyle = color; c.beginPath(); c.arc(x, y, radius, 0, Math.PI * 2); c.fill();
      if (halo > .01) { c.globalAlpha = alpha * halo * .45; c.strokeStyle = color; c.lineWidth = 1.2; c.beginPath(); c.arc(x, y, radius * 2.1, 0, Math.PI * 2); c.stroke(); }
      c.globalAlpha = 1;
    },
    dispose() { canvas.remove(); }
  };
}
