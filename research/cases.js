/* Original schematic geometry. No recorded signals or model execution. */
(() => {
  'use strict';
  const clamp = (n, a = 0, b = 1) => Math.min(b, Math.max(a, n));
  const smooth = (n) => { const t = clamp(n); return t * t * (3 - 2 * t); };
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const stories = [];

  document.querySelectorAll('[data-case-story]').forEach((lab) => {
    const type = lab.dataset.caseStory;
    const buttons = [...lab.querySelectorAll('[data-stage]')];
    const range = lab.querySelector('[data-scrub]');
    const output = lab.querySelector('[data-progress]');
    const live = lab.querySelector('[data-announcement]');
    const notes = [...lab.parentElement.querySelectorAll('[data-stage-note]')];
    const svg = lab.querySelector('svg');
    const traces = [...svg.querySelectorAll('[data-signal]')];
    const paths = [...svg.querySelectorAll('[data-flow]')].map((path) => ({path, length:path.getTotalLength()}));
    const nodes = [...svg.querySelectorAll('[data-focus]')];
    const footprintGroups = [...svg.querySelectorAll('[data-footstep]')];
    const windowGroup = svg.querySelector('[data-window]');
    const cursor = svg.querySelector('[data-cursor]');
    const track = svg.querySelector('[data-track]');
    const bars = [...svg.querySelectorAll('[data-bar]')];
    let progress = .12;
    let previousStage = -1;
    let manuallySet = false;
    let visible = true;

    const signalPath = (channel, p) => {
      const fog = type === 'fog';
      const y = fog ? 353 + channel * 29 : 118 + channel * 23;
      const x0 = fog ? 57 : 59;
      const width = fog ? 355 : 352;
      const phase = p * (fog ? 1.8 : 2.6);
      let d = '';
      for (let n = 0; n <= 140; n++) {
        const t = n / 140;
        const local = fog ? (Math.sin(t * 22 + channel * .8 + phase) * 5 + Math.sin(t * 59 + channel) * 2) : (Math.sin(t * (18 + channel * 2) + channel * .68 + phase) * 5.1 + Math.sin(t * 67 + channel * .9) * 1.6);
        const irregular = fog ? Math.exp(-Math.pow((t - .65) / .13, 2)) * Math.sin(t * 177 + channel) * (3 + smooth((p - .2) * 3) * 6) : 0;
        d += `${n ? 'L' : 'M'}${(x0 + t * width).toFixed(2)},${(y + local + irregular).toFixed(2)} `;
      }
      return d;
    };

    const render = (p, announce = false) => {
      progress = clamp(p);
      const stage = Math.min(3, Math.floor(progress * 4));
      range.value = String(Math.round(progress * 1000));
      range.setAttribute('aria-valuetext', `${buttons[stage].dataset.title}, ${Math.round(progress * 100)} percent`);
      output.textContent = `${String(stage + 1).padStart(2, '0')} / 04`;
      if (previousStage !== stage) {
        buttons.forEach((button, index) => button.setAttribute('aria-pressed', String(index === stage)));
        notes.forEach((note, index) => note.classList.toggle('is-current', index === stage));
        nodes.forEach((node) => node.classList.toggle('focus-node', Number(node.dataset.focus) === stage));
        previousStage = stage;
      }
      traces.forEach((path, channel) => path.setAttribute('d', signalPath(channel, progress)));
      paths.forEach(({path,length}, index) => {
        const amount = smooth((progress - .27 - index * .055) * 2.8);
        path.style.strokeDasharray = `${length}`;
        path.style.strokeDashoffset = `${length * (1 - amount)}`;
      });
      if (type === 'shl') {
        if (windowGroup) windowGroup.style.transform = `translate(${(smooth(progress * 1.6) * 45).toFixed(2)}px, 0)`;
        bars.forEach((bar, index) => {
          const target = Number(bar.dataset.bar);
          const amount = .48 + smooth((progress - .55) * 2.3) * .52;
          const height = target * amount;
          bar.setAttribute('height', height.toFixed(2));
          bar.setAttribute('y', (484 - height).toFixed(2));
        });
        if (cursor) cursor.style.transform = `translate(${(60 + progress * 352).toFixed(2)}px, 0)`;
      } else {
        const clustering = smooth((progress - .08) * 2.4);
        footprintGroups.forEach((group, index) => {
          const regularX = 82 + index * 54;
          const clusteredX = index < 5 ? 82 + index * 70 : index < 10 ? 415 + (index - 5) * 21 : 530 + (index - 10) * 72;
          const x = regularX + (clusteredX - regularX) * clustering;
          const y = index % 2 ? 171 : 122;
          const tilt = index > 4 && index < 10 ? clustering * (index % 2 ? 13 : -13) : 0;
          group.style.transform = `translate(${x.toFixed(2)}px, ${y}px) rotate(${tilt.toFixed(2)}deg)`;
        });
        if (cursor && track) {
          const point = track.getPointAtLength(track.getTotalLength() * progress);
          cursor.style.transform = `translate(${point.x.toFixed(2)}px, ${point.y.toFixed(2)}px)`;
        }
        if (windowGroup) windowGroup.style.transform = `translate(${(smooth(progress) * 48).toFixed(2)}px, 0)`;
      }
      if (announce) live.textContent = `${buttons[stage].dataset.title}. ${notes[stage].querySelector('p').textContent}`;
    };

    buttons.forEach((button, index) => {
      button.addEventListener('click', () => { manuallySet = true; render((index + .5) / 4, true); });
      button.addEventListener('keydown', (event) => {
        const key = event.key;
        if (!['ArrowLeft','ArrowRight','Home','End'].includes(key)) return;
        event.preventDefault();
        const next = key === 'Home' ? 0 : key === 'End' ? 3 : (index + (key === 'ArrowRight' ? 1 : 3)) % 4;
        buttons[next].focus();
        manuallySet = true;
        render((next + .5) / 4, true);
      });
    });
    range.addEventListener('input', () => { manuallySet = true; render(Number(range.value) / 1000); });
    range.addEventListener('change', () => render(Number(range.value) / 1000, true));
    lab.classList.add('enhanced');
    render(progress);
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, {rootMargin:'100px'});
      observer.observe(lab);
    }
    stories.push({
      updateScroll() {
        if (!visible || manuallySet || reduced.matches) return;
        const box = lab.getBoundingClientRect();
        const viewport = window.innerHeight;
        const p = clamp((viewport * .82 - box.top) / (box.height + viewport * .38));
        render(p);
      }
    });
  });

  // One requested frame per browser event; no idle animation loop or timer.
  let pending = false;
  const onScroll = () => {
    if (pending) return;
    pending = true;
    window.requestAnimationFrame(() => { pending = false; stories.forEach((story) => story.updateScroll()); });
  };
  window.addEventListener('scroll', onScroll, {passive:true});
  window.addEventListener('resize', onScroll, {passive:true});
  reduced.addEventListener?.('change', onScroll);
})();
