import { createFilmCopy } from './film-copy.js?v=20261022h';

// Two discrete reading views, driven by native scroll. The short temporal fade
// always settles and never cross-fades two text panels over one another.
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const roomy = matchMedia('(min-width: 700px) and (min-height: 680px)');
const motionAllowed = () => !reduced.matches && document.body.dataset.motion !== 'off';
const intros = [];
const chapters = [...document.querySelectorAll('[data-focus-chapter]')];
let frame = 0, layoutPending = true;

function requestFrame() {
  if (!frame && !document.hidden) frame = requestAnimationFrame(tick);
}
function progress(item) {
  const travel = Math.max(1, item.track.offsetHeight - item.sticky.offsetHeight);
  return -item.track.getBoundingClientRect().top / travel;
}
function syncAccess(item) {
  item.panels.forEach(panel => {
    const hidden = panel.getAttribute('aria-hidden') === 'true';
    if (hidden && panel.contains(document.activeElement)) item.sticky.focus({ preventScroll: true });
    panel.inert = hidden;
  });
  if (item.focusContent && item.content.getAttribute('aria-hidden') === 'false' && Number(item.content.style.opacity) >= .999) {
    item.focusContent = false;
    item.content.focus({ preventScroll: true });
  }
}
function setEnhanced(item, enabled) {
  if (enabled === Boolean(item.copy)) return;
  if (enabled) {
    item.panels.forEach(panel => panel.setAttribute('data-film-copy', ''));
    item.element.classList.add('focus-intro-ready');
    item.copy = createFilmCopy(item.sticky, { reduced: () => !motionAllowed(), requestFrame });
    item.copy.set(progress(item) >= .34 ? 1 : 0, { immediate: true });
    syncAccess(item);
  } else {
    item.copy.dispose();
    item.copy = null;
    item.element.classList.remove('focus-intro-ready');
    item.panels.forEach((panel, index) => {
      const original = item.originals[index];
      ['opacity', 'visibility', 'transform'].forEach(name => panel.style[name] = original.style[name]);
      if (original.aria === null) panel.removeAttribute('aria-hidden');
      else panel.setAttribute('aria-hidden', original.aria);
      if (!original.film) panel.removeAttribute('data-film-copy');
      panel.inert = original.inert;
    });
  }
}
function layout() {
  layoutPending = false;
  intros.forEach(item => {
    const fits = item.panels.every(panel => panel.scrollHeight <= innerHeight + 3);
    setEnhanced(item, motionAllowed() && roomy.matches && fits);
  });
  chapters.forEach(chapter => {
    chapter.classList.toggle('focus-chapter-ready', motionAllowed());
    updateChapter(chapter);
  });
}
function updateChapter(chapter) {
  const rect = chapter.getBoundingClientRect();
  chapter.classList.toggle('focus-chapter-present', rect.bottom > 0 && rect.top < innerHeight);
}
function tick(now) {
  frame = 0;
  if (document.hidden) return;
  if (layoutPending) layout();
  let busy = false;
  intros.forEach(item => {
    if (!item.copy) return;
    const rect = item.track.getBoundingClientRect();
    const visible = rect.bottom > 0 && rect.top < innerHeight;
    item.copy.set(progress(item) >= .34 ? 1 : 0, { immediate: !visible });
    busy = item.copy.tick(now) || busy;
    syncAccess(item);
  });
  if (busy) requestFrame();
}
function contentPosition(item) {
  const travel = Math.max(1, item.track.offsetHeight - item.sticky.offsetHeight);
  return scrollY + item.track.getBoundingClientRect().top + travel * .64;
}
function advance(item, { smooth = true, focus = true } = {}) {
  item.focusContent = focus;
  if (item.copy) {
    scrollTo({ top: contentPosition(item), behavior: smooth && motionAllowed() ? 'smooth' : 'instant' });
    if (!smooth) { item.copy.set(1, { immediate: true }); syncAccess(item); }
    requestFrame();
  } else {
    item.content.scrollIntoView({ behavior: smooth && motionAllowed() ? 'smooth' : 'instant', block: 'start' });
    if (focus) item.content.focus({ preventScroll: true });
    item.focusContent = false;
  }
}
function hashTarget() {
  try { return document.getElementById(decodeURIComponent(location.hash.slice(1))); }
  catch { return null; }
}
function resolveHash({ initial = false } = {}) {
  const target = hashTarget();
  if (!target) return;
  intros.forEach(item => {
    if (target === item.content || item.content.contains(target)) advance(item, { smooth: false, focus: !initial });
  });
}

document.querySelectorAll('[data-focus-intro]').forEach(element => {
  const track = element.querySelector('.focus-intro-track');
  const sticky = element.querySelector('.focus-intro-sticky');
  const identity = element.querySelector('[data-focus-panel="identity"]');
  const content = element.querySelector('[data-focus-panel="content"]');
  if (!track || !sticky || !identity || !content) return;
  const panels = [identity, content];
  const item = { element, track, sticky, content, panels, copy: null, focusContent: false,
    originals: panels.map(panel => ({
      aria: panel.getAttribute('aria-hidden'), film: panel.hasAttribute('data-film-copy'), inert: panel.inert,
      style: { opacity: panel.style.opacity, visibility: panel.style.visibility, transform: panel.style.transform }
    }))
  };
  if (!content.hasAttribute('tabindex')) content.tabIndex = -1;
  if (!sticky.hasAttribute('tabindex')) sticky.tabIndex = -1;
  element.querySelectorAll('[data-focus-advance]').forEach(link => link.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const href = link.getAttribute('href');
    if (href?.startsWith('#')) history.pushState(null, '', href);
    advance(item);
  }));
  intros.push(item);
});

const chapterObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
  entries.forEach(entry => entry.target.classList.toggle('focus-chapter-present', entry.isIntersecting));
}, { threshold: 0 }) : null;
chapters.forEach(chapter => {
  chapterObserver?.observe(chapter);
  chapter.addEventListener('focusin', () => chapter.classList.add('focus-chapter-present'));
});
function refresh() { layoutPending = true; requestFrame(); }
addEventListener('scroll', () => {
  if (!chapterObserver) chapters.forEach(updateChapter);
  requestFrame();
}, { passive: true });
addEventListener('resize', refresh, { passive: true });
addEventListener('hashchange', () => resolveHash());
addEventListener('popstate', () => resolveHash());
reduced.addEventListener('change', refresh);
roomy.addEventListener('change', refresh);
new MutationObserver(refresh).observe(document.body, { attributes: true, attributeFilter: ['data-motion'] });
document.addEventListener('visibilitychange', () => {
  if (document.hidden && frame) { cancelAnimationFrame(frame); frame = 0; }
  else requestFrame();
});
layout();
resolveHash({ initial: true });
requestFrame();
document.fonts?.ready.then(refresh);
