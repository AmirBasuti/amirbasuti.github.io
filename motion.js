(() => {
  'use strict';
  const toggle = document.querySelector('.motion-toggle');
  if (!toggle) return;
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  let preference;
  try { preference = localStorage.getItem('ab-motion'); } catch {}
  let enabled = !media.matches && preference !== 'off';
  function sync() {
    document.body.dataset.motion = enabled ? 'on' : 'off';
    document.documentElement.dataset.motion = enabled ? 'on' : 'off';
    toggle.setAttribute('aria-label', enabled ? 'Pause motion' : 'Enable motion');
    toggle.setAttribute('aria-pressed', String(!enabled));
    toggle.querySelector('.motion-icon').textContent = enabled ? 'Ⅱ' : '▷';
    toggle.querySelector('.motion-label').textContent = enabled ? 'Motion on' : 'Motion off';
    if (!enabled) document.querySelectorAll('.reveal').forEach(e => e.classList.add('is-visible'));
  }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      entry.target.classList.add('is-visible'); observer.unobserve(entry.target);
    }
  }, { threshold: .06 });
  document.querySelectorAll('.reveal').forEach(e => observer.observe(e));
  toggle.addEventListener('click', () => {
    enabled = !enabled && !media.matches;
    preference = enabled ? 'on' : 'off';
    try { localStorage.setItem('ab-motion', preference); } catch {}
    sync();
  });
  media.addEventListener('change', () => { enabled = !media.matches && preference !== 'off'; sync(); });
  document.body.classList.add('motion-ready'); toggle.hidden = false; sync();
})();
