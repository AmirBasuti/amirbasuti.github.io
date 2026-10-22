(() => {
  'use strict';
  const stage = document.querySelector('.atelier');
  if (!stage) return;
  const rig = stage.querySelector('.atelier-rig');
  const planes = [...stage.querySelectorAll('.atelier-plane')];
  const articles = [...stage.querySelectorAll('.atelier-copy article')];
  const buttons = [...stage.querySelectorAll('[data-chapter]')];
  const particles = stage.querySelector('.atelier-points');
  const connections = stage.querySelector('.atelier-connections');
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 720px), (max-height: 610px)');
  const spreadButton = stage.querySelector('[data-spread]');
  const variationButton = stage.querySelector('[data-variation]');
  const followButton = stage.querySelector('[data-follow]');
  const hint = stage.querySelector('[data-atelier-hint]');
  const svgNS = 'http://www.w3.org/2000/svg';
  const clamp = n => Math.max(0, Math.min(1, n));
  const smooth = n => { n = clamp(n); return n * n * (3 - 2 * n); };
  const lerp = (a,b,t) => a + (b-a)*t;
  let current = 0, target = 0, spread = 0, spreadTarget = 0, twistX = 0, twistY = 0;
  let pointerX = 0, pointerY = 0, version = 0, frame = 0, visible = true, following = true;
  let previousTime = 0, active = -1, variation = 0;
  particles.replaceChildren();
  const dots = Array.from({length:72}, (_,i) => {
    const dot = document.createElementNS(svgNS, 'circle');
    dot.setAttribute('r', i % 9 === 0 ? '4.1' : '2.7');
    particles.appendChild(dot); return dot;
  });
  const motionOn = () => !media.matches && document.body.dataset.motion !== 'off';
  function position(i, phase) {
    const a = i * 2.39996 + variation * .43;
    const radius = Math.sqrt((i+.5)/72);
    const cloud = [250 + Math.cos(a)*radius*198,160 + Math.sin(a)*radius*125];
    const cluster = i%3;
    const centers = [[125,111],[333,102],[268,234]];
    const organized = [centers[cluster][0]+Math.cos(a)*radius*63,centers[cluster][1]+Math.sin(a)*radius*43];
    const grid = [76+(i%12)*32,80+Math.floor(i/12)*35];
    const t1=smooth(phase*2),t2=smooth((phase-.5)*2);
    return [lerp(lerp(cloud[0],organized[0],t1),grid[0],t2),lerp(lerp(cloud[1],organized[1],t1),grid[1],t2)];
  }
  function draw() {
    const phase=current, build=smooth((phase-.53)/.47), explore=smooth(phase/.5);
    const index=phase<.27?0:phase<.74?1:2;
    if(index!==active){
      active=index;
      articles.forEach((a,i)=>{a.classList.toggle('is-current',i===index);a.inert=i!==index;a.setAttribute('aria-hidden',String(i!==index));});
      buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));
      const labels=[['SHL / LATE FUSION','NuTime .54 · MantisV2 .29 · TiRex .17'],['FoG / REPRESENTATIONS','UniShape + MantisV2 · 4 IMUs'],['SOFTWARE / DATA SERVICES','APIs · storage · chart interfaces']];
      stage.querySelector('.analysis-label b').textContent=labels[index][0];
      stage.querySelector('.analysis-label span').textContent=labels[index][1];
    }
    rig.style.transform=`rotateX(${lerp(21,5,build)+twistY}deg) rotateY(${lerp(-27,-8,build)+twistX}deg) rotateZ(${lerp(-10,0,build)}deg)`;
    const depth=(1-build)*67+spread*76;
    planes[0].style.transform=`translate3d(${-16-spread*14}px,${23+spread*14}px,${-depth}px)`;
    planes[1].style.transform='translate3d(0,0,0)';
    planes[2].style.transform=`translate3d(${18*(1-build)+spread*14}px,${-25*(1-build)-spread*14}px,${depth}px)`;
    // The same object opens to expose its representation, then assembles into an interface.
    planes[2].style.opacity=String(build);
    planes[1].style.opacity=String(1-build*(1-spread*.8));
    planes[0].style.opacity=String(lerp(.8,.96,build));
    const points=dots.map((dot,i)=>{
      const pos=position(i,phase);
      dot.setAttribute('cx',pos[0].toFixed(2));dot.setAttribute('cy',pos[1].toFixed(2));return pos;
    });
    let lines='';
    for(let i=0;i<points.length;i+=3){
      const j=(i+9)%points.length;
      lines+=`M${points[i][0].toFixed(1)},${points[i][1].toFixed(1)}L${points[j][0].toFixed(1)},${points[j][1].toFixed(1)}`;
    }
    connections.setAttribute('d',lines);connections.style.opacity=String(.15+.85*explore);
    stage.querySelector('.atelier-track span').style.transform=`scaleX(${phase})`;
    stage.style.setProperty('--frame-radius',`${32*(1-smooth(phase/.2))}px`);
    stage.querySelectorAll('.interface-bars i').forEach((bar,i)=>bar.style.transform=`scaleY(${.3+.7*smooth(build*1.8-i*.08)})`);
  }
  function tick(time){
    frame=0;
    const amount=motionOn()?1-Math.exp(-Math.min(48,time-previousTime||16)/75):1;
    previousTime=time;
    current=lerp(current,target,amount);spread=lerp(spread,spreadTarget,amount);twistX=lerp(twistX,pointerX,amount);twistY=lerp(twistY,pointerY,amount);variation=lerp(variation,version,amount);
    const moving=Math.abs(current-target)+Math.abs(spread-spreadTarget)+Math.abs(twistX-pointerX)+Math.abs(twistY-pointerY)+Math.abs(variation-version)>.001;
    if(!moving){current=target;spread=spreadTarget;twistX=pointerX;twistY=pointerY;}
    draw();
    if(moving&&visible&&!document.hidden)frame=requestAnimationFrame(tick);
  }
  function schedule(){if(!frame&&visible&&!document.hidden)frame=requestAnimationFrame(tick);}
  function scrollProgress(){
    if(!following||!motionOn()||mobile.matches)return;
    const rect=stage.getBoundingClientRect();
    const usable=rect.height-(innerHeight-66);
    if(usable>0)target=clamp((66-rect.top)/usable);
    schedule();
  }
  function manual(index){following=false;target=index/2;followButton.hidden=mobile.matches||!motionOn();hint.textContent='Your pace. Choose a chapter, or open the layers.';schedule();}
  buttons.forEach((button,i)=>button.addEventListener('click',()=>manual(i)));
  spreadButton.addEventListener('click',()=>{spreadTarget=spreadTarget?0:1;spreadButton.setAttribute('aria-pressed',String(!!spreadTarget));spreadButton.textContent=spreadTarget?'Close layers −':'Open layers +';schedule();});
  variationButton.addEventListener('click',()=>{version=(version+1)%5;target=0;following=false;followButton.hidden=mobile.matches||!motionOn();hint.textContent='Schematic points rearranged. No model inference is running.';schedule();});
  followButton.addEventListener('click',()=>{following=true;followButton.hidden=true;hint.textContent='Scroll to explore · or choose a chapter';scrollProgress();});
  stage.querySelector('.atelier-object').addEventListener('pointermove',event=>{
    if(event.pointerType==='touch'||!motionOn())return;
    const r=event.currentTarget.getBoundingClientRect();pointerX=((event.clientX-r.left)/r.width-.5)*12;pointerY=-((event.clientY-r.top)/r.height-.5)*8;schedule();
  });
  stage.querySelector('.atelier-object').addEventListener('pointerleave',()=>{pointerX=pointerY=0;schedule();});
  function preferences(){
    if(!motionOn()){pointerX=pointerY=0;current=target;spread=spreadTarget;}
    followButton.hidden=following||mobile.matches||!motionOn();
    hint.textContent=mobile.matches||!motionOn()?'Choose a chapter. Open the layers.':'Scroll to explore · or choose a chapter';
    scrollProgress();schedule();
  }
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){scrollProgress();schedule();}else if(frame){cancelAnimationFrame(frame);frame=0;}},{rootMargin:'120px'}).observe(stage);
  new MutationObserver(preferences).observe(document.body,{attributes:true,attributeFilter:['data-motion']});
  addEventListener('scroll',()=>{if(visible)scrollProgress();},{passive:true});
  addEventListener('resize',preferences,{passive:true});
  media.addEventListener('change',preferences);mobile.addEventListener('change',preferences);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&frame){cancelAnimationFrame(frame);frame=0;}else schedule();});
  document.documentElement.classList.add('atelier-ready');
  stage.querySelectorAll('[data-enhanced]').forEach(e=>e.hidden=false);
  preferences();draw();
})();
