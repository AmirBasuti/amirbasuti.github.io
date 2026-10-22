(() => {
  'use strict';
  const story = document.getElementById('pipeline-story');
  if (!story) return;
  const viewport = window.matchMedia('(min-width: 900px) and (min-height: 670px) and (prefers-reduced-motion: no-preference)');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const panels = [...story.querySelectorAll('.pipeline-panel')];
  const chapters = [...story.querySelectorAll('[data-pipeline-stage]')];
  const packets = [...story.querySelectorAll('.ingress-packet')];
  const slider = document.getElementById('pipeline-progress');
  const follow = document.getElementById('pipeline-follow');
  const label = document.getElementById('pipeline-stage-label');
  const layerButton = document.getElementById('pipeline-layers');
  const recordPanel = document.getElementById('pipeline-records');
  const stageNames = ['01 / Ingest — different inputs, explicit origins', '02 / Structure — typed records, clear boundaries', '03 / Explore — the sourced historical snapshot'];
  let enabled = false, visible = true, following = true, frame = 0, current = 0, activeStage = -1;
  let start = 0, travel = 1;
  const clamp = n => Math.max(0, Math.min(1, n));
  const smooth = (a, b, n) => { const t = clamp((n - a) / (b - a)); return t * t * (3 - 2 * t); };

  function paint(progress) {
    current = clamp(progress);
    const intoRecords = smooth(.12, .39, current);
    const intoPlot = smooth(.53, .79, current);
    const ingressOpacity = 1 - smooth(.19, .36, current);
    const recordsOpacity = smooth(.20, .37, current) * (1 - smooth(.60, .76, current));
    const plotOpacity = smooth(.61, .78, current);
    panels[0].style.opacity = ingressOpacity.toFixed(3);
    panels[0].style.transform = `translate3d(${-150 * intoRecords}px,${-30 * intoRecords}px,0) rotateY(${-15 * intoRecords}deg) scale(${1 - .12 * intoRecords})`;
    panels[1].style.opacity = recordsOpacity.toFixed(3);
    panels[1].style.transform = `translate3d(${150 * (1 - intoRecords) - 125 * intoPlot}px,${30 * (1 - intoRecords) - 15 * intoPlot}px,0) rotateY(${12 * (1 - intoRecords) - 12 * intoPlot}deg) scale(${.87 + .13 * intoRecords - .10 * intoPlot})`;
    panels[2].style.opacity = plotOpacity.toFixed(3);
    panels[2].style.transform = `translate3d(${70 * (1 - intoPlot)}px,${58 * (1 - intoPlot)}px,0) rotateX(${10 * (1 - intoPlot)}deg) scale(${.83 + .17 * intoPlot})`;
    const packetProgress = smooth(0, .32, current);
    packets.forEach((packet, index) => {
      const direction = index % 2 ? 1 : -1;
      packet.style.translate = `${packetProgress * (110 + index * 9)}px ${direction * packetProgress * 26}px`;
      packet.style.rotate = `${direction * packetProgress * 8}deg`;
    });
    story.style.setProperty('--plot-reveal', smooth(.68, .96, current).toFixed(4));
    story.style.setProperty('--plot-cursor', smooth(.92, 1, current).toFixed(4));
    slider.value = String(Math.round(current * 100));
    const stage = current < .29 ? 0 : current < .69 ? 1 : 2;
    slider.setAttribute('aria-valuetext', `${Math.round(current * 100)} percent. ${stageNames[stage]}`);
    if (stage !== activeStage) {
      activeStage = stage;
      label.textContent = stageNames[stage];
      panels.forEach((panel, index) => {
        panel.inert = index !== stage;
        panel.setAttribute('aria-hidden', String(index !== stage));
        panel.style.pointerEvents = index === stage ? '' : 'none';
      });
      chapters.forEach((button, index) => button.setAttribute('aria-pressed', String(index === stage)));
    }
  }

  function measure() {
    const heading = story.querySelector('.pipeline-heading');
    const storyTop = story.getBoundingClientRect().top + window.scrollY;
    start = heading.getBoundingClientRect().bottom + window.scrollY + parseFloat(getComputedStyle(heading).marginBottom);
    travel = Math.max(1, story.offsetHeight - story.querySelector('.pipeline-sticky').offsetHeight - (start - storyTop));
  }
  function requestPaint() {
    if (!enabled || !visible || !following || frame || document.hidden) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (enabled && visible && following) paint((window.scrollY - start) / travel);
    });
  }
  function setFollowing(value) {
    following = value;
    follow.setAttribute('aria-pressed', String(!value));
    follow.textContent = value ? 'Pause scroll' : 'Follow scroll';
    follow.setAttribute('aria-label', value ? 'Pause the scroll-driven scene' : 'Resume the scroll-driven scene');
    if (value) requestPaint();
  }
  function manual(progress) {
    if (!enabled) return;
    setFollowing(false);
    paint(progress);
  }
  function configure() {
    enabled = viewport.matches;
    story.classList.toggle('pipeline-enhanced', enabled);
    story.classList.toggle('pipeline-interactive', !reduced.matches);
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    if (enabled) {
      measure();
      activeStage = -1;
      if (following) paint((window.scrollY - start) / travel); else paint(current);
    } else {
      panels.forEach(panel => {
        panel.removeAttribute('style');
        panel.removeAttribute('aria-hidden');
        panel.inert = false;
      });
      packets.forEach(packet => packet.removeAttribute('style'));
      story.style.removeProperty('--plot-reveal');
      story.style.removeProperty('--plot-cursor');
    }
    window.dispatchEvent(new Event('engineering:layout'));
  }

  chapters.forEach(button => button.addEventListener('click', () => manual(Number(button.dataset.pipelineStage))));
  slider.addEventListener('input', () => manual(Number(slider.value) / 100));
  follow.addEventListener('click', () => setFollowing(!following));
  layerButton.addEventListener('click', () => {
    const separated = layerButton.getAttribute('aria-pressed') !== 'true';
    layerButton.setAttribute('aria-pressed', String(separated));
    layerButton.textContent = separated ? 'Bring together' : 'Separate layers';
    recordPanel.classList.toggle('layers-separated', separated);
    if (enabled) setFollowing(false);
  });
  // Keyboard interaction pins the active panel, so scrolling cannot remove focus.
  panels.forEach(panel => panel.addEventListener('focusin', () => { if (enabled) setFollowing(false); }));
  window.addEventListener('scroll', requestPaint, { passive: true });
  window.addEventListener('resize', () => { if (enabled) { measure(); requestPaint(); } }, { passive: true });
  viewport.addEventListener('change', configure);
  reduced.addEventListener('change', configure);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && frame) { cancelAnimationFrame(frame); frame = 0; }
    else requestPaint();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      story.classList.toggle('pipeline-in-view', visible);
      if (!visible && frame) { cancelAnimationFrame(frame); frame = 0; }
      else requestPaint();
    }, { rootMargin: '80px 0px' }).observe(story);
  } else {
    story.classList.add('pipeline-in-view');
  }
  if ('ResizeObserver' in window) {
    new ResizeObserver(() => { if (enabled) { measure(); requestPaint(); } }).observe(document.querySelector('.hero'));
  }
  configure();
  window.addEventListener('load', () => { if (enabled) { measure(); requestPaint(); } }, { once: true });
})();

