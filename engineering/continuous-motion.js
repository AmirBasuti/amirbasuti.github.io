import { createFilmCopy } from '../film-copy.js?v=20261022h';
import { createObservationScene, createMechanismScene } from './continuous-scene.js?v=20261022h';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const scrollLayout = window.matchMedia('(min-width: 960px) and (min-height: 760px) and (prefers-reduced-motion: no-preference)');
const clamp = value => Math.max(0, Math.min(1, value));
const items = [];
let frame = 0, lastFrame = 0;

function requestFrame() {
  if (frame || document.hidden) return;
  frame = requestAnimationFrame(tick);
}
function setPlayLabel(item, label = 'Play the sequence') {
  item.play.textContent = reduced.matches ? 'Next view' : label;
}
function makeItem(element, type) {
  const item = {
    element, type, scene: null, near: false, progress: 1, target: 1,
    manual: false, playing: false, playStart: 0, playFrom: 0,
    duration: type === 'observations' ? 9000 : 6500,
    track: element.querySelector('[data-sequence-track]'),
    sticky: element.querySelector('[data-sequence-sticky]'),
    play: element.querySelector('[data-sequence-play]'),
    scrub: element.querySelector('[data-sequence-scrub]'),
    follow: element.querySelector('[data-sequence-follow]')
  };
  item.copy = createFilmCopy(element.querySelector('[data-sequence-copy]'), { reduced: () => reduced.matches, requestFrame });
  setPlayLabel(item);
  item.play.addEventListener('click', () => {
    if (item.playing) {
      item.playing = false;
      item.target = item.progress;
      setPlayLabel(item, 'Resume sequence');
    } else {
      ensureScene(item);
      item.manual = true;
      item.follow.hidden = false;
      if (reduced.matches) {
        item.progress = item.target = [.48, 1, 0][stage(item)];
        setPlayLabel(item);
        render(item, performance.now(), true);
      } else {
        item.playFrom = item.progress > .995 ? 0 : item.progress;
        item.progress = item.target = item.playFrom;
        item.playStart = performance.now();
        item.playing = true;
        setPlayLabel(item, 'Pause sequence');
        requestFrame();
      }
    }
  });
  item.scrub.addEventListener('input', () => {
    ensureScene(item);
    item.manual = true; item.playing = false;
    item.follow.hidden = false;
    setPlayLabel(item);
    item.target = Number(item.scrub.value) / 1000;
    if (reduced.matches) item.progress = item.target;
    requestFrame();
  });
  item.follow.addEventListener('click', () => {
    item.manual = false; item.playing = false;
    item.follow.hidden = true; setPlayLabel(item);
    requestFrame();
  });
  if (type === 'observations') {
    const finish = () => {
      if (!item.scene || item.progress >= .999) return;
      item.manual = true; item.playing = false;
      item.progress = item.target = 1;
      item.follow.hidden = false;
      setPlayLabel(item, 'Replay the sequence');
      render(item, performance.now(), reduced.matches);
      requestFrame();
    };
    // Complete the reveal before the chart's own handlers inspect a real observation.
    element.querySelector('[data-observation-art]').addEventListener('pointerdown', finish, { capture: true });
    element.querySelector('#date-range').addEventListener('focus', finish);
    element.querySelector('#asset-select').addEventListener('focus', finish);
  }
  items.push(item);
  return item;
}
function ensureScene(item) {
  if (item.scene) return;
  item.element.classList.add('sequence-ready');
  if (item.type === 'observations') {
    item.element.classList.toggle('pipeline-enhanced', scrollLayout.matches);
    item.scene = createObservationScene(item.element.querySelector('#price-chart'), requestFrame);
  } else {
    item.scene = createMechanismScene(item.element.querySelector('[data-trace-surface]'), item.type);
  }
  if (!item.manual) item.progress = item.target = scrollPosition(item);
  item.scene.render(item.progress);
  render(item, performance.now(), true);
}
function scrollPosition(item) {
  if (!scrollLayout.matches) return 1;
  if (item.track) {
    const travel = Math.max(1, item.track.offsetHeight - item.sticky.offsetHeight);
    return clamp(-item.track.getBoundingClientRect().top / travel);
  }
  return clamp((window.innerHeight * .86 - item.element.getBoundingClientRect().top) / (window.innerHeight * .7));
}
function stage(item) {
  const p = item.progress;
  if (item.type === 'reconnect') return p < .28 ? 0 : p < .56 ? 1 : 2;
  if (item.type === 'history') return p < .22 ? 0 : p < .55 ? 1 : 2;
  if (item.type === 'migration') return p < .26 ? 0 : p < .69 ? 1 : 2;
  return p < .34 ? 0 : p < .68 ? 1 : 2;
}
function render(item, now, immediate = false) {
  item.scene?.render(item.progress);
  item.copy.set(stage(item), { immediate });
  item.scrub.value = String(Math.round(item.progress * 1000));
  item.scrub.setAttribute('aria-valuetext', `${Math.round(item.progress * 100)} percent, stage ${stage(item) + 1} of 3`);
  return item.copy.tick(now);
}
function tick(now) {
  frame = 0;
  if (document.hidden) return;
  const elapsed = Math.min(50, lastFrame ? now - lastFrame : 16);
  lastFrame = now;
  let busy = false;
  items.forEach(item => {
    if (!item.near) return;
    const rect = (item.sticky || item.element).getBoundingClientRect();
    const visible = rect.bottom > 0 && rect.top < window.innerHeight;
    if (!visible) {
      if (item.playing) { item.playing = false; item.target = item.progress; setPlayLabel(item, 'Resume sequence'); }
      return;
    }
    ensureScene(item);
    if (item.playing) {
      item.target = clamp(item.playFrom + (now - item.playStart) / item.duration);
      item.progress = item.target;
      if (item.target >= 1) { item.playing = false; setPlayLabel(item, 'Replay the sequence'); }
    } else if (!item.manual) item.target = scrollPosition(item);
    if (reduced.matches) item.progress = item.target;
    else item.progress += (item.target - item.progress) * (1 - Math.exp(-elapsed / 90));
    if (Math.abs(item.target - item.progress) < .0004) item.progress = item.target;
    const copyBusy = render(item, now);
    if (item.playing || item.target !== item.progress || copyBusy) busy = true;
  });
  if (busy) requestFrame(); else lastFrame = 0;
}

