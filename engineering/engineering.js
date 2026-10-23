(() => {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!reduced.matches && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    document.querySelectorAll('[data-reveal]').forEach(el => {
      el.classList.add('reveal-ready');
      observer.observe(el);
    });
    reduced.addEventListener('change', event => {
      if (event.matches) {
        observer.disconnect();
        document.querySelectorAll('.reveal-ready').forEach(el => el.classList.remove('reveal-ready'));
      }
    });
  }
  const $ = id => document.getElementById(id);
  const status = $('market-status'), content = $('market-content');
  const select = $('asset-select'), slider = $('date-range'), chart = $('price-chart');
  const ns = 'http://www.w3.org/2000/svg';
  // Formats follow the active series: its decimals and its market time zone.
  const zone = () => (active && active.timeZone) || 'UTC';
  const intraday = () => active && active.points[active.points.length - 1].time - active.points[0].time < 2.5 * 864e5;
  const dates = { format: date => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: zone() }).format(date) + (zone() === 'Asia/Tehran' ? ' Tehran' : ' UTC') };
  const spanDate = { format: date => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: zone() }).format(date) };
  const shortDate = { format: date => new Intl.DateTimeFormat('en-GB', intraday() ? { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: zone() } : { day: 'numeric', month: 'short', timeZone: zone() }).format(date) };
  const numbers = { format: value => new Intl.NumberFormat('en-US', { minimumFractionDigits: active?.decimals ?? 4, maximumFractionDigits: active?.decimals ?? 4 }).format(value) };
  const bounds = { left: 72, right: 965, top: 24, bottom: 300 };
  let assets = [], active = null, x = null, y = null;

  function safeLink(value) {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Unsupported source URL');
    return url.href;
  }
  function cleanAsset(item) {
    if (!item || typeof item.name !== 'string' || typeof item.unit !== 'string' || !Array.isArray(item.points)) return null;
    const seen = new Set();
    const points = item.points.filter(point => {
      if (!point || typeof point.date !== 'string' || typeof point.value !== 'number' || !Number.isFinite(point.value)) return false;
      const time = Date.parse(point.date);
      if (!Number.isFinite(time) || seen.has(time)) return false;
      seen.add(time);
      return true;
    }).map(point => ({ date: point.date, time: Date.parse(point.date), value: point.value })).sort((a, b) => a.time - b.time);
    return points.length >= 2 ? { ...item, points } : null;
  }
  function svgNode(tag, attrs, text) {
    const node = document.createElementNS(ns, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function inspect(index) {
    if (!active) return;
    index = Math.max(0, Math.min(active.points.length - 1, Math.round(index)));
    const point = active.points[index];
    slider.value = String(index);
    const date = dates.format(new Date(point.time)), value = numbers.format(point.value);
    $('point-value').textContent = value;
    $('point-date').textContent = date;
    slider.setAttribute('aria-valuetext', `${date}: ${value} ${active.unit}`);
    $('cursor-line').setAttribute('x1', x(point.time));
    $('cursor-line').setAttribute('x2', x(point.time));
    $('cursor-dot').setAttribute('cx', x(point.time));
    $('cursor-dot').setAttribute('cy', y(point.value));
  }
  function render(selectedIndex) {
    active = assets[Number(select.value)];
    const points = active.points, start = points[0].time, end = points[points.length - 1].time;
    const compact = window.matchMedia('(max-width: 650px)').matches;
    // On small screens one SVG unit is one CSS pixel, keeping labels legible.
    const scene = document.getElementById('pipeline-story');
    const inScene = scene && scene.classList.contains('pipeline-enhanced');
    const width = compact || inScene ? Math.max(240, chart.clientWidth) : 1000;
    const height = compact ? 255 : inScene ? Math.max(130, chart.clientHeight) : 350;
    Object.assign(bounds, compact
      ? { left: 60, right: width - 18, top: 24, bottom: 212 }
      : { left: 72, right: width - 35, top: 20, bottom: height - 40 });
    chart.setAttribute('viewBox', `0 0 ${width} ${height}`);
    $('cursor-line').setAttribute('y1', compact ? bounds.top : 20);
    $('cursor-line').setAttribute('y2', bounds.bottom);
    let min = Infinity, max = -Infinity;
    points.forEach(point => { min = Math.min(min, point.value); max = Math.max(max, point.value); });
    const pad = (max - min || Math.abs(max) || 1) * 0.12;
    min -= pad; max += pad;
    x = time => bounds.left + (time - start) / (end - start) * (bounds.right - bounds.left);
    y = value => bounds.bottom - (value - min) / (max - min) * (bounds.bottom - bounds.top);
    const path = points.map((point, i) => `${i ? 'L' : 'M'}${x(point.time).toFixed(2)},${y(point.value).toFixed(2)}`).join(' ');
    $('chart-line').setAttribute('d', path);
    $('chart-area').setAttribute('d', `${path} L${bounds.right},${bounds.bottom} L${bounds.left},${bounds.bottom} Z`);
    const grid = $('chart-grid'); grid.replaceChildren();
    for (let i = 0; i < 5; i++) {
      const value = min + (max - min) * i / 4;
      grid.append(svgNode('line', { x1: bounds.left, x2: bounds.right, y1: y(value), y2: y(value), stroke: '#ffffff', 'stroke-opacity': '.1' }));
      grid.append(svgNode('text', { x: bounds.left - 15, y: y(value) + 4, 'text-anchor': 'end' }, numbers.format(value)));
    }
    const dateTicks = compact ? 3 : 4;
    for (let i = 0; i < dateTicks; i++) {
      const time = start + (end - start) * i / (dateTicks - 1);
      grid.append(svgNode('text', { x: x(time), y: compact ? 242 : height - 10, 'text-anchor': i === 0 ? 'start' : i === dateTicks - 1 ? 'end' : 'middle' }, shortDate.format(new Date(time))));
    }
    $('chart-title').textContent = `${active.name} — historical values`;
    $('chart-description').textContent = `${points.length} observations, ${dates.format(new Date(start))} to ${dates.format(new Date(end))}. Unit: ${active.unit}. Lines connect recorded observations across calendar gaps. Use the observation slider to inspect dates and values.`;
    $('data-span').textContent = `${points.length} prices · ${spanDate.format(new Date(start))} — ${spanDate.format(new Date(end))}`;
    $('data-unit').textContent = active.unit;
    slider.max = String(points.length - 1);
    inspect(Number.isFinite(selectedIndex) ? selectedIndex : points.length - 1);
    window.dispatchEvent(new CustomEvent('engineering:chart-rendered', {
      detail: { points: points.map(point => ({ date: point.date, value: point.value, x: x(point.time), y: y(point.value) })), unit: active.unit }
    }));
  }
  slider.addEventListener('input', () => inspect(Number(slider.value)));
  select.addEventListener('change', () => render());
  window.addEventListener('engineering:layout', () => { if (active && !content.hidden) render(Number(slider.value)); });
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (active && !content.hidden) render(Number(slider.value));
    }, 100);
  }, { passive: true });
  function pointerInspect(event) {
    if (!active) return;
    const matrix = chart.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    const fraction = Math.max(0, Math.min(1, (point.x - bounds.left) / (bounds.right - bounds.left)));
    const time = active.points[0].time + fraction * (active.points[active.points.length - 1].time - active.points[0].time);
    let low = 0, high = active.points.length - 1;
    while (low < high) { const middle = Math.floor((low + high) / 2); if (active.points[middle].time < time) low = middle + 1; else high = middle; }
    if (low > 0 && time - active.points[low - 1].time < active.points[low].time - time) low--;
    inspect(low);
  }
  chart.addEventListener('pointermove', pointerInspect);
  chart.addEventListener('pointerdown', pointerInspect);
  // Milli's public widget endpoint, read live when the browser allows it (CORS);
  // otherwise the dated snapshot stored beside this page.
  const LIVE = 'https://milli.gold/api/v1/public/milli-price/widget';
  const RANGES = [['DAILY', 'Last 24 hours'], ['WEEKLY', 'Last 7 days'], ['MONTHLY', 'Last 30 days']];
  async function readLive() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(LIVE, { credentials: 'omit', signal: controller.signal });
      if (!response.ok) throw new Error('Live source unavailable');
      const json = await response.json();
      const prices = json && json.data && json.data.prices;
      if (!prices) throw new Error('Unexpected live response');
      return { live: true, as_of_utc: new Date().toISOString(), source_name: 'Milli public price widget', source_url: LIVE,
        assets: RANGES.map(([key, name]) => ({ name, unit: 'IRR per milligram', decimals: 0, timeZone: 'Asia/Tehran',
          points: (prices[key] || []).map(point => ({ date: new Date(point.timestamp).toISOString(), value: point.value })) })) };
    } finally { clearTimeout(timer); }
  }
  async function readSnapshot() {
    const response = await fetch('./milli-price.json', { credentials: 'omit' });
    if (!response.ok) throw new Error('Snapshot unavailable');
    const data = await response.json();
    (data.assets || []).forEach(asset => { asset.timeZone = 'Asia/Tehran'; });
    return data;
  }
  async function load() {
    try {
      let data;
      try { data = await readLive(); } catch (_) { data = await readSnapshot(); }
      if (!data || !Array.isArray(data.assets) || typeof data.source_name !== 'string' || !Number.isFinite(Date.parse(data.as_of_utc))) throw new Error('Invalid snapshot');
      const url = safeLink(data.source_url);
      assets = data.assets.map(cleanAsset).filter(Boolean);
      if (!assets.length) throw new Error('No valid series');
      assets.forEach((asset, index) => {
        const option = document.createElement('option'); option.value = String(index); option.textContent = asset.name; select.append(option);
      });
      $('data-source').textContent = data.source_name;
      $('data-source').href = url;
      active = assets[0];
      $('data-asof').textContent = data.live ? `Live · read ${dates.format(new Date(data.as_of_utc))}` : `Snapshot retrieved ${dates.format(new Date(data.as_of_utc))}`;
      $('data-mode').textContent = data.live ? 'Live · public API' : 'Snapshot · not live';
      document.querySelector('.market-panel')?.classList.toggle('is-live', !!data.live);
      status.hidden = true; content.hidden = false;
      render();
    } catch (_) {
      content.hidden = true; status.hidden = false;
      status.textContent = 'The historical data source is unavailable in this view. The chart is hidden until its sourced snapshot can be loaded.';
    }
  }
  load();
})();
