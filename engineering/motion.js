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
