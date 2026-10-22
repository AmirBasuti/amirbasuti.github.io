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
  halo.setAttribute('stroke', '#bfd5b2');
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
      dot.setAttribute('fill', '#c2d5b4');
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

/** Persistent illustrative traces. They never fetch or represent employer records. */
export function createMechanismScene(host, type) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) return { render() {}, resize() {}, dispose() {} };
  host.append(canvas);
  host.classList.add('trace-rendered');
  let width = 1, height = 1, progress = 1;
  const green = '#b5cfa3', brass = '#d5bd8c';
  function wave(t) {
    return .43 * Math.sin(t * 13.4) + .19 * Math.sin(t * 29.6 + .4)
      + .10 * Math.sin(t * 61.2 + 1.4) + .06 * Math.sin(t * 109.8);
  }
  function line(points, color, alpha = 1, thickness = 2) {
    if (points.length < 2) return;
    context.globalAlpha = alpha;
    context.strokeStyle = color;
    context.lineWidth = thickness;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.beginPath();
    points.forEach((point, index) => index ? context.lineTo(point[0], point[1]) : context.moveTo(point[0], point[1]));
    context.stroke();
    context.globalAlpha = 1;
  }
  function marker(x, y, opacity = 1) {
    const glow = context.createRadialGradient(x, y, 0, x, y, 22);
    glow.addColorStop(0, `rgba(213,189,140,${.18 * opacity})`);
    glow.addColorStop(1, 'rgba(213,189,140,0)');
    context.fillStyle = glow;
    context.beginPath(); context.arc(x, y, 22, 0, Math.PI * 2); context.fill();
    context.globalAlpha = opacity;
    context.fillStyle = brass;
    context.beginPath(); context.arc(x, y, 3.3, 0, Math.PI * 2); context.fill();
    context.globalAlpha = 1;
  }
  function reconnect(p) {
    const left = width * .06, span = width * .88, center = height * .51;
    const y = t => center - wave(t * 1.9) * height * .20;
    const first = [], resumed = [];
    for (let i = 0; i <= 240; i++) {
      const t = i / 240;
      if (t <= .43) first.push([left + span * t, y(t)]);
      if (t >= .57) resumed.push([left + span * t, y(t)]);
    }
    line(first, green, .9, 1.7);
    line(first, green, .05, 10);
    const returnProgress = smooth(.56, .98, p);
    const visible = resumed.slice(0, Math.max(1, Math.floor(resumed.length * returnProgress)));
    line(visible, green, .95, 1.7);
    line(visible, green, .05, 10);
    const gap = smooth(.24, .39, p) * (1 - smooth(.60, .80, p));
    line([[left + span * .45, center + height * .23], [left + span * .55, center + height * .23]], brass, .35 * gap, 1);
    if (p < .28) {
      const t = .08 + .35 * smooth(0, .28, p);
      marker(left + span * t, y(t));
    } else if (p < .56) marker(left + span * .43, y(.43), .45 + .55 * Math.sin((p - .28) / .28 * Math.PI));
    else {
      const t = .57 + .43 * returnProgress;
      marker(left + span * t, y(t));
    }
    line([[left + span * .43, center + height * .36], [left + span * .57, center + height * .36]], '#849278', .35, 1);
  }
  function history(p) {
    const zoom = smooth(.04, .44, p), pan = smooth(.48, .96, p);
    const start = .40 + .23 * zoom - .56 * pan;
    const length = .59 - .31 * zoom;
    const left = width * .05, span = width * .90, center = height * .50;
    const loadedStart = .40 - .40 * smooth(.52, .91, p);
    const points = [];
    for (let i = 0; i <= 300; i++) {
      const t = start + i / 300 * length;
      if (t < loadedStart) continue;
      const basic = .43 * Math.sin(t * 13.4) + .19 * Math.sin(t * 29.6 + .4);
      const detail = .10 * Math.sin(t * 61.2 + 1.4) + .06 * Math.sin(t * 109.8);
      points.push([left + span * i / 300, center - (basic + detail * (.12 + .88 * zoom)) * height * .33]);
    }
    line(points, green, .06, 10);
    line(points, green, .95, 1.8);
    if (points.length) marker(points[0][0], points[0][1], .65);
    // A single quiet time ruler reflects the selected span, rather than a second chart.
    const rulerY = height * .83;
    line([[left, rulerY], [left + span, rulerY]], '#809374', .15, 1);
    line([[left + span * start, rulerY], [left + span * (start + length), rulerY]], brass, .65, 2);
  }
  function migration(p) {
    const left = width * .06, span = width * .88, center = height * .62;
    const points = [];
    for (let i = 0; i <= 220; i++) {
      const t = i / 220;
      points.push([left + span * t, center + Math.sin(t * Math.PI * 2) * height * .065]);
    }
    line(points, green, .12, 1.3);
    const end = Math.max(2, Math.round((.04 + .96 * smooth(0, 1, p)) * points.length));
    const passed = points.slice(0, end);
    line(passed, green, .08, 10);
    line(passed, green, .85, 1.8);
    const current = passed[passed.length - 1];
    if (current) marker(current[0], current[1]);
    // The decimal string in the HTML remains literally unchanged throughout.
  }
  function render(value) {
    progress = clamp(value);
    context.clearRect(0, 0, width, height);
    if (type === 'reconnect') reconnect(progress);
    else if (type === 'history') history(progress);
    else migration(progress);
  }
  function resize() {
    const rect = host.getBoundingClientRect();
    width = Math.max(1, rect.width); height = Math.max(1, rect.height);
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    render(progress);
  }
  resize();
  return { render, resize, dispose() { canvas.remove(); host.classList.remove('trace-rendered'); } };
}
