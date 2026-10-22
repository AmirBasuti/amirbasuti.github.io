// Temporal transitions finish even when scrolling stops exactly at a chapter edge.
// Only one article is visible at once; the caller owns the demand-render loop.
export function createFilmCopy(container, { reduced = () => false, requestFrame = () => {} } = {}) {
  const articles = [...container.querySelectorAll('[data-film-copy]')];
  let current = 0, desired = 0, phase = 'idle', started = 0;
  let opacity = 1, from = 1, disposed = false;
  const ease = n => { n = Math.max(0, Math.min(1, n)); return n * n * (3 - 2 * n); };
  function paint(index, value, offset) {
    const article = articles[index];
    if (!article) return;
    article.style.opacity = String(value);
    article.style.visibility = value > .001 ? 'visible' : 'hidden';
    article.style.transform = `translateY(${offset}px)`;
  }
  function select(index) {
    articles.forEach((article, i) => {
      article.setAttribute('aria-hidden', String(i !== index));
      if (i !== index) paint(i, 0, 0);
    });
  }
  function snap(index) {
    current = desired = index; phase = 'idle'; opacity = 1;
    select(current); paint(current, 1, 0);
  }
  function begin(next) {
    phase = next; started = performance.now(); from = opacity;
    requestFrame();
  }
  function set(index, { immediate = false } = {}) {
    if (disposed || !articles.length) return;
    desired = Math.max(0, Math.min(articles.length - 1, index));
    if (immediate || reduced()) { snap(desired); return; }
    if (phase === 'idle' && desired !== current) begin('out');
    else if (phase === 'in' && desired !== current) begin('out');
    else if (phase === 'out' && desired === current) begin('in');
  }
  function tick(now) {
    if (disposed || !articles.length) return false;
    if (reduced()) { if (phase !== 'idle' || desired !== current) snap(desired); return false; }
    if (phase === 'idle') return false;
    const duration = phase === 'out' ? 160 * Math.max(.25, from) : 230;
    const t = Math.max(0, Math.min(1, (now - started) / duration));
    if (phase === 'out') {
      opacity = from * (1 - ease(t));
      paint(current, opacity, -8 * (1 - opacity));
      if (t === 1) {
        paint(current, 0, 0);
        current = desired; select(current); opacity = 0; from = 0;
        paint(current, 0, 8); phase = 'in'; started = now;
      }
    } else {
      opacity = from + (1 - from) * ease(t);
      paint(current, opacity, 8 * (1 - opacity));
      if (t === 1) { opacity = 1; phase = 'idle'; paint(current, 1, 0); }
    }
    return phase !== 'idle';
  }
  snap(0);
  return { set, tick, dispose() { disposed = true; } };
}
