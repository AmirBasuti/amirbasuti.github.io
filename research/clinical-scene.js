// Clinical gait as one continuous motion: a walked trial, its channels and
// windows, the frozen-encoder fingerprints, one participant summary and one
// participant-level decision. Every value drawn here is illustrative.
const clamp = n => Math.max(0, Math.min(1, n));
const smooth = (a, b, p) => { const t = clamp((p - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

export function createClinicalScene(host) {
  const canvas = document.createElement('canvas');
  canvas.className = 'cinema-svg clinical-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const c = canvas.getContext('2d');
  if (!c) return null;
  host.append(canvas);
  const ink = '#edf0e7', sage = '#9fc4ae', gold = '#d8b878', muted = '#8fa797';
  const sans = getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif';
  let W = 1, H = 1, progress = 0;

  function text(value, x, y, size, color = muted, align = 'left', alpha = 1, weight = 500) {
    c.globalAlpha = alpha; c.fillStyle = color; c.textAlign = align; c.textBaseline = 'middle';
    c.font = `${weight} ${size}px ${sans}`; c.fillText(value, x, y); c.globalAlpha = 1;
  }
  function line(points, color, width = 1.5, alpha = 1) {
    if (points.length < 2) return;
    c.globalAlpha = alpha; c.strokeStyle = color; c.lineWidth = width; c.lineJoin = 'round'; c.lineCap = 'round';
    c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); c.globalAlpha = 1;
  }
  // Walking path: out along a straight lane, a U-turn, then back.
  const OUT = .4, TURN = .2;
  const phaseOf = s => s < OUT ? 'straight' : s < OUT + TURN ? 'turn' : 'straight';
  function walkPoint(s, box) {
    const r = box.h * .26, left = box.x + box.w * .06, right = box.x + box.w * .94 - r, top = box.y + box.h * .5 - r, bottom = top + 2 * r;
    if (s < OUT) return [lerp(left, right, s / OUT), top, 0];
    if (s < OUT + TURN) { const a = -Math.PI / 2 + Math.PI * (s - OUT) / TURN; return [right + Math.cos(a) * r, top + r + Math.sin(a) * r, a + Math.PI / 2]; }
    return [lerp(right, left, (s - OUT - TURN) / (1 - OUT - TURN)), bottom, Math.PI];
  }
  const signal = (ch, t) => {
    const turn = smooth(OUT - .03, OUT + .02, t) * (1 - smooth(OUT + TURN - .02, OUT + TURN + .03, t));
    return Math.sin(t * 58 + ch * .7) * (.32 + .1 * Math.sin(ch)) + Math.sin(t * 117 + ch * 1.9) * .14 + turn * Math.sin(t * 21 + ch) * (.35 + .25 * (ch % 3) / 2);
  };

  function render(value) {
    progress = clamp(value);
    const p = progress;
    c.clearRect(0, 0, W, H);
    const narrow = W < 760;
    const box = narrow ? { x: 16, y: 10, w: W - 32, h: H - 20 } : { x: Math.max(W * .40, 560), y: H * .08, w: W - Math.max(W * .40, 560) - 56, h: H * .82 };
    const fs = narrow ? 10.5 : 12.5;
    const walk = smooth(0, .15, p), open = smooth(.15, .26, p), slide = smooth(.24, .47, p);
    const pool = smooth(.50, .68, p), decide = smooth(.76, .90, p);

    // 1 — the walked trial, its footprints and the matching signal strip.
    const a1 = 1 - open;
    const lane = { x: box.x, y: box.y, w: box.w, h: box.h * .46 };
    const strip = { x: box.x, y: lerp(box.y + box.h * .58, box.y + box.h * .04, open), w: box.w, h: lerp(box.h * .16, box.h * .5, open) };
    if (a1 > .01) {
      const route = [];
      for (let i = 0; i <= 160; i++) route.push(walkPoint(i / 160, lane));
      line(route, 'rgba(237,240,231,.08)', narrow ? 16 : 24, a1);
      for (let s = .015, k = 0; s <= walk; s += .032, k++) {
        const [x, y, angle] = walkPoint(s, lane), side = k % 2 ? 1 : -1, off = narrow ? 4 : 6;
        c.save(); c.globalAlpha = a1 * (.45 + .55 * clamp(1 - (walk - s) * 2.5)); c.translate(x - Math.sin(angle) * off * side, y + Math.cos(angle) * off * side); c.rotate(angle);
        c.fillStyle = phaseOf(s) === 'turn' ? gold : sage; c.beginPath(); c.ellipse(0, 0, narrow ? 4.5 : 6, narrow ? 2.2 : 3, 0, 0, Math.PI * 2); c.fill(); c.restore();
      }
      const [wx, wy] = walkPoint(Math.max(.001, walk), lane);
      c.globalAlpha = a1; c.fillStyle = ink; c.beginPath(); c.arc(wx, wy, narrow ? 5 : 7, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(237,240,231,.25)'; c.lineWidth = 1; c.beginPath(); c.arc(wx, wy, narrow ? 10 : 14, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1;
      text('straight', lane.x + lane.w * .06, lane.y + lane.h * .5 - lane.h * .26 - 16, fs, sage, 'left', a1 * smooth(.01, .06, p));
      text('U-turn', lane.x + lane.w * .94 + 4, lane.y + lane.h * .5, fs, gold, 'right', a1 * smooth(.06, .1, p));
    }
    // The strip carries the same trial; it opens into 24 channels.
    const channels = Math.round(lerp(1, 24, open));
    const shown = Math.max(walk, open);
    for (let ch = 0; ch < channels; ch++) {
      const rowH = strip.h / Math.max(1, channels), cy = strip.y + rowH * (ch + .5), amp = Math.min(rowH * .42, strip.h * .32);
      const pts = [];
      for (let i = 0; i <= 260; i++) { const t = i / 260; if (t > shown) break; pts.push([strip.x + strip.w * t, cy - signal(ch, t) * amp]); }
      line(pts, ch < 12 ? sage : '#c9d6c2', open > .5 ? 1 : 1.6, (1 - pool) * (open > .5 ? .55 : .9));
    }
    if (a1 > .01) {
      const bands = [[0, OUT, sage], [OUT, OUT + TURN, gold], [OUT + TURN, 1, sage]];
      bands.forEach(([s0, s1, color]) => { c.globalAlpha = .08 * a1 * smooth(.05, .12, p); c.fillStyle = color; c.fillRect(strip.x + strip.w * s0, strip.y - 6, strip.w * (s1 - s0), strip.h + 12); });
      c.globalAlpha = 1;
      const by = strip.y + strip.h + 18, show = a1 * smooth(.11, .15, p);
      line([[strip.x, by], [strip.x + strip.w, by]], muted, 1, show * .6); text('full trial', strip.x, by + 14, fs, muted, 'left', show);
      text('turn', strip.x + strip.w * (OUT + TURN / 2), by + 14, fs, gold, 'center', show);
      text('straight', strip.x + strip.w * (1 - (1 - OUT - TURN) / 2), by + 14, fs, sage, 'center', show);
    }

    // 2 — a two-second window slides along; each window becomes a fingerprint.
    const a2 = open * (1 - pool);
    const cols = 12, cells = 16;
    const grid = { x: box.x, y: box.y + box.h * .62, w: box.w, h: box.h * .3 };
    const colW = Math.min(grid.w / (cols * 1.6), narrow ? 14 : 22), gap = colW * .6;
    const made = slide * cols;
    if (a2 > .01) {
      text('24 channels · 100 Hz', strip.x, strip.y - 14, fs, muted, 'left', a2);
      const ww = strip.w * .1, wx = strip.x + (strip.w - ww) * slide;
      c.globalAlpha = a2; c.fillStyle = 'rgba(216,184,120,.12)'; c.fillRect(wx, strip.y - 4, ww, strip.h + 8);
      c.strokeStyle = gold; c.lineWidth = 1.2; c.strokeRect(wx, strip.y - 4, ww, strip.h + 8); c.globalAlpha = 1;
      text('2 s', wx + ww / 2, strip.y - 14, fs, gold, 'center', a2, 600);
      text(narrow ? 'frozen NuTime → 128-D' : 'frozen NuTime · 128-D per channel', grid.x, grid.y - 16, fs, ink, 'left', a2, 600);
    }
    // Fingerprint columns, then their pooling into four summaries.
    const statX = k => box.x + box.w * (narrow ? .14 : .22) + k * (colW * 2.4);
    const trialRows = 3;
    for (let r = 0; r < trialRows; r++) for (let k = 0; k < cols; k++) {
      const born = clamp(made - k);
      const rowAlpha = r === 0 ? 1 : pool;
      if (born <= 0 && r === 0) continue;
      const g = k % 4;
      const sx = grid.x + k * (colW + gap), sy = grid.y + (r ? (r - .5) * 6 : 0);
      const tx = statX(g), ty = lerp(grid.y, box.y + box.h * .22, pool);
      const x = lerp(sx, tx, pool), y = lerp(sy - (1 - born) * 30, ty, pool);
      const alpha = (r === 0 ? Math.min(born, 1) : 1) * rowAlpha * (1 - decide) * (pool > .95 && (k > 3 || r) ? 1 - (pool - .95) / .05 : 1);
      if (alpha < .01) continue;
      const cellH = (grid.h * (narrow ? .9 : .8)) / cells;
      for (let i = 0; i < cells; i++) {
        const v = pool > .6 && k < 4 && r === 0 ? hash(g * 31 + i) : hash(k * 17 + i * 3 + r * 101);
        c.globalAlpha = alpha * (.25 + .75 * v);
        c.fillStyle = v > .72 ? gold : sage;
        c.fillRect(x, y + i * cellH, colW, cellH - 1.5);
      }
      c.globalAlpha = 1;
    }
    // 3 — four pooled summaries describe one participant.
    const a3 = pool * (1 - decide);
    if (a3 > .01) {
      ['mean', 'max', 'min', 'std'].forEach((label, k) => text(label, statX(k) + colW / 2, box.y + box.h * .22 - 14, fs, ink, 'center', smooth(.7, 1, pool) * (1 - decide)));
      const left = statX(0) - 10, right = statX(3) + colW + 10, by = box.y + box.h * .22 + (grid.h * (narrow ? .9 : .8)) + 16;
      line([[left, by], [right, by]], gold, 1.2, a3 * smooth(.75, 1, pool));
      text('one participant', (left + right) / 2, by + 15, fs, gold, 'center', a3 * smooth(.75, 1, pool), 600);
      text(narrow ? 'all eligible trials' : 'pooled over the participant’s eligible trials', statX(3) + colW + 24, box.y + box.h * .22 + 10, fs, muted, 'left', a3 * smooth(.8, 1, pool) * (narrow ? 0 : 1));
    }

    // 4 — the summary becomes one point; a linear head places it.
    if (decide > .01) {
      const map = narrow ? { x: box.x, y: box.y + box.h * .2, w: box.w, h: box.h * .74 } : { x: box.x + box.w * .1, y: box.y + box.h * .16, w: box.w * .8, h: box.h * .74 };
      for (let i = 0; i < 46; i++) {
        const group = i % 2, px = map.x + map.w * (group ? .62 : .32 + 0) + (hash(i) - .5) * map.w * .42, py = map.y + map.h * (group ? .4 : .62) + (hash(i + 50) - .5) * map.h * .5;
        c.globalAlpha = decide * .55; c.fillStyle = group ? gold : sage; c.beginPath(); c.arc(px, py, narrow ? 2.6 : 3.4, 0, Math.PI * 2); c.fill();
      }
      c.globalAlpha = 1;
      const sweep = smooth(.82, .94, p);
      const b0 = [map.x + map.w * .3, map.y + map.h], b1 = [map.x + map.w * .68, map.y];
      line([b0, [lerp(b0[0], b1[0], sweep), lerp(b0[1], b1[1], sweep)]], ink, 1.4, decide * .8);
      const from = [statX(1.5) + colW / 2, box.y + box.h * .4], to = [map.x + map.w * .7, map.y + map.h * .36];
      const fly = smooth(.76, .86, p), dx = lerp(from[0], to[0], fly), dy = lerp(from[1], to[1], fly) - Math.sin(fly * Math.PI) * 30;
      const glow = c.createRadialGradient(dx, dy, 0, dx, dy, 26); glow.addColorStop(0, 'rgba(216,184,120,.5)'); glow.addColorStop(1, 'rgba(216,184,120,0)');
      c.fillStyle = glow; c.beginPath(); c.arc(dx, dy, 26, 0, Math.PI * 2); c.fill();
      c.fillStyle = ink; c.beginPath(); c.arc(dx, dy, narrow ? 5 : 6.5, 0, Math.PI * 2); c.fill();
      text('balanced logistic regression', map.x, map.y - 12, fs, ink, 'left', decide, 600);
      const chips = ['2 classes', '3 classes', '8 cohorts'];
      let cx = map.x;
      chips.forEach((label, i) => {
        c.font = `500 ${fs}px ${sans}`; const w = c.measureText(label).width + 20, on = smooth(.86 + i * .03, .9 + i * .03, p);
        c.globalAlpha = decide; c.fillStyle = on > .5 ? 'rgba(216,184,120,.16)' : 'rgba(237,240,231,.05)';
        c.beginPath(); c.roundRect(cx, map.y + map.h + 10, w, fs * 2.1, fs * 1.05); c.fill();
        c.strokeStyle = on > .5 ? 'rgba(216,184,120,.6)' : 'rgba(237,240,231,.12)'; c.lineWidth = 1; c.stroke(); c.globalAlpha = 1;
        text(label, cx + w / 2, map.y + map.h + 10 + fs * 1.05, fs, on > .5 ? gold : muted, 'center', decide);
        cx += w + 8;
      });
    }
  }
  function resize() {
    const rect = canvas.getBoundingClientRect();
    W = Math.max(1, rect.width); H = Math.max(1, rect.height);
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * ratio); canvas.height = Math.round(H * ratio);
    c.setTransform(ratio, 0, 0, ratio, 0, 0);
    render(progress);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  return { render, resize, dispose() { observer.disconnect(); canvas.remove(); } };
}
