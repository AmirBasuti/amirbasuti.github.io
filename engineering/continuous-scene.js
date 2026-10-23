const clamp = value => Math.max(0, Math.min(1, value));
const smooth = (a, b, value) => { const t = clamp((value - a) / (b - a)); return t * t * (3 - 2 * t); };
const ns = 'http://www.w3.org/2000/svg';

/** Reuses the interactive chart's exact geometry, dates and values. */
export function createObservationScene(chart, requestFrame) {
  const line = chart.querySelector('#chart-line');
  const area = chart.querySelector('#chart-area');
  const grid = chart.querySelector('#chart-grid');
  const cursor = chart.querySelector('#chart-cursor');
  const dots = document.createElementNS(ns, 'g');
  dots.setAttribute('aria-hidden', 'true');
  const halo = document.createElementNS(ns, 'path');
  halo.setAttribute('fill', 'none');
  halo.setAttribute('stroke', '#4da3ff');
  halo.setAttribute('stroke-width', '9');
  halo.setAttribute('stroke-opacity', '.08');
  halo.setAttribute('pathLength', '1');
  halo.setAttribute('vector-effect', 'non-scaling-stroke');
  chart.insertBefore(halo, line);
  chart.insertBefore(dots, cursor);
  let samples = [], progress = 1, ready = false;

  function receive(event) {
    samples = event.detail.points;
    dots.replaceChildren();
    samples.forEach(point => {
      const dot = document.createElementNS(ns, 'circle');
      dot.setAttribute('cx', point.x);
      dot.setAttribute('cy', point.y);
      dot.setAttribute('r', '3.3');
      dot.setAttribute('fill', '#8cc4ff');
      dots.append(dot);
    });
    halo.setAttribute('d', line.getAttribute('d'));
    ready = true;
    render(progress);
    requestFrame();
  }
  function render(value) {
    progress = clamp(value);
    if (!ready) return;
    const join = smooth(.40, .90, progress);
    line.style.strokeDasharray = '1';
    line.style.strokeDashoffset = String(1 - join);
    halo.style.strokeDasharray = '1';
    halo.style.strokeDashoffset = String(1 - join);
    area.style.opacity = String(smooth(.80, 1, progress));
    grid.style.opacity = String(smooth(.63, .90, progress));
    cursor.style.opacity = String(smooth(.87, 1, progress));
    [...dots.children].forEach((dot, index) => {
      const arrival = smooth(index / samples.length * .22, .12 + index / samples.length * .22, progress);
      dot.setAttribute('opacity', String((.25 + .75 * arrival) * (1 - .63 * join)));
      dot.setAttribute('r', String(1.7 + 2.2 * arrival - 1.2 * join));
    });
  }
  window.addEventListener('engineering:chart-rendered', receive);
  window.dispatchEvent(new Event('engineering:layout'));
  return {
    render,
    dispose() {
      window.removeEventListener('engineering:chart-rendered', receive);
      [line, area, grid, cursor].forEach(node => node.removeAttribute('style'));
      dots.remove(); halo.remove();
    }
  };
}

