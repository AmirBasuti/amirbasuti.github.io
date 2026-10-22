/* Small, event-driven motion. No renderer, animation loop or remote dependency. */
(() => {
  const toggle=document.querySelector('.motion-toggle');
  const bench=document.querySelector('.workbench');
  if(!toggle||!bench||!window.matchMedia||!window.IntersectionObserver)return;
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  const narrow=matchMedia('(max-width:720px)');
  const cards=[bench.querySelector('.bench-paper'),bench.querySelector('.bench-software')];
  let preference;try{preference=localStorage.getItem('ab-motion');}catch{}
  let enabled=!media.matches&&preference!=='off',visible=false,frame=0;
  const clamp=n=>Math.max(0,Math.min(1,n));
  function draw(){
    frame=0;const rect=bench.getBoundingClientRect();
    const p=enabled&&!narrow.matches?clamp((innerHeight*.8-rect.top)/(innerHeight*.7)):1;
    cards[0].style.transform=`translateY(${(1-p)*9}px) rotate(${(1-p)*-3}deg)`;
    cards[1].style.transform=`translateY(${(1-p)*-5}px) rotate(${(1-p)*3}deg)`;
    bench.dataset.settled=p.toFixed(3);
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(draw);}
  function sync(){
    document.body.dataset.motion=enabled?'on':'off';document.documentElement.dataset.motion=enabled?'on':'off';
    toggle.setAttribute('aria-label',enabled?'Pause motion':'Enable motion');toggle.setAttribute('aria-pressed',String(!enabled));
    toggle.querySelector('.motion-icon').textContent=enabled?'Ⅱ':'▷';toggle.querySelector('.motion-label').textContent=enabled?'Pause motion':'Motion off';
    if(!enabled)document.querySelectorAll('.reveal').forEach(e=>e.classList.add('is-visible'));
    schedule();
  }
  const reveal=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('is-visible');reveal.unobserve(entry.target);}},{threshold:.06});
  document.querySelectorAll('.reveal').forEach(e=>reveal.observe(e));
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)schedule();},{rootMargin:'100px'}).observe(bench);
  addEventListener('scroll',()=>{if(visible&&enabled)schedule();},{passive:true});
  addEventListener('resize',schedule,{passive:true});
  toggle.addEventListener('click',()=>{enabled=!enabled&&!media.matches;preference=enabled?'on':'off';try{localStorage.setItem('ab-motion',preference);}catch{}sync();});
  media.addEventListener('change',()=>{enabled=!media.matches&&preference!=='off';sync();});
  toggle.hidden=false;document.body.classList.add('motion-ready');sync();
})();
