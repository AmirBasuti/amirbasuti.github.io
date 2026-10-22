/* Scroll-driven SHL method illustrations; signal traces are schematic. */
(() => {
  const story = document.querySelector('.signal-story');
  const scenes = [...document.querySelectorAll('[data-scene]')];
  const toggle = document.querySelector('.motion-toggle');
  if (!story || !scenes.length || !toggle || !window.matchMedia || !window.IntersectionObserver) return;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const wideScene = matchMedia('(min-width: 721px) and (min-height: 620px)');
  const buttons = [...document.querySelectorAll('[data-stage-target]')];
  const panels = [...document.querySelectorAll('.stage-detail')];
  const last = panels.length - 1;
  const label = document.querySelector('#visual-label');
  const code = document.querySelector('.legend-code');
  const progress = document.querySelector('.story-progress span');
  const labels = ['Smartphone sensing', 'Nine channels · five-second windows', 'Selected late-fusion system', 'Eight activity and transport modes'];
  const clamp = (value, low = 0, high = 1) => Math.min(high, Math.max(low, value));
  let preference = null;
  try { preference = localStorage.getItem('ab-motion'); } catch { /* Optional local preference. */ }
  let enabled = !reducedMotion.matches && preference !== 'off';
  let current = 0;
  let target = 0;
  let active = -1;
  let frame = 0;
  let visible = false;
  let dirty = true;
  let scrollPending = false;

  function syncPanels() {
    const selected = Math.min(last, Math.round(target));
    if (selected === active && !dirty) return;
    active = selected;
    buttons.forEach((button, index) => button.setAttribute('aria-pressed', String(index === active)));
    panels.forEach((panel, index) => { panel.hidden = enabled && wideScene.matches && index !== active; });
    label.textContent = labels[active];
    code.textContent = `0${active + 1} / 0${panels.length}`;
    document.querySelector('#scene-link').setAttribute('href', scenes[active].getAttribute('src'));
    progress.style.width = `${target / last * 100}%`;
  }

  function draw() {
    scenes.forEach((scene, index) => {
      const distance = Math.abs(current - index);
      scene.style.opacity = String(Math.max(0, 1 - distance));
      scene.style.transform = `translateY(${Math.min(1, distance) * 18}px) scale(${1 - Math.min(1, distance) * .025})`;
    });
  }

  function readScroll() {
    scrollPending = false;
    if (!enabled || !wideScene.matches) return;
    const rect = story.getBoundingClientRect();
    const travel = Math.max(1, rect.height - (innerHeight - 66));
    target = clamp((66 - rect.top) / travel) * last;
    dirty = true;
  }

  function tick() {
    frame = 0;
    if (scrollPending) readScroll();
    const difference = target - current;
    const animate = enabled && visible && !reducedMotion.matches;
    current = animate && Math.abs(difference) > .002 ? current + difference * .16 : target;
    syncPanels();
    draw();
    dirty = false;
    if (animate && Math.abs(target - current) > .002) frame = requestAnimationFrame(tick);
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(tick); }
  function refresh() { dirty = true; scrollPending = true; schedule(); }

  function setMotion() {
    document.body.dataset.motion = enabled ? 'on' : 'off';
    document.documentElement.dataset.motion = enabled ? 'on' : 'off';
    toggle.setAttribute('aria-pressed', String(!enabled));
    toggle.setAttribute('aria-label', enabled ? 'Pause motion' : 'Enable motion');
    toggle.querySelector('.motion-icon').textContent = enabled ? 'Ⅱ' : '▷';
    toggle.querySelector('.motion-label').textContent = enabled ? 'Pause motion' : 'Motion off';
    if (!enabled) {
      target = Math.round(target);
      current = target;
    }
    document.querySelectorAll('.reveal').forEach(element => {
      if (!enabled) element.classList.add('is-visible');
    });
    refresh();
  }

  document.body.classList.add('motion-ready');
  toggle.hidden = false;
  buttons.forEach(button => {
    button.disabled = false;
    button.addEventListener('click', () => {
      target = Number(button.dataset.stageTarget);
      dirty = true;
      if (enabled && wideScene.matches) {
        const top = scrollY + story.getBoundingClientRect().top;
        const travel = story.offsetHeight - (innerHeight - 66);
        scrollTo({ top: top - 66 + travel * target / last, behavior: 'smooth' });
      }
      schedule();
    });
  });
  toggle.addEventListener('click', () => {
    enabled = !enabled && !reducedMotion.matches;
    preference = enabled ? 'on' : 'off';
    try { localStorage.setItem('ab-motion', preference); } catch { /* Optional. */ }
    setMotion();
  });
  reducedMotion.addEventListener('change', () => {
    enabled = !reducedMotion.matches && preference !== 'off'; setMotion();
  });
  wideScene.addEventListener('change', refresh);
  addEventListener('resize', refresh, { passive: true });
  addEventListener('scroll', () => {
    if (!enabled || !wideScene.matches || !visible) return;
    scrollPending = true; schedule();
  }, { passive: true });
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) refresh();
  }, { rootMargin: '80px' }).observe(story);
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); revealObserver.unobserve(entry.target); }
    });
  }, { threshold: .08 });
  document.querySelectorAll('.reveal').forEach(element => revealObserver.observe(element));
  setMotion();
})();