/** Illustrative interface scenes. They never fetch or represent employer records. */
export function createMechanismScene(host, type) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) return { render() {}, resize() {}, dispose() {} };
  host.append(canvas);
  host.classList.add('trace-rendered');
  const c = context;
  let width = 1, height = 1, progress = 1;
  const ink = '#eef0f4', soft = '#c9ccd3', muted = '#8b93a1', faint = '#5d6470';
  const blue = '#4da3ff', blueSoft = '#8cc4ff', amber = '#ffb547', green = '#3ddc97', red = '#ff7a6b';
  const sans = getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif';
  const mono = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  const lerp = (a, b, t) => a + (b - a) * t;

  function rect(x, y, w, h, r, fill, stroke) {
    c.beginPath(); c.roundRect(x, y, w, h, r);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1; c.stroke(); }
  }
  function text(value, x, y, { size = 12, weight = 400, color = soft, align = 'left', font = sans, alpha = 1 } = {}) {
    c.globalAlpha = alpha; c.fillStyle = color; c.textAlign = align; c.textBaseline = 'middle';
    c.font = `${weight} ${size}px ${font}`; c.fillText(value, x, y); c.globalAlpha = 1;
  }
  function path(points, color, w = 1.8, alpha = 1) {
    if (points.length < 2) return;
    c.globalAlpha = alpha; c.strokeStyle = color; c.lineWidth = w; c.lineJoin = 'round'; c.lineCap = 'round';
    c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); c.globalAlpha = 1;
  }
  function glowDot(x, y, color = amber, r = 3.4) {
    const g = c.createRadialGradient(x, y, 0, x, y, 18);
    g.addColorStop(0, color === amber ? 'rgba(255,181,71,.35)' : 'rgba(77,163,255,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, 18, 0, Math.PI * 2); c.fill();
    c.fillStyle = color; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  }
  function pill(label, x, y, color, alignRight = true) {
    c.font = `600 11px ${sans}`;
    const w = c.measureText(label).width + 30, h = 24, left = alignRight ? x - w : x;
    rect(left, y, w, h, 12, 'rgba(255,255,255,.06)', 'rgba(255,255,255,.1)');
    c.fillStyle = color; c.beginPath(); c.arc(left + 13, y + h / 2, 3.5, 0, Math.PI * 2); c.fill();
    text(label, left + 22, y + h / 2 + .5, { size: 11, weight: 600, color: ink });
  }
  const wave = t => .43 * Math.sin(t * 13.4) + .19 * Math.sin(t * 29.6 + .4) + .10 * Math.sin(t * 61.2 + 1.4) + .06 * Math.sin(t * 109.8);

  // 01: a stream drops, the client cleans up and reconnects, and the gap stays empty.
  function reconnect(p) {
    const pad = 16, compact = width < 460;
    const drop = .30, up = .54, head = .04 + .94 * p;
    const g0 = .04 + .94 * drop, g1 = .04 + .94 * up;
    const connected = p < drop || p >= up;
    text(compact ? 'stream' : 'wss://stream  ·  readings', pad, pad + 12, { size: 11, color: muted, font: mono });
    if (p < drop) pill('Connected', width - pad, pad, green);
    else if (p < drop + .06) pill('Disconnected', width - pad, pad, red);
    else if (p < up) pill(compact ? 'Reconnecting' : `Reconnecting · retry ${p < .45 ? 1 : 2} s`, width - pad, pad, amber);
    else pill(compact ? 'Resumed' : 'Connected · resumed', width - pad, pad, green);

    const x0 = pad, x1 = width - pad, y0 = pad + 40, y1 = height * .58, mid = (y0 + y1) / 2, amp = (y1 - y0) * .36;
    const X = t => lerp(x0, x1, t), Y = t => mid - wave(t * 1.9) * amp;
    path([[x0, y1], [x1, y1]], 'rgba(255,255,255,.08)', 1);
    if (head > g0) {
      const right = Math.min(head, g1);
      c.save(); c.beginPath(); c.rect(X(g0), y0 - 4, X(right) - X(g0), y1 - y0 + 4); c.clip();
      c.strokeStyle = 'rgba(255,181,71,.18)'; c.lineWidth = 1;
      for (let x = X(g0) - (y1 - y0); x < X(right); x += 7) { c.beginPath(); c.moveTo(x, y1); c.lineTo(x + (y1 - y0), y0 - 4); c.stroke(); }
      c.restore();
      c.setLineDash([3, 4]); path([[X(g0), y0 - 4], [X(g0), y1]], 'rgba(255,181,71,.6)', 1); if (head > g1) path([[X(g1), y0 - 4], [X(g1), y1]], 'rgba(255,181,71,.6)', 1); c.setLineDash([]);
      if (X(right) - X(g0) > 64) text('no readings', (X(g0) + X(right)) / 2, y1 - 12, { size: 11, color: amber, align: 'center', alpha: .9 });
    }
    const first = [], resumed = [];
    for (let i = 0; i <= 300; i++) {
      const t = .04 + .94 * i / 300;
      if (t > head) break;
      if (t <= g0) first.push([X(t), Y(t)]); else if (t >= g1) resumed.push([X(t), Y(t)]);
    }
    path(first, blue, 8, .08); path(first, blue, 1.8); path(resumed, blue, 8, .08); path(resumed, blue, 1.8);
    if (connected) glowDot(X(head), Y(head));
    else { c.globalAlpha = .5 + .5 * Math.sin(p * 90); glowDot(X(g0), Y(g0), amber, 3); c.globalAlpha = 1; }

    // A short client log under the plot. Events follow the same timeline.
    const ly = height * .64, lh = height - ly - pad;
    rect(pad, ly, width - pad * 2, lh, 12, 'rgba(255,255,255,.035)', 'rgba(255,255,255,.07)');
    const events = [];
    for (let q = .02, n = 1041; q < 1; q += .05, n++) if (q < drop || q >= up + .02) events.push({ p: q, t: `←  reading ${n}   ${(.6 + wave(.04 + .94 * q) * .3).toFixed(2)}`, color: soft });
    events.push({ p: drop, t: '✕  socket closed (1006)', color: red }, { p: drop + .03, t: '·  cleanup: heartbeat, subscription', color: muted },
      { p: .37, t: '↻  retry in 1 s', color: amber }, { p: .45, t: '↻  retry in 2 s', color: amber },
      { p: up, t: '✓  open · resubscribed', color: green }, { p: up + .04, t: '·  gap kept empty: nothing filled', color: blueSoft });
    const shown = events.filter(e => e.p <= p).sort((a, b) => a.p - b.p);
    const rows = Math.max(2, Math.floor((lh - 14) / 18)), visible = shown.slice(-rows);
    visible.forEach((e, i) => text(compact ? e.t.replace('   ', ' ') : e.t, pad + 14, ly + 16 + i * 18, { size: compact ? 10.5 : 11.5, font: mono, color: e.color, alpha: .35 + .65 * (i + 1) / visible.length }));
  }

  // 02: a chart narrows to finer detail, then loads older history as the view moves back.
  const series = (() => {
    let seed = 7, v = .5; const out = [];
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i <= 1200; i++) { v += (rand() - .5) * .035 + Math.sin(i / 90) * .002; v = Math.max(.12, Math.min(.88, v)); out.push(v); }
    return out;
  })();
  function history(p) {
    const pad = 16, compact = width < 460;
    const zoom = smooth(.05, .40, p), pan = smooth(.52, .82, p), load = smooth(.66, .94, p);
    const start = lerp(lerp(.45, .70, zoom), .26, pan), end = lerp(lerp(1, .86, zoom), .42, pan);
    const loaded = lerp(.45, .12, load);
    const tabs = ['1M', '1W', '1D'], active = zoom < .34 ? 0 : zoom < .8 ? 1 : 2;
    let tx = pad;
    tabs.forEach((label, i) => {
      rect(tx, pad, 38, 24, 8, i === active ? 'rgba(77,163,255,.18)' : 'rgba(255,255,255,.04)', i === active ? 'rgba(77,163,255,.55)' : 'rgba(255,255,255,.08)');
      text(label, tx + 19, pad + 12.5, { size: 11, weight: 600, color: i === active ? blueSoft : muted, align: 'center' });
      tx += 44;
    });
    if (p > .55 && p < .9) {
      const label = 'Loading older history';
      c.font = `500 11px ${sans}`;
      const w = c.measureText(label).width + 34;
      rect(width - pad - w, pad, w, 24, 12, 'rgba(255,181,71,.1)', 'rgba(255,181,71,.35)');
      for (let i = 0; i < 3; i++) { c.globalAlpha = .35 + .65 * ((Math.sin(p * 80 - i) + 1) / 2); c.fillStyle = amber; c.beginPath(); c.arc(width - pad - w + 12 + i * 5, pad + 12, 1.8, 0, Math.PI * 2); c.fill(); }
      c.globalAlpha = 1; text(label, width - pad - w + 28, pad + 12.5, { size: 11, color: amber });
    } else if (!compact) text(active === 2 ? 'finer detail' : 'visible range', width - pad, pad + 12, { size: 11, color: muted, align: 'right' });

    const x0 = pad, x1 = width - pad, y0 = pad + 40, y1 = height * .72;
    for (let i = 0; i < 4; i++) path([[x0, lerp(y0, y1, i / 3)], [x1, lerp(y0, y1, i / 3)]], 'rgba(255,255,255,.06)', 1);
    const X = t => lerp(x0, x1, (t - start) / (end - start)), Y = v => lerp(y1, y0, v);
    if (loaded > start) {
      const right = Math.min(end, loaded);
      for (let i = 0, x = X(start); x < X(right) - 4; i++, x += 14) {
        c.globalAlpha = .06 + .06 * Math.sin(p * 40 + i * .6); c.fillStyle = '#fff';
        c.fillRect(x, lerp(y0, y1, .3 + .25 * Math.sin(i * .9)), 9, (y1 - y0) * .3); c.globalAlpha = 1;
      }
    }
    const step = Math.max(1, Math.round(lerp(18, 2, zoom))), points = [], dots = [];
    for (let i = 0; i <= 1200; i += step) {
      const t = i / 1200;
      if (t < Math.max(start, loaded) || t > end) continue;
      points.push([X(t), Y(series[i])]); dots.push(points[points.length - 1]);
    }
    c.save(); c.beginPath(); c.rect(x0, y0 - 6, x1 - x0, y1 - y0 + 12); c.clip();
    if (points.length > 1) {
      const fill = c.createLinearGradient(0, y0, 0, y1); fill.addColorStop(0, 'rgba(77,163,255,.2)'); fill.addColorStop(1, 'rgba(77,163,255,0)');
      c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
      c.lineTo(points[points.length - 1][0], y1); c.lineTo(points[0][0], y1); c.closePath(); c.fillStyle = fill; c.fill();
    }
    path(points, blue, 1.8);
    if (zoom > .55 && dots.length < 140) { c.fillStyle = blueSoft; c.globalAlpha = (zoom - .55) / .45; dots.forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 2, 0, Math.PI * 2); c.fill(); }); c.globalAlpha = 1; }
    c.restore();

    // Overview strip: the whole history known so far, with the visible window.
    const my = height * .8, mh = height - my - pad;
    rect(x0, my, x1 - x0, mh, 8, 'rgba(255,255,255,.03)', 'rgba(255,255,255,.07)');
    const mini = [];
    for (let i = 0; i <= 1200; i += 6) { const t = i / 1200; if (t >= loaded) mini.push([lerp(x0, x1, t), my + mh - 4 - series[i] * (mh - 8)]); }
    path(mini, muted, 1.2, .8);
    rect(lerp(x0, x1, start), my + 2, Math.max(6, lerp(x0, x1, end) - lerp(x0, x1, start)), mh - 4, 6, 'rgba(77,163,255,.14)', 'rgba(77,163,255,.7)');
  }

  // 03: one exact decimal passes from the old store, through a migration, to a typed response.
  function migration(p) {
    const pad = 16, compact = width < 460, gap = compact ? 8 : 14;
    const cw = (width - pad * 2 - gap * 2) / 3, top = pad + 6, ch = height * .66;
    const cards = [
      { title: 'SQLite', sub: 'price history', lines: ['SELECT price', 'FROM history'] },
      { title: 'PostgreSQL', sub: 'after migration', lines: ['price NUMERIC', 'alembic upgrade'] },
      { title: 'API', sub: 'typed response', lines: ['{ "price":', '  "123.4500" }'] }
    ];
    const focus = p < .26 ? 0 : p < .69 ? 1 : 2;
    cards.forEach((card, i) => {
      const x = pad + i * (cw + gap), on = i === focus, reached = i <= focus;
      rect(x, top, cw, ch, 14, on ? 'rgba(77,163,255,.09)' : 'rgba(255,255,255,.035)', on ? 'rgba(77,163,255,.55)' : 'rgba(255,255,255,.08)');
      text(card.title, x + 14, top + 22, { size: compact ? 12 : 14, weight: 600, color: reached ? ink : muted });
      if (!compact) text(card.sub, x + 14, top + 41, { size: 11, color: muted });
      card.lines.forEach((line, k) => text(line, x + 14, top + (compact ? 48 : 70) + k * 18, { size: compact ? 9.5 : 11.5, font: mono, color: reached ? (i === 1 && k === 0 ? blueSoft : soft) : faint }));
      if (i === 1 && focus >= 1) text('✓ exact decimal', x + 14, top + ch - 18, { size: compact ? 9.5 : 11, color: green, alpha: Math.min(1, (p - .26) / .1) });
      if (i === 2 && focus >= 2) text('Decimal · Pydantic', x + 14, top + ch - 18, { size: compact ? 9.5 : 11, color: green, alpha: Math.min(1, (p - .69) / .1) });
    });
    // The travelling value: its string never changes.
    const move1 = smooth(.30, .55, p), move2 = smooth(.72, .92, p);
    const cx = i => pad + i * (cw + gap) + cw / 2;
    const vx = lerp(lerp(cx(0), cx(1), move1), cx(2), move2), vy = top + ch * .66;
    for (let i = 0; i < 2; i++) path([[cx(i) + cw * .3, vy], [cx(i + 1) - cw * .3, vy]], 'rgba(255,255,255,.12)', 1);
    c.font = `600 ${compact ? 13 : 16}px ${mono}`;
    const label = '123.4500', w = c.measureText(label).width + 22;
    rect(vx - w / 2, vy - 15, w, 30, 15, 'rgba(255,181,71,.14)', 'rgba(255,181,71,.6)');
    text(label, vx, vy + 1, { size: compact ? 13 : 16, weight: 600, font: mono, color: amber, align: 'center' });
    const by = top + ch + 18;
    if (p > .78) text(compact ? '123.4500 in = 123.4500 out' : 'stored 123.4500  ·  returned "123.4500"  ·  no rounding', width / 2, by + 6, { size: compact ? 11 : 12, color: soft, align: 'center', alpha: Math.min(1, (p - .78) / .1) });
  }

  function render(value) {
    progress = clamp(value);
    c.clearRect(0, 0, width, height);
    if (type === 'reconnect') reconnect(progress);
    else if (type === 'history') history(progress);
    else migration(progress);
  }
  function resize() {
    const rect = host.getBoundingClientRect();
    width = Math.max(1, rect.width); height = Math.max(1, rect.height);
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    c.setTransform(ratio, 0, 0, ratio, 0, 0);
    render(progress);
  }
  resize();
  return { render, resize, dispose() { canvas.remove(); host.classList.remove('trace-rendered'); } };
}