const main = document.querySelector('[data-data-film]');
if (main) makeItem(main, 'observations');
document.querySelectorAll('[data-mechanism]').forEach(element => makeItem(element, element.dataset.mechanism));
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const item = items.find(candidate => candidate.element === entry.target);
      if (!item) return;
      item.near = entry.isIntersecting;
      if (item.near) ensureScene(item);
      else if (item.playing) { item.playing = false; item.target = item.progress; setPlayLabel(item, 'Resume sequence'); }
    });
    requestFrame();
  }, { rootMargin: '200px 0px' });
  items.forEach(item => observer.observe(item.element));
} else items.forEach(item => { item.near = true; ensureScene(item); });

function refreshLayout() {
  items.forEach(item => {
    if (!item.scene) return;
    if (item.type === 'observations') item.element.classList.toggle('pipeline-enhanced', scrollLayout.matches);
    item.scene.resize?.();
    if (!scrollLayout.matches && !item.manual) item.progress = item.target = 1;
  });
  window.dispatchEvent(new Event('engineering:layout'));
  requestFrame();
}
window.addEventListener('scroll', requestFrame, { passive: true });
window.addEventListener('resize', refreshLayout, { passive: true });
scrollLayout.addEventListener('change', refreshLayout);
reduced.addEventListener('change', () => {
  items.forEach(item => { item.playing = false; setPlayLabel(item); });
  refreshLayout();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (frame) cancelAnimationFrame(frame);
    frame = 0; lastFrame = 0;
    items.forEach(item => { if (item.playing) { item.playing = false; item.target = item.progress; setPlayLabel(item, 'Resume sequence'); } });
  } else requestFrame();
});
