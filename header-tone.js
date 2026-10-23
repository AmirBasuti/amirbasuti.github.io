// The translucent header follows the ground beneath it: light over paper,
// dark over the clinical and contact chapters. Runs only on scroll/resize.
(() => {
  'use strict';
  const header = document.querySelector('.site-header');
  const dark = [...document.querySelectorAll('[data-tone="dark"]')];
  if (!header || !dark.length) return;
  const meta = document.querySelector('meta[name="theme-color"]');
  const light = meta?.content || '#f4f1eb';
  let frame = 0, current = null;
  function paint() {
    frame = 0;
    const line = header.offsetHeight * .6;
    const over = dark.some(section => {
      const rect = section.getBoundingClientRect();
      return rect.top <= line && rect.bottom > line;
    });
    if (over === current) return;
    current = over;
    header.classList.toggle('is-dark', over);
    if (meta) meta.content = over ? '#111a15' : light;
  }
  const request = () => { if (!frame) frame = requestAnimationFrame(paint); };
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', request, { passive: true });
  request();
})();
