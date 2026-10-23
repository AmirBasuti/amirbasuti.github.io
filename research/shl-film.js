import { createFilmCopy } from '../film-copy.js?v=20261022h';

const clamp = n => Math.max(0, Math.min(1, n));
const smooth = n => { n = clamp(n); return n * n * (3 - 2 * n); };
const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)');

for (const film of document.querySelectorAll('[data-shl-film], [data-film="fog"]')) {
  const kind = film.dataset.film === 'fog' ? 'fog' : 'shl';
  const track = film.querySelector('.shl-film-track');
  const sticky = film.querySelector('.shl-film-sticky');
  const host = film.querySelector('[data-film-canvas]');
  const copies = [...film.querySelectorAll('[data-film-copy]')];
  const copyLabels = copies.map(copy => {
    const heading = copy.querySelector('h3').cloneNode(true);
    heading.querySelectorAll('br').forEach(br => br.replaceWith(' '));
    return heading.textContent.replace(/\s+/g, ' ').trim();
  });
  const result = film.querySelector('[data-film-result]');
  const play = film.querySelector('[data-film-play]');
  const scrub = film.querySelector('[data-film-scrub]');
  const follow = film.querySelector('[data-film-follow]');
  let scene, loading, frame = 0, current = 0, target = 0, previous = 0;
  let visible = false, manual = false, playing = false, reduced = false, lastRendered = -1, failed = false;
  const copyTransition = createFilmCopy(film.querySelector('.shl-film-copy'), { reduced: () => reduced, requestFrame });
  film.classList.add('is-enhanced');

  function updateMotionPreference() {
    reduced = prefersReduced.matches || document.documentElement.dataset.motion === 'off' || document.body.dataset.motion === 'off';
    film.classList.toggle('is-static', reduced);
    if (reduced) { playing = false; play.textContent = 'Next view'; }
    else play.textContent = playing ? 'Pause sequence' : 'Play the sequence';
    requestFrame();
  }
  function getScrollProgress() {
    const style = getComputedStyle(sticky);
    if (style.position !== 'sticky') return current;
    const top = parseFloat(style.top) || 0;
    const travel = track.offsetHeight - sticky.offsetHeight;
    return travel > 0 ? clamp((top - track.getBoundingClientRect().top) / travel) : current;
  }
  function updateCopy(p, immediate = false) {
    const active = kind === 'fog' ? (p < .18 ? 0 : p < .38 ? 1 : p < .64 ? 2 : p < .84 ? 3 : 4) : (p < .23 ? 0 : p < .56 ? 1 : p < .84 ? 2 : 3);
    copyTransition.set(active, { immediate });
    film.style.setProperty('--sequence-progress', String(p));
    const position = film.querySelector('[data-chapter-step]');
    if (position) position.textContent = `${String(active + 1).padStart(2, '0')} / ${String(copies.length).padStart(2, '0')}`;
    const reveal = smooth((p - .88) / .10);
    if (result) {
      result.style.opacity = reveal;
      result.style.transform = `translate(-50%, ${-45 - reveal * 5}%)`;
      result.setAttribute('aria-hidden', reveal < .5 ? 'true' : 'false');
    }
    scrub.value = Math.round(p * 1000);
    scrub.setAttribute('aria-valuetext', copyLabels[active]);
  }
  function render(time) {
    frame = 0;
    if (!visible || document.hidden || failed) { previous = 0; return; }
    const dt = Math.min((time - (previous || time - 16)) / 1000, .06);
    previous = time;
    if (playing) {
      target = Math.min(1, target + dt / (kind === 'fog' ? 12 : 13));
      if (target >= 1) { playing = false; play.textContent = 'Replay the sequence'; }
    } else if (!manual && !reduced) target = getScrollProgress();
    current = reduced ? target : current + (target - current) * (1 - Math.exp(-dt / .11));
    if (Math.abs(target - current) < .0001) current = target;
    if (current !== lastRendered) {
      scene?.render(current);
      updateCopy(current);
      lastRendered = current;
    }
    const copyMoving = copyTransition.tick(time);
    if (playing || copyMoving || Math.abs(target - current) >= .0001) requestFrame();
    else previous = 0;
  }
  function requestFrame() {
    if (!frame && visible && !document.hidden) frame = requestAnimationFrame(render);
  }
  function revealFrame() {
    const rect = sticky.getBoundingClientRect();
    const top = parseFloat(getComputedStyle(sticky).top) || 0;
    if (rect.top < top - 30 && rect.height < innerHeight) {
      scrollBy({ top: rect.top - top, behavior: reduced ? 'instant' : 'smooth' });
    }
  }
  async function initialize() {
    if (scene || loading) return;
    loading = true;
    try {
      const { createScene } = kind === 'fog' ? await import('./fog-scene.js?v=20261023l') : await import('./shl-scene.js?v=20261023b');
      scene = await createScene(host);
      film.classList.add('is-ready');
      lastRendered = -1;
      requestFrame();
    } catch (error) {
      host.replaceChildren();
      failed = true;
      film.classList.add('is-fallback');
      // Static text and the method remain available when WebGL is unavailable.
      current = target = 0; updateCopy(0, true);
      console.warn('The research illustration is using its static fallback.', error);
    }
  }
  const observer = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) { initialize(); requestFrame(); }
    else { playing = false; play.textContent = reduced ? 'Next view' : 'Play the sequence'; if (frame) cancelAnimationFrame(frame); frame = 0; previous = 0; }
  }, { rootMargin: '160px' });
  observer.observe(sticky);
  addEventListener('scroll', () => { if (!manual && !reduced && getComputedStyle(sticky).position === 'sticky') requestFrame(); }, { passive: true });
  const resizeObserver = new ResizeObserver(() => { scene?.resize(); lastRendered = -1; requestFrame(); });
  resizeObserver.observe(host);
  play.addEventListener('click', () => {
    revealFrame();
    manual = true;
    follow.hidden = false;
    if (reduced) {
      target = kind === 'fog'
        ? (current < .18 ? .27 : current < .38 ? .50 : current < .64 ? .74 : current < .84 ? 1 : 0)
        : (current < .25 ? .38 : current < .55 ? .65 : current < .9 ? 1 : 0);
      play.textContent = 'Next view';
    } else {
      playing = !playing;
      if (playing && target > .98) current = target = 0;
      play.textContent = playing ? 'Pause sequence' : 'Play the sequence';
    }
    requestFrame();
  });
  scrub.addEventListener('input', () => {
    revealFrame();
    manual = true; playing = false; follow.hidden = false;
    target = Number(scrub.value) / 1000;
    play.textContent = reduced ? 'Next view' : 'Play the sequence';
    requestFrame();
  });
  follow.addEventListener('click', () => {
    manual = false; playing = false; follow.hidden = true;
    play.textContent = reduced ? 'Next view' : 'Play the sequence';
    requestFrame();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { playing = false; play.textContent = reduced ? 'Next view' : 'Play the sequence'; } requestFrame(); });
  prefersReduced.addEventListener('change', updateMotionPreference);
  const motionObserver = new MutationObserver(updateMotionPreference);
  motionObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
  motionObserver.observe(document.body, { attributes: true, attributeFilter: ['data-motion'] });
  host.addEventListener('webglcontextlost', event => {
    event.preventDefault(); playing = false; failed = true;
    film.classList.add('is-fallback');
    current = target = 0; updateCopy(0, true);
  }, true);
  host.addEventListener('webglcontextrestored', () => {
    scene?.dispose(); scene = null; loading = false; failed = false;
    film.classList.remove('is-fallback', 'is-ready'); initialize();
  }, true);
  updateMotionPreference();
  updateCopy(0);
}