// These diagrams explain individual contributions; all records are illustrative.
// A single scheduled frame serves visible cards, and nothing runs while idle.
(() => {
  'use strict';
  const figures = [...document.querySelectorAll('[data-engineering-case]')];
  if (!figures.length) return;
  const motion = window.matchMedia('(min-width: 900px) and (prefers-reduced-motion: no-preference)');
  const clamp = value => Math.max(0, Math.min(1, value));
  const smooth = (a, b, value) => { const t = clamp((value - a) / (b - a)); return t * t * (3 - 2 * t); };
  let frame = 0;
  const cases = figures.map(figure => ({
    figure,
    type: figure.dataset.engineeringCase,
    slider: figure.querySelector('[data-case-progress]'),
    pause: figure.querySelector('[data-case-pause]'),
    status: figure.querySelector('[data-case-status]'),
    visible: false,
    manual: false,
    progress: 1,
    lastLabel: '',
    nodes: Object.fromEntries([...figure.querySelectorAll('[data-reconnect-route],[data-reconnect-fault],[data-reconnect-packet],[data-history-older],[data-history-window],[data-history-lens],[data-history-coarse],[data-history-fine],[data-migration-transfer],[data-migration-check]')].map(node => {
      const attribute = [...node.attributes].find(attr => attr.name.startsWith('data-'));
      return [attribute.name.replace('data-', ''), node];
    }))
  }));

  function paint(item, value) {
    const p = clamp(value), n = item.nodes;
    let label = '';
    item.progress = p;
    if (item.type === 'reconnect') {
      const recovering = p >= .28 && p < .78;
      const route = smooth(.42, .78, p);
      n['reconnect-route'].style.strokeDashoffset = String(1 - route);
      n['reconnect-fault'].setAttribute('opacity', String(smooth(.23, .32, p) * (1 - smooth(.52, .66, p))));
      let x, y;
      if (p < .28) { x = 148 + 65 * (p / .28); y = 130; }
      else if (p < .42) { x = 280; y = 179; }
      else if (p < .78) {
        const t = (p - .42) / .36;
        if (t < .2) { x = 280; y = 179 + 68 * t / .2; }
        else if (t < .8) { x = 280 - 195 * (t - .2) / .6; y = 247; }
        else { x = 85; y = 247 - 68 * (t - .8) / .2; }
      } else { x = 345 + 62 * (p - .78) / .22; y = 130; }
      n['reconnect-packet'].setAttribute('cx', x.toFixed(2));
      n['reconnect-packet'].setAttribute('cy', y.toFixed(2));
      n['reconnect-packet'].setAttribute('opacity', recovering && p < .42 ? '.35' : '1');
      label = p < .28 ? 'Read responses' : p < .42 ? 'Timeout detected' : p < .78 ? 'Clean up & reconnect' : 'Resume reading';
    } else if (item.type === 'history') {
      const zoom = smooth(.06, .48, p), pan = smooth(.50, .96, p);
      const width = 345 - 195 * zoom;
      const x = 162 + 106 * zoom - 227 * pan;
      n['history-window'].setAttribute('x', x.toFixed(2));
      n['history-window'].setAttribute('width', width.toFixed(2));
      n['history-lens'].setAttribute('d', `M${x.toFixed(2)} 143L65 197M${(x + width).toFixed(2)} 143L495 197`);
      n['history-fine'].setAttribute('opacity', zoom.toFixed(3));
      n['history-coarse'].setAttribute('opacity', (1 - zoom).toFixed(3));
      n['history-older'].setAttribute('opacity', smooth(.57, .89, p).toFixed(3));
      label = p < .18 ? 'Broad time range' : p < .50 ? 'Request finer detail' : p < .9 ? 'Retrieve older history' : 'Earlier history loaded';
    } else if (item.type === 'migration') {
      const transfer = smooth(.12, .78, p);
      const x = 148 + 264 * transfer;
      const y = 75 - 40 * Math.sin(transfer * Math.PI);
      n['migration-transfer'].setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
      n['migration-check'].style.strokeDashoffset = String(1 - smooth(.78, .98, p));
      label = p < .25 ? 'Read decimal value' : p < .68 ? 'Apply schema change' : p < .88 ? 'Keep a typed contract' : 'Value preserved';
    }
    item.slider.value = String(Math.round(p * 100));
    item.slider.setAttribute('aria-valuetext', `${Math.round(p * 100)} percent. ${label}`);
    if (label !== item.lastLabel) { item.status.textContent = label; item.lastLabel = label; }
  }
  function setManual(item, manual) {
    item.manual = manual;
    item.pause.textContent = manual ? 'Follow scroll' : 'Pause scroll';
    item.pause.setAttribute('aria-pressed', String(manual));
  }
  function schedule() {
    if (frame || !motion.matches || document.hidden || !cases.some(item => item.visible && !item.manual)) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!motion.matches || document.hidden) return;
      cases.forEach(item => {
        if (!item.visible || item.manual) return;
        const top = item.figure.getBoundingClientRect().top;
        paint(item, (window.innerHeight * .87 - top) / (window.innerHeight * .7));
      });
    });
  }
  function configure() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    cases.forEach(item => {
      item.figure.classList.toggle('case-motion-ready', motion.matches);
      if (!motion.matches) { setManual(item, false); paint(item, 1); }
    });
    schedule();
  }
  cases.forEach(item => {
    item.slider.addEventListener('input', () => {
      setManual(item, true);
      paint(item, Number(item.slider.value) / 100);
    });
    item.pause.addEventListener('click', () => { setManual(item, !item.manual); schedule(); });
  });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const item = cases.find(candidate => candidate.figure === entry.target);
        if (item) item.visible = entry.isIntersecting;
      });
      schedule();
    }, { rootMargin: '40px 0px' });
    cases.forEach(item => observer.observe(item.figure));
  } else {
    cases.forEach(item => { item.visible = true; });
  }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  motion.addEventListener('change', configure);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && frame) { cancelAnimationFrame(frame); frame = 0; }
    else schedule();
  });
  configure();
})();
