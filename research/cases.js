import { createFilmCopy } from '../film-copy.js?v=20261022h';
/* A continuous schematic journey. Geometry is illustrative, never a model result. */
(() => {
  'use strict';
  const clamp = (n, a = 0, b = 1) => Math.min(b, Math.max(a, n));
  const ease = (n) => { const t = clamp(n); return t * t * (3 - 2 * t); };
  const mix = (a, b, p) => a + (b - a) * p;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const compact = window.matchMedia('(max-width: 760px)');
  const shallow = window.matchMedia('(max-height: 619px) and (max-width: 760px), (max-height: 559px) and (min-width: 761px)');
  const motionOff = () => document.documentElement.dataset.motion === 'off' || document.body?.dataset.motion === 'off';
  const stories = [];
  const line = (d, cls = 'journey-line', extra = '') => `<path class="${cls}" d="${d}" ${extra}/>`;
  const text = (x, y, value, cls = 'journey-label', extra = '') => `<text x="${x}" y="${y}" class="${cls}" ${extra}>${value}</text>`;
  const plate = (x, y, w, h, cls = 'journey-plate', rx = 18) => `<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"/>`;
  const namespaceSvg = (svg, prefix) => {
    const ids = new Map();
    const nodes = [svg,...svg.querySelectorAll('*')];
    nodes.filter(node=>node.hasAttribute('id')).forEach((node) => { const id = node.id; ids.set(id, `${prefix}-${id}`); node.id = ids.get(id); });
    nodes.forEach((node) => {
      [...node.attributes].forEach((attribute) => {
        let value = attribute.value.replace(/url\(\s*['"]?#([^\s)'"#]+)['"]?\s*\)/g, (match, id) => ids.has(id) ? `url(#${ids.get(id)})` : match);
        if (['href','xlink:href'].includes(attribute.name) && value.startsWith('#') && ids.has(value.slice(1))) value = `#${ids.get(value.slice(1))}`;
        if (['aria-labelledby','aria-describedby'].includes(attribute.name)) value = value.split(/\s+/).map(id => ids.get(id) || id).join(' ');
        if (value !== attribute.value) node.setAttribute(attribute.name, value);
      });
    });
  };
  const signal = (channel, x, y, width, fog = false) => {
    let d = '';
    for (let i = 0; i <= 110; i++) {
      const t = i / 110;
      const rhythm = Math.sin(t * 25 + channel * .78) * 9 + Math.sin(t * 67 + channel * 1.3) * 3;
      const interruption = fog ? Math.exp(-Math.pow((t - .62) / .15, 2)) * Math.sin(t * 185 + channel) * 18 : 0;
      d += `${i ? 'L' : 'M'}${(x + t * width).toFixed(1)} ${(y + rhythm + interruption).toFixed(1)} `;
    }
    return line(d, `journey-trace channel-${channel % 3}`, 'pathLength="1" data-trace');
  };
  const tokenGrid = (x, y, cols, rows, variant = 0) => Array.from({length:cols * rows}, (_, i) => {
    const weight = .18 + ((i * 7 + variant * 11) % 13) / 17;
    return `<rect x="${x + i % cols * 25}" y="${y + Math.floor(i / cols) * 25}" width="18" height="18" rx="3" class="journey-token" opacity="${weight.toFixed(2)}" data-token="${i}"/>`;
  }).join('');

  const commonDefs = `<defs>
    <linearGradient id="device-metal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#bac4b4"/><stop offset=".18" stop-color="#3d5547"/><stop offset=".55" stop-color="#15251c"/><stop offset="1" stop-color="#8c9e87"/></linearGradient>
    <linearGradient id="glass-plane" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#9aaf8a" stop-opacity=".19"/><stop offset="1" stop-color="#b8c7a8" stop-opacity=".035"/></linearGradient>
    <radialGradient id="scene-aura"><stop stop-color="#526542" stop-opacity=".23"/><stop offset="1" stop-color="#253727" stop-opacity="0"/></radialGradient>
    <g id="journey-foot"><path d="M-14-25C-11-39 10-38 16-27C23-15 16-2 10 9L4 23C-2 30-15 24-15 15C-16 7-10-1-13-10C-15-16-16-19-14-25Z"/><path d="M-12 34C-10 27 6 28 8 35L5 45C2 51-13 49-13 42Z"/></g>
  </defs>`;

  function shlWorld() {
    const sensorLabels = ['ACCELERATION', 'ROTATION', 'MAGNETIC FIELD'];
    const phone = `<g data-phone-shell transform="rotate(-16 750 330)">
      <ellipse cx="790" cy="590" rx="200" ry="24" fill="#000" opacity=".12"/>
      <rect x="625" y="102" width="244" height="450" rx="43" fill="url(#device-metal)" stroke="#adbaa2" stroke-width="1.5"/>
      <rect x="633" y="110" width="228" height="434" rx="36" fill="#101c15" stroke="#415340"/>
      <rect x="643" y="121" width="208" height="412" rx="28" fill="#1a2b20"/>
      <rect x="707" y="132" width="80" height="16" rx="8" fill="#0b1510"/>
      <path d="M698 506H796" stroke="#8e9f80" stroke-width="3" stroke-linecap="round"/>
      <g transform="translate(748 320)"><circle r="64" fill="none" stroke="#435d43"/><circle r="41" fill="none" stroke="#435d43"/><path d="M0-85V85 M-85 0H85 M-48 48L48-48" stroke="#99b18b" stroke-width="1.3"/><circle r="9" fill="#c7ad76"/></g>
      ${text(748,438,'MOVEMENT','device-word','text-anchor="middle"')}
    </g>`;
    const planes = sensorLabels.map((label, i) => `<g data-sensor-plane="${i}" transform="translate(${i * 40} ${-i * 26}) rotate(-16 750 330)">
      <rect x="638" y="115" width="220" height="422" rx="31" fill="url(#glass-plane)" stroke="${['#a8bb91','#d2b77f','#799682'][i]}" stroke-opacity=".7"/>
      ${line('M660 235H836 M660 330H836 M660 425H836 M705 165V480 M792 165V480','plane-grid')}
      <g transform="translate(748 330)"><rect x="-26" y="-26" width="52" height="52" rx="8" fill="#1a2d20" stroke="#b7c4a4"/>${line('M-14 13L0-14 14 13 M-14 13H14','plane-chip')}</g>
      ${text(660,178,label,'plane-label')}${text(660,492,'x / y / z','plane-label')}
    </g>`).join('');
    const traces = Array.from({length:9}, (_, i) => signal(i,1690,153 + i * 39,520)).join('');
    const models = ['NuTime','MantisV2','TiRex'].map((name, i) => {
      const y = 140 + i * 155;
      return `<g data-model="${i}">${plate(2920,y,350,127)}${text(2945,y+37,name,'model-title')}${text(3245,y+37,['.54','.29','.17'][i],'model-weight','text-anchor="end"')}${tokenGrid(2945,y+62,10,2,i)}${text(3315,y+76,['54%','29%','17%'][i],'weight-large')}${line(`M3270 ${y+64}H3420Q3450 ${y+64} 3450 359`,'journey-route')}</g>`;
    }).join('');
    const classes = ['Still','Walk','Run','Bike','Car','Bus','Train','Subway'];
    const results = classes.map((name, i) => {
      const y = 127 + i * 56;
      return `<g>${text(4105,y+16,name,i===1?'activity-label is-active':'activity-label')}${plate(4220,y,350,22,'output-track',3)}<rect x="4220" y="${y}" width="${[50,292,86,42,32,23,27,18][i]}" height="22" rx="3" class="${i===1?'output-selected':'output-bar'}" data-output-bar="${[50,292,86,42,32,23,27,18][i]}"/></g>`;
    }).join('');
    return `${phone}${planes}
      ${line('M1000 330C1270 330 1370 330 1620 330','journey-route')}${line('M1000 330C1270 330 1370 330 1620 330','journey-draw','pathLength="1" data-draw="0"')}
      <g data-signal-panel>${plate(1655,97,600,472)}${text(1690,128,'ACC / GYRO / MAG · XYZ','journey-kicker')}${traces}<g data-window-frame>${plate(1828,141,218,354,'journey-window',3)}${line('M1828 150V141H2046V150','window-bracket')}${text(1937,531,'5 seconds / 500 samples','window-label','text-anchor="middle"')}</g></g>
      ${line('M2255 332C2490 332 2670 359 2880 359 M2880 204V514 M2880 204H2920 M2880 359H2920 M2880 514H2920','journey-route')}${line('M2255 332C2490 332 2670 359 2880 359 M2880 204V514 M2880 204H2920 M2880 359H2920 M2880 514H2920','journey-draw','pathLength="1" data-draw="1"')}
      ${models}${text(2920,110,'FROZEN REPRESENTATIONS → CLASSIFIERS','journey-kicker')}
      <circle cx="3450" cy="359" r="23" class="fusion-point"/>${text(3450,366,'Σ','fusion-symbol','text-anchor="middle"')}
      ${line('M3474 359C3670 359 3850 359 4060 359','journey-route')}${line('M3474 359C3670 359 3850 359 4060 359','journey-draw','pathLength="1" data-draw="2"')}
      ${plate(4075,83,540,530)}${text(4105,112,'EIGHT POSSIBLE MODES','journey-kicker')}${results}${text(4105,592,'ILLUSTRATIVE OUTPUT / WALK','journey-kicker')}`;
  }

  function fogWorld() {
    const feet = Array.from({length:11}, (_, i) => {
      const x = 475 + i * 57, y = i % 2 ? 370 : 260;
      return `<g data-step="${i}" transform="translate(${x} ${y})"><use href="#journey-foot" transform="rotate(${i%2?88:80})" class="${i>3&&i<8?'journey-foot interruption':'journey-foot'}"/></g>`;
    }).join('');
    const sensors = [['LEFT ANKLE',1700,173],['RIGHT ANKLE',2025,173],['LOWER BACK',1700,413],['AFFECTED-SIDE WRIST',2025,413]].map(([name,x,y],i)=>`<g data-imu="${i}">${plate(x,y,115,94,'imu-case',17)}${plate(x+9,y+9,97,76,'imu-face',11)}<circle cx="${x+57}" cy="${y+47}" r="21" fill="none" stroke="#9daf91"/>${line(`M${x+44} ${y+47}H${x+70} M${x+57} ${y+34}V${y+60}`,'plane-chip')}${text(x+57,y+(i<2?-20:121),name,'imu-label','text-anchor="middle"')}${line(`M${x+57} ${y+(i<2?94:0)}L1933 340`,'journey-route')}</g>`).join('');
    const traces = Array.from({length:4},(_,i)=>signal(i,1810,289+i*34,245,true)).join('');
    const modelNames=['UniShape','MantisV2'];
    const models=modelNames.map((name,i)=>`<g data-model="${i}">${plate(2920,135+i*210,330,169)}${text(2945,176+i*210,name,'model-title')}${tokenGrid(2945,198+i*210,10,3,i)}${line(`M3250 ${219+i*210}C3330 ${219+i*210} 3330 326 3395 326`,'journey-route')}</g>`).join('');
    const blocks=Array.from({length:10},(_,i)=>`<rect x="${4108+i*45}" y="${306-(i>3&&i<7?62:16)}" width="34" height="${i>3&&i<7?124:32}" rx="6" class="${i>3&&i<7?'output-selected':'output-bar'}" data-fog-window="${i}"/>`).join('');
    return `${line('M450 320H1130','gait-guide')}${feet}${text(477,483,'FORWARD PROGRESSION','journey-kicker')}${text(477,508,'An abstract stepping rhythm','journey-label')}
      <g data-gait-focus><ellipse cx="815" cy="319" rx="118" ry="147" class="gait-focus"/>${text(815,145,'INTERRUPTION','journey-kicker','text-anchor="middle"')}</g>
      ${line('M1130 320C1330 320 1470 340 1660 340','journey-route')}${line('M1130 320C1330 320 1470 340 1660 340','journey-draw','pathLength="1" data-draw="0"')}
      ${sensors}${plate(1785,260,296,164)}${traces}${text(1933,238,'24 CHANNELS / 60 Hz','journey-kicker','text-anchor="middle"')}
      <g data-window-frame>${plate(1870,277,120,128,'journey-window',3)}${line('M1870 285V277H1990V285','window-bracket')}</g>${text(1933,574,'2 seconds · 120 samples · 0.5-second hop','journey-label','text-anchor="middle"')}
      ${line('M2081 340C2400 340 2670 326 2870 326 M2870 219V429 M2870 219H2920 M2870 429H2920','journey-route')}${line('M2081 340C2400 340 2670 326 2870 326 M2870 219V429 M2870 219H2920 M2870 429H2920','journey-draw','pathLength="1" data-draw="1"')}
      ${models}${text(2920,108,'TWO FROZEN REPRESENTATIONS','journey-kicker')}${plate(3395,259,151,134,'attention-plate',19)}${text(3470,316,'Cross-','model-title','text-anchor="middle"')}${text(3470,345,'attention','model-title','text-anchor="middle"')}
      ${line('M3546 326C3710 326 3880 326 4060 326','journey-route')}${line('M3546 326C3710 326 3880 326 4060 326','journey-draw','pathLength="1" data-draw="2"')}
      ${plate(4075,130,530,402)}${text(4108,178,'A DECISION FOR EACH WINDOW','journey-kicker')}${blocks}${line('M4108 400H4547','gait-guide')}${text(4108,435,'non-FoG','journey-label')}${text(4350,435,'FoG','window-label')}${text(4108,494,'ILLUSTRATIVE LABELS / OFFLINE ANALYSIS','journey-kicker')}`;
  }

  // Clinical method: current P072 supervisor manuscript, 12 October 2026,
  // Methods lines 70–88. NuTime is frozen; the participant classifier is supervised.
  // Source: projects/clinical_gait/papers/spmb2026/
  // submission_candidate_20261012_supervisor/P072_revised_manuscript.tex.
  function clinicalWorld() {
    const placements = ['HEAD','LOWER BACK','LEFT FOOT','RIGHT FOOT'].map((name,i)=>`<g transform="translate(1040 ${173+i*78})">${plate(-16,-18,32,36,'imu-case',7)}<circle r="5" fill="#c9b582"/>${text(-32,5,name,'imu-label','text-anchor="end"')}</g>`).join('');
    const phaseBands = [
      `<g data-clinical-phase="0">${text(490,508,'FULL','journey-kicker')}${plate(590,493,465,20,'output-bar',3)}</g>`,
      `<g data-clinical-phase="1">${text(490,548,'STRAIGHT','journey-kicker')}${plate(590,533,175,20,'output-bar',3)}${plate(880,533,175,20,'output-bar',3)}</g>`,
      `<g data-clinical-phase="2">${text(490,588,'TURN','journey-kicker')}${plate(765,573,115,20,'output-selected',3)}</g>`
    ].join('');
    const channelTraces=Array.from({length:6},(_,i)=>signal(i,1665,231+i*35,205)).join('');
    const windows=Array.from({length:3},(_,i)=>`<g data-clinical-window="${i}" transform="translate(${i*36} ${i*112})">${plate(2895,145,219,95)}${text(2913,172,`WINDOW ${i+1}`,'journey-kicker')}${tokenGrid(2913,189,7,1,i)}</g>`).join('');
    const summaries=['MEAN','MAXIMUM','MINIMUM','STD. DEVIATION'].map((name,i)=>`<g data-summary="${i}">${plate(3225,141+i*100,220,73,'attention-plate',12)}${text(3245,170+i*100,name,'journey-kicker')}${line(`M3245 ${189+i*100}H3424`,'plane-chip')}${line(`M3190 326C3208 326 3208 ${178+i*100} 3225 ${178+i*100}`,'journey-route')}${line(`M3445 ${178+i*100}C3490 ${178+i*100} 3490 326 3530 326`,'journey-route')}</g>`).join('');
    const targets=[['2 CLASSES','Healthy / pathological'],['3 CLASSES','Healthy / orthopedic / neurological'],['8 COHORTS','Source cohort labels']].map(([name,detail],i)=>`<g data-clinical-target="${i}">${plate(4350,140+i*155,290,114)}${text(4372,180+i*155,name,'model-title')}${text(4372,215+i*155,detail,'imu-label')}${line(`M4300 350H4320V${197+i*155}H4350`,'journey-route')}${line(`M4300 350H4320V${197+i*155}H4350`,'journey-draw',`pathLength="1" data-clinical-branch="${i}"`)}</g>`).join('');
    return `${text(490,100,'COMPARE THREE VIEWS OF A TRIAL','journey-kicker')}
      ${line('M560 425V235C560 128 805 128 805 235V425','journey-route','data-clinical-track')}
      ${line('M560 425V235C560 128 805 128 805 235V425','journey-draw','pathLength="1" data-clinical-route')}
      ${line('M552 300L560 286 568 300 M797 348L805 362 813 348','plane-chip')}
      <g data-clinical-marker><circle r="11" class="fusion-point"/><circle r="4" fill="#d5c28e"/></g>
      ${text(490,452,'PRE-TURN','journey-kicker')}${text(725,452,'POST-TURN','journey-kicker')}${text(682,138,'U-TURN','journey-kicker','text-anchor="middle"')}${placements}${phaseBands}
      ${line('M1090 330C1270 330 1450 330 1620 330','journey-route')}${line('M1090 330C1270 330 1450 330 1620 330','journey-draw','pathLength="1" data-draw="0"')}
      ${text(1665,164,'24 CHANNELS / ENCODED INDEPENDENTLY','journey-kicker')}${channelTraces}
      ${line('M1870 330H1910','journey-route')}${plate(1910,190,320,290)}${text(1940,239,'NuTime Base','model-title')}${text(1940,269,'FROZEN ENCODER','journey-kicker')}${tokenGrid(1940,301,10,4,3)}${text(1940,448,'128-D CLS / channel','journey-label')}
      ${text(1665,532,'200 samples → 208 with padding','journey-label')}${text(1665,564,'Two-second windows / one-second stride','journey-kicker')}
      ${line('M2230 330C2440 330 2680 326 2860 326','journey-route')}${line('M2230 330C2440 330 2680 326 2860 326','journey-draw','pathLength="1" data-draw="1"')}
      ${text(2895,105,'POOL WITHIN EACH PARTICIPANT','journey-kicker')}${windows}${line('M3170 193H3190V417 M3170 305H3190 M3170 417H3190','journey-route')}${summaries}<circle cx="3530" cy="326" r="21" class="fusion-point"/>${text(3530,333,'1','fusion-symbol','text-anchor="middle"')}${text(2895,555,'Windows across eligible trials','journey-label')}${text(2895,585,'Mean, maximum, minimum and standard deviation','journey-kicker')}
      ${line('M3551 326C3720 326 3890 350 4070 350','journey-route')}${line('M3551 326C3720 326 3890 350 4070 350','journey-draw','pathLength="1" data-draw="2"')}
      ${text(4080,104,'ONE PREDICTION PER PARTICIPANT / TARGET','journey-kicker')}${plate(4080,240,220,218,'attention-plate',18)}${text(4110,290,'Logistic','model-title')}${text(4110,323,'regression','model-title')}${text(4110,374,'SUPERVISED HEAD','journey-kicker')}${text(4110,407,'Balanced L2','journey-label')}${targets}${text(4080,608,'SCHEMATIC / INTERNAL PARTICIPANT-GROUPED ANALYSIS','journey-kicker')}`;
  }

  const worlds = {shl:shlWorld, fog:fogWorld, clinical:clinicalWorld};
  document.querySelectorAll('[data-case-story]').forEach((lab, storyIndex) => {
    const type = lab.dataset.caseStory;
    if (!worlds[type]) return;
    const section = lab.closest('.project-story') || lab.parentElement;
    const notes = [...section.querySelectorAll('[data-stage-note]')];
    const buttons = [...lab.querySelectorAll('[data-stage]')];
    const range = lab.querySelector('[data-scrub]');
    const output = lab.querySelector('[data-progress]');
    const live = lab.querySelector('[data-announcement]');
    const scene = lab.querySelector('.scene');
    if (!scene || !range || !output || !live || notes.length !== 4 || buttons.length !== 4) return;
    const oldSvg = scene.querySelector('svg');
    const track = document.createElement('div');
    track.className = 'journey-track';
    lab.before(track);
    track.append(lab);
    const copy = document.createElement('div');
    copy.className = 'journey-copy';
    copy.setAttribute('aria-hidden',String(!lab.closest('.project-story')));
    copy.dataset.readingCopy = '';
    notes.forEach((note, index) => {
      const article = document.createElement('article');
      article.dataset.filmCopy = index;
      const heading = document.createElement('h3');
      const description = document.createElement('p');
      heading.textContent = note.querySelector('h3').textContent;
      description.textContent = note.querySelector('p').textContent;
      article.append(heading, description); copy.append(article);
    });
    scene.prepend(copy);
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 1200 680');
    svg.setAttribute('class','cinema-svg');
    svg.setAttribute('aria-hidden','true');
    svg.innerHTML = `${commonDefs}<ellipse cx="820" cy="345" rx="430" ry="330" fill="url(#scene-aura)"/><g data-camera>${worlds[type]()}<g data-packet>${plate(-61,-43,122,86,'sample-packet',12)}${line('M-44-21L-29-27-18-12-2-24 13-17 28-28 44-20 M-44 0L-29 9-18-5-2 7 13-4 28 6 44 0 M-44 21L-29 15-18 27-2 17 13 25 28 16 44 21','packet-trace')}</g></g>`;
    // Inline paint wins over the legacy stylesheet's unscoped url(#device-metal).
    svg.querySelectorAll('.imu-case').forEach(node => {node.style.fill='url(#device-metal)';});
    namespaceSvg(svg, `case-${type}-${storyIndex}`);
    scene.append(svg);
    if(oldSvg){namespaceSvg(oldSvg,`case-fallback-${type}-${storyIndex}`);oldSvg.classList.add('static-overview');}
    const resume = document.createElement('button');
    resume.type='button';resume.className='resume-scroll';resume.textContent='Follow scroll';
    resume.setAttribute('aria-label','Resume the scene at the current scroll position');
    lab.querySelector('.scrub-row').append(resume);
    const camera=svg.querySelector('[data-camera]');
    const packet=svg.querySelector('[data-packet]');
    const planes=[...svg.querySelectorAll('[data-sensor-plane]')];
    const draws=[...svg.querySelectorAll('[data-draw]')];
    const traces=[...svg.querySelectorAll('[data-trace]')];
    const steps=[...svg.querySelectorAll('[data-step]')];
    const bars=[...svg.querySelectorAll('[data-output-bar]')];
    const frames=[...svg.querySelectorAll('[data-window-frame]')];
    const tokens=[...svg.querySelectorAll('[data-token]')];
    const clinicalTrack=svg.querySelector('[data-clinical-track]');
    const clinicalLength=clinicalTrack?.getTotalLength() || 0;
    const clinicalRoute=svg.querySelector('[data-clinical-route]');
    const clinicalMarker=svg.querySelector('[data-clinical-marker]');
    const clinicalPhases=[...svg.querySelectorAll('[data-clinical-phase]')];
    const clinicalWindows=[...svg.querySelectorAll('[data-clinical-window]')];
    const clinicalSummaries=[...svg.querySelectorAll('[data-summary]')];
    const clinicalBranches=[...svg.querySelectorAll('[data-clinical-branch]')];
    const clinicalTargets=[...svg.querySelectorAll('[data-clinical-target]')];
    let previous=-1, progress=0, manual=false, visible=true;
    let copyFrame=0;
    const requestCopyFrame=()=>{
      if(copyFrame||!visible||document.hidden)return;
      copyFrame=requestAnimationFrame(time=>{
        copyFrame=0;
        if(visible&&!document.hidden&&copyTransition.tick(time))requestCopyFrame();
      });
    };
    const copyTransition=createFilmCopy(copy,{reduced:()=>reduced.matches||motionOff(),requestFrame:requestCopyFrame});
    const render = (p, announce=false) => {
      progress=clamp(p);
      const index=Math.min(3,Math.floor(progress*3+.5));
      const segment=Math.min(2,Math.floor(progress*3));
      const local=ease(progress*3-segment);
      const offset=mix(segment*1200,(segment+1)*1200,local);
      const scale=compact.matches ? .95 : mix([1.04,1,1,.99][segment],[1.04,1,1,.99][segment+1],local);
      const pivot=compact.matches?785:770;
      svg.setAttribute('viewBox',compact.matches?'440 65 690 550':'0 0 1200 680');
      camera.setAttribute('transform',`translate(${pivot*(1-scale)-offset*scale} ${340*(1-scale)}) scale(${scale})`);
      const packetStarts=type==='shl'?[1000,2255,3474]:type==='clinical'?[1090,2230,3551]:[1130,2081,3546];
      const packetEnds=type==='shl'?[1620,2880,4060]:type==='clinical'?[1620,2860,4070]:[1660,2870,4060];
      packet.setAttribute('transform',`translate(${mix(packetStarts[segment],packetEnds[segment],local)} ${type==='shl'?345:330})`);
      packet.style.opacity=String(Math.sin(local*Math.PI)*.95);
      range.value=String(Math.round(progress*1000));
      range.setAttribute('aria-valuetext',`${buttons[index].dataset.title}, ${Math.round(progress*100)} percent`);
      output.textContent=`${String(index+1).padStart(2,'0')} / 04`;
      lab.style.setProperty('--journey-progress',progress);
      if(previous!==index){
        buttons.forEach((button,i)=>button.setAttribute('aria-pressed',String(index===i)));
        notes.forEach((note,i)=>note.classList.toggle('is-current',index===i));
        previous=index;
      }
      copyTransition.set(index);
      const explode=ease(progress*5);
      planes.forEach((plane,i)=>plane.setAttribute('transform',`translate(${(i+1)*62*explode} ${-(i+1)*24*explode}) rotate(${-16+explode*7} 750 330)`));
      const phone=svg.querySelector('[data-phone-shell]');
      if(phone)phone.setAttribute('transform',`translate(${-explode*50} ${explode*20}) rotate(${-16-explode*9} 750 330)`);
      draws.forEach((path,i)=>{path.style.strokeDashoffset=String(1-ease((progress-i/3)*3));});
      traces.forEach((path,i)=>{path.style.strokeDashoffset=String(1-ease((progress-.08)*4-i*.008));});
      frames.forEach(frame=>frame.setAttribute('transform',`translate(${mix(-55,55,ease((progress-.14)*3))} 0)`));
      tokens.forEach((token,i)=>{
        const t=ease((progress-(type==='clinical' ? .12 : .36))*4-(i%30)*.006);
        token.style.transform=`translate(${(1-t)*-30}px,${(1-t)*(i%2?12:-12)}px)`;
      });
      bars.forEach(bar=>bar.setAttribute('width',Number(bar.dataset.outputBar)*(.15+.85*ease((progress-.72)*4))));
      if(type==='fog'){
        const cluster=ease(progress*8);
        steps.forEach((step,i)=>{
          const regular=475+i*57;
          const compressed=i<4?regular:i<8?720+(i-4)*20:820+(i-8)*80;
          step.setAttribute('transform',`translate(${mix(regular,compressed,cluster)} ${i%2?370:260}) rotate(${i>3&&i<8?(i%2?12:-12)*cluster:0})`);
        });
        svg.querySelector('[data-gait-focus]').style.opacity=String(cluster);
        svg.querySelectorAll('[data-imu]').forEach((imu,i)=>imu.setAttribute('transform',`translate(${(1-ease(progress*3))*(i%2?40:-40)} ${(1-ease(progress*3))*(i<2?-25:25)})`));
      }
      if(type==='clinical'){
        const phase=ease(progress*5);
        const point=clinicalTrack.getPointAtLength(clinicalLength*phase);
        clinicalMarker.setAttribute('transform',`translate(${point.x} ${point.y})`);
        clinicalRoute.style.strokeDashoffset=String(1-phase);
        clinicalPhases.forEach((row,i)=>{row.style.opacity=String(.55+.45*ease(phase*3-i));});
        const pooling=ease((progress-.43)*4);
        clinicalWindows.forEach((window,i)=>window.setAttribute('transform',`translate(${i*36-(1-pooling)*35} ${i*112+(1-pooling)*(1-i)*35})`));
        clinicalSummaries.forEach((summary,i)=>{summary.style.opacity=String(.35+.65*ease((progress-.45)*5-i*.07));});
        clinicalBranches.forEach((branch,i)=>{branch.style.strokeDashoffset=String(1-ease((progress-.77)*5-i*.1));});
        clinicalTargets.forEach((target,i)=>{target.style.opacity=String(.45+.55*ease((progress-.75)*5-i*.1));});
      }
      if(announce)live.textContent=`${buttons[index].dataset.title}. ${notes[index].querySelector('p').textContent}`;
    };
    const staticMode=()=>motionOff()||reduced.matches||shallow.matches||getComputedStyle(lab).position!=='sticky';
    const manualRender=(p,announce=false)=>{
      manual=true;lab.classList.add('is-manual');render(p,announce);
      // A stage selected near the end of its track should remain a complete view.
      if(announce && !staticMode()){
        const delta=lab.getBoundingClientRect().top-stickyOffset();
        if(Math.abs(delta)>2)window.scrollBy({top:delta,behavior:'smooth'});
      }
    };
    buttons.forEach((button,index)=>{
      button.addEventListener('click',()=>manualRender(index/3,true));
      button.addEventListener('keydown',event=>{
        if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
        event.preventDefault();
        const next=event.key==='Home'?0:event.key==='End'?3:(index+(event.key==='ArrowRight'?1:3))%4;
        buttons[next].focus();manualRender(next/3,true);
      });
    });
    range.addEventListener('input',()=>manualRender(Number(range.value)/1000));
    range.addEventListener('change',()=>manualRender(Number(range.value)/1000,true));
    const stickyOffset=()=>{
      const styles=getComputedStyle(lab);
      const actualTop=Number.parseFloat(styles.top);
      if(Number.isFinite(actualTop))return Math.max(0,actualTop);
      const declared=lab.dataset.stickyOffset ?? (styles.getPropertyValue('--story-sticky-offset').trim() || styles.getPropertyValue('--sticky-offset').trim() || styles.top);
      return Math.max(0,Number.parseFloat(declared)||0);
    };
    const update=()=>{
      if(manual||staticMode()||!visible)return;
      const box=track.getBoundingClientRect();
      const travel=track.offsetHeight-lab.offsetHeight;
      render(travel>0?(stickyOffset()-box.top)/travel:0);
    };
    const syncMotion=()=>{
      // Remove our state class before reading base layout, so paused CSS cannot
      // keep the scene locked after motion is enabled or the viewport grows.
      lab.classList.remove('is-motion-paused');
      const paused=staticMode();
      lab.classList.toggle('is-motion-paused',paused);
      resume.style.display=paused?'none':'';
      if(paused)render(Math.round(progress*3)/3);else update();
    };
    resume.addEventListener('click',()=>{manual=false;lab.classList.remove('is-manual');if(staticMode())render(Math.round(progress*3)/3,true);else update();});
    lab.classList.add('enhanced');section.classList.add('cinematic-case');
    render(0);
    syncMotion();
    if('IntersectionObserver' in window){
      new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible){update();requestCopyFrame();}else if(copyFrame){cancelAnimationFrame(copyFrame);copyFrame=0;}},{rootMargin:'120px'}).observe(track);
    }
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)requestCopyFrame();});
    stories.push({update,syncMotion,refresh:()=>{render(progress);syncMotion();}});
  });

  // At most one frame for a scroll/resize event. There is no idle animation loop.
  let pending=false;
  let refreshPending=false;
  const requestUpdate=(refresh=false)=>{
    if(motionOff()&&!refresh)return;
    refreshPending=refreshPending||refresh;
    if(pending)return;pending=true;
    requestAnimationFrame(()=>{pending=false;const shouldRefresh=refreshPending;refreshPending=false;stories.forEach(story=>shouldRefresh?story.refresh():story.update());});
  };
  const motionObserver=new MutationObserver(()=>stories.forEach(story=>story.syncMotion()));
  const motionAttributes={attributes:true,attributeFilter:['data-motion']};
  motionObserver.observe(document.documentElement,motionAttributes);
  if(document.body)motionObserver.observe(document.body,motionAttributes);
  window.addEventListener('scroll',()=>requestUpdate(),{passive:true});
  window.addEventListener('resize',()=>requestUpdate(true),{passive:true});
  reduced.addEventListener?.('change',()=>requestUpdate(true));
  compact.addEventListener?.('change',()=>requestUpdate(true));
  shallow.addEventListener?.('change',()=>requestUpdate(true));
})();
