// Native scrolling: finish one reading view before revealing the next.
// No scroll interception, snapping, cloned content, or permanent render loop.
const preference = matchMedia('(prefers-reduced-motion: reduce)');
const frames = [];
let frame = 0, focusedVisual = null, active = null, desired = null;
let phase = 'idle', started = 0, opacity = 1, from = 1, wasEnabled = false;
const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => { value = clamp(value); return value * value * (3 - 2 * value); };
const allowed = () => !preference.matches && document.documentElement.dataset.motion !== 'off' && document.body.dataset.motion !== 'off';

function register(owner, visual, when = () => true) {
  if (!owner || !visual) return;
  visual.setAttribute('data-chapter-visual', '');
  frames.push({ owner, visual, when });
}
document.querySelectorAll('[data-focus-intro]').forEach(intro => {
  const enhanced = () => intro.classList.contains('focus-intro-ready');
  register(intro.querySelector('.focus-intro-track'), intro.querySelector('.focus-intro-sticky'), enhanced);
  intro.querySelectorAll('[data-focus-panel]').forEach(panel => register(panel, panel, () => !enhanced()));
});
document.querySelectorAll('[data-focus-chapter]').forEach(chapter => register(chapter, chapter.querySelector('[data-focus-chapter-inner]')));
document.querySelectorAll('.shl-film-track').forEach(track => register(track, track.querySelector('.shl-film-sticky')));
document.querySelectorAll('.journey-track').forEach(track => register(track, track.querySelector('.lab')));
document.querySelectorAll('.data-film-track').forEach(track => register(track, track.querySelector('.data-film-sticky')));
document.querySelectorAll('.case-hero').forEach(hero => register(hero, hero));
document.querySelectorAll('.method-section, .paper-section, .research-section, .papers-section, .craft-section, .contact-section, .engineering-case').forEach(section => register(section, section));

// A small position cue makes pinned animation travel visible without another
// navigation rail. Its values come from each scene's existing controller.
document.querySelectorAll('.shl-film, [data-data-film]').forEach(scene => {
  const controls = scene.querySelector('.shl-film-controls, [data-sequence-controls]');
  if (!controls) return;
  const position = document.createElement('div');
  position.className = 'chapter-position';
  position.setAttribute('aria-hidden', 'true');
  position.innerHTML = '<span data-chapter-step></span><span class="chapter-meter"><i></i></span>';
  controls.before(position);
});

function show(item, value) {
  if (!item) return;
  item.visual.style.setProperty('--chapter-opacity', value.toFixed(3));
  item.visual.classList.toggle('chapter-visual-hidden', value < .01);
}
function paint(now) {
  frame = 0;
  if (document.hidden) return;
  const enabled = allowed(), height = innerHeight;
  let candidate = null;
  frames.forEach(item => {
    const rect = item.owner.getBoundingClientRect();
    const enhanced = enabled && item.when() && rect.height >= height * .8;
    item.visual.classList.toggle('chapter-visual-ready', enhanced);
    if (!enhanced) show(item, 1);
    else {
      if (rect.top <= height * .5 && rect.bottom > height * .5) candidate = item;
      if (item !== active) show(item, 0);
    }
  });
  if (!enabled) {
    active = desired = null; phase = 'idle'; wasEnabled = false;
    return;
  }
  desired = focusedVisual || candidate;
  if (!wasEnabled) {
    active = desired; opacity = 1; show(active, 1); wasEnabled = true;
    return;
  }
  // A short temporal handoff always completes after the wheel/trackpad stops.
  // The next view starts entering only after the outgoing view reaches zero.
  if (!active && desired && phase === 'idle') {
    active = desired; opacity = 0; phase = 'in'; started = now;
  }
  if ((phase === 'idle' || phase === 'in') && desired !== active) {
    phase = 'out'; started = now; from = opacity;
  }
  if (phase === 'out') {
    const t = clamp((now - started) / 140);
    opacity = from * (1 - smooth(t)); show(active, opacity);
    if (t === 1) {
      show(active, 0); active = desired; opacity = 0;
      phase = active ? 'in' : 'idle'; started = now;
    }
  } else if (phase === 'in') {
    const t = clamp((now - started) / 210);
    opacity = smooth(t); show(active, opacity);
    if (t === 1) { phase = 'idle'; opacity = 1; }
  } else show(active, 1);
  if (phase !== 'idle') request();
}
function request() {
  if (!frame && !document.hidden) frame = requestAnimationFrame(paint);
}
addEventListener('scroll', () => { focusedVisual = null; request(); }, { passive: true });
addEventListener('resize', request, { passive: true });
addEventListener('hashchange', request);
document.addEventListener('focusin', event => {
  focusedVisual = frames.find(item => item.when() && item.visual.contains(event.target)) || null;
  request();
});
document.addEventListener('visibilitychange', request);
preference.addEventListener('change', request);
const settings = new MutationObserver(request);
[document.documentElement, document.body].forEach(element => settings.observe(element, { attributes: true, attributeFilter: ['data-motion'] }));
// The scene controllers expand their native scroll tracks at module startup.
// Resolve an explicit initial anchor after that layout, so it cannot land in
// the preceding project when the tracks grow. Respect any user scroll/input.
const initialHash = location.hash;
let interacted = false;
['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(type =>
  addEventListener(type, () => { interacted = true; }, { once: true, passive: true }));
document.fonts?.ready.then(() => requestAnimationFrame(() => {
  if (initialHash && initialHash === location.hash && !interacted) {
    let target;
    try { target = document.getElementById(decodeURIComponent(initialHash.slice(1))); } catch {}
    if (target && !target.matches('[data-focus-panel="content"]')) target.scrollIntoView({ block: 'start', behavior: 'instant' });
  }
  request();
}));
request();
