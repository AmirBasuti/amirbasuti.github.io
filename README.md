# Amir Basuti — Research / Engineering

Separate academic and professional portfolios: [amirbasuti.github.io](https://amirbasuti.github.io/).

- **Research:** selected papers, case studies, education and research interests.
- **Engineering:** backend/data/interface work and an interactive, sourced public-data example.
- **SHL:** an original 3D handset and persistent signal ribbons, driven by native scrolling, with optional playback and manual exploration.
- **FoG:** a grounded animated person, an illustrative interruption of stepping, movement-derived traces, frozen-model fusion and an offline window label.
- **Clinical gait:** a schematic method journey with readable method notes.
- **Homepage:** the name first, a separate academic introduction next, then focused research sections and papers. The engineering page uses its own separate professional introduction.
- The academic and engineering sections have separate introductions, content and motion. Only navigation links connect them; employer work is absent from the research profile, and research is absent from the engineering portfolio.

The site uses static HTML, CSS, JavaScript and local assets. No build step, runtime framework, external fonts or analytics is required. The SHL and FoG illustrations lazily load a locally vendored Three.js r180 renderer; readable content and original static illustrations remain available without WebGL. Motion is event-driven, stops when it has no work, and respects reduced-motion preferences. Publish `main` from the repository root with GitHub Pages.

Accepted work is distinguished from confirmed publication. Only the SHL author manuscript is included; other selected papers have metadata and accurate acceptance status. Research illustrations and interface sketches are labeled and are not patient recordings or live model outputs.

## Data and asset sources

The engineering chart uses a dated ECB reference-rate snapshot, in **USD per one EUR**. It is not a live quote, Iranian cash-dollar rate, retail execution price or gold-price history. Source, retrieval time and reuse terms accompany the data. Derived changes are computed from those reference observations. No unlicensed provider history or private employer data is included.

The SHL manuscript and rendered Figure 1 are by Mohebbi et al. (2026), *Early and Late Fusion of Frozen Foundation Models for IMU-Based Human Activity Recognition*, **CC BY 4.0**. The figure shows study alternatives; the case study identifies the selected final three-model late fusion.

University marks identify the listed education affiliations. Unmodified source assets: [University of Tehran](https://ut.ac.ir/images/www/en/website/original/2024/663f1e1ba65e1-1676967694-ut-logo-en.png), [Kharazmi University](https://khu.ac.ir/templates/tmpl_modern01/images/main_logo.png).

## Motion and content revision — October 2026

The SHL film keeps one phone and nine ribbons in one camera view. Ribbons emerge from screen coordinates, spread into a five-second window, gather into three illustrative model streams and converge around a Walking example. Geometry is updated in place, the render resolution is capped, and the animation stops after settling or leaving view. The phone, studio environment and screen texture are original. The example describes the method; it is not recorded sensor data or a model prediction.

The composition takes inspiration from the restrained product presentation on [Apple's AirPods page](https://www.apple.com/airpods-pro/). [Drei ScrollControls](https://github.com/pmndrs/drei/blob/master/src/web/ScrollControls.tsx) and [14islands scroll rig](https://github.com/14islands/r3f-scroll-rig) informed overlapping progress ranges, damping and DOM-aligned visuals. No Apple assets or clone code are included. Three.js is the only new dependency; its [MIT license and pinned source](vendor/three-r180/README.md) are included.

FoG uses the earlier simple CC0 Quaternius full-body character, with muted colors and its authored walking and idle clips. The derivative removes unused clips and is 438,484 bytes with no texture images; source, license and hashes are retained in [the model credits](assets/models/README.md). The model is loaded lazily and does not add a runtime decoder. The four normalized traces come from the same animated ankle, lower-back and wrist trajectories. They are illustrative kinematics, not recorded IMU measurements, patient movement or clinical performance. All four placements contribute to both illustrative model streams before the offline window label. Invisible ribbons are not rebuilt; rendering stops when the view settles or leaves the screen. The more detailed human asset is retained for provenance but is no longer requested.

The engineering example retains one SVG plot and its actual dated ECB observations throughout the reveal. The source points become the inspectable history without changing their values or dates. Three smaller canvas scenes explain a visible connection gap, retrieval of older history and preserved decimal precision. These are original illustrative mechanisms, separate from employer records. Native chart controls, static fallbacks and keyboard access remain available.

Research and engineering retain separate content. Larger HTML text, fewer decorative labels and expandable technical notes keep the main reading path clear. A shared copy controller fades the current paragraph out, changes it at zero opacity and fades the next one in. It finishes after scrolling stops, coalesces fast changes and keeps only one paragraph visible. Reduced motion uses direct manual views. Rendering stops after motion and copy settle or leave view.

The identity and introduction use distinct viewport-sized views. Native scrolling changes the active view with a completed temporal fade, and each project introduction has its own reading space. On smaller or shorter screens, with reduced motion, or when content will not fit, the same panels remain stacked in normal document flow. The hidden panel is inert in the enhanced layout; keyboard focus and direct anchors reveal the intended content.

This visual revision was reviewed in the browser and by reading the source. Automated tests and lint suites were not run for this change, as requested by the site owner.


## Focused chapter transitions

Primary reading views share a short temporal handoff: the outgoing view reaches zero opacity before the next view enters, and the transition finishes after scrolling stops. The first identity/intro pair retains its discrete presentation, including separate full-height panels on mobile. Project grounds distinguish SHL (paper), FoG (pale sage) and clinical gait (dark green), with matching readable text. The scene position number and slim progress line come from the existing animation controllers. Native scroll tracks are shorter (identity230svh, research scenes260svh desktop/240svh mobile, engineering data210svh where pinned). No scroll interception or snapping is used.

Explicit initial anchors are resolved after startup track layout, unless the reader already interacted. Keyboard focus can reveal its reading view; reduced-motion and paused motion preserve ordinary visible content and automatic track heights. Short reading blocks keep normal document flow. The shared module runs only for scroll, layout, focus or the brief fade; there is no permanent frame loop or new asset/runtime dependency. The approved simple FoG figure and all evidence/statuses are preserved.


Mobile review covers browser viewports320×740,390×844,430×932,844×390 and667×375. The manual research-scene panel anchors to the entire controls row so it stays within narrow screens. Scene counters initialize from the selected article before any scrolling. Homepage navigation has44px touch targets. Short landscape scenes use a compact two-column composition with the full figure and controls visible; research-case scene anchors cancel the30px reading offset so viewport controls are not cropped. Visual/browser review also covered papers/contact, chapter handoff, paused motion and the engineering observation slider. This is viewport verification, not physical-device or Safari certification.

## Scroll spacing correction — October 22, 2026

Project and engineering introductions now use their content height with one spacing owner, rather than reserving an entire viewport plus nested intro padding. Incoming chapter scenes reveal when entering the readable viewport instead of waiting until the track midpoint. The identity-to-introduction sequence retains its timing; only the measured unused tail beneath the introduction's last line is reclaimed, capped at28% of viewport height with48px clearance. Non-pinned introductions use natural content height.

Browser visual review covered desktop1536×950 and1600×1100, plus390×844 mobile. The previously empty clinical intro now leads directly into its visible visualization (302px intro at1100px viewport height), and the mobile FoG intro occupies441px rather than a full viewport. The approved character, phone, signal geometry, model assets, research claims and motion track durations are unchanged. No automated tests/build/lint were run, as requested.

## Refinement — October 23, 2026

Long reading sections (interests, papers, experience, contact, case-study method text) no longer take part in the one-view-at-a-time chapter fade. Before this change, they faded to blank while their text still filled the screen. Pinned scenes keep the earlier early-reveal handoff. The header switches to a dark translucent treatment over the clinical and contact chapters (`header-tone.js`). The clinical chapter keeps one dark ground: the cream caption band was removed, the frame's right edge fades instead of clipping, and its method toggle has readable contrast. The research introduction adds three verifiable highlights: 1st place at the SHL 2026 Challenge, three 2026 papers and three sensing problems. Both pages have Open Graph preview images (`assets/social/`). The approved motion geometry, assets, statuses and claims are unchanged. Browser visual review covered 1440×900 desktop and 390×844 mobile using local headless Chrome. No automated tests, build or lint were run.

## Chapter stages — October 23, 2026

At the owner's request, each research project and the interests section now open like the name introduction. One pinned stage shows the title alone. After a timed fade, it shows the project statement and links. The project's animation is pulled up beneath the stage with a negative top margin, and `chapter-flow.js` hands off only when the stage releases. The statement therefore fades out and the animation fades in at the same place. The stages reuse `focus-stage.js` and its existing switch timing. Their 200svh tracks are shorter than the name intro's 230svh. A stage that hands off skips the tail trim. On small or short screens, with reduced motion, or with motion paused, stages fall back to ordinary headed sections, and no overlap is applied. Papers, experience and contact are longer than one screen, so they keep normal scrolling. Visual review covered 1440×900 and 390×844 with local headless Chrome, and link hit-testing was checked on the overlapped stage. No automated tests, build or lint were run.

## Engineering refresh — October 23, 2026

At the owner's request, the engineering page was restyled with a neutral graphite and white palette. It uses one signal-blue accent (#4da3ff) and amber highlights (#ffb547), replacing the muted dark-green scheme, so it reads as distinct from the academic paper/sage profile. Headings use the academic profile's 600 weight. The ECB chart sits in a framed instrument panel, and its line, points and cursor are recolored. Contributions sit on a light band, and each illustrative mechanism plays on its own dark rounded screen. Experience is white, and contact returns to graphite. Styling lives in `engineering/refresh.css`. Script edits are limited to color literals in `continuous-scene.js` and `engineering.js`; data, geometry, timing and copy are unchanged. The engineering Open Graph card was re-rendered in the new palette. Visual review covered 1440×900 and 390×844 with local headless Chrome. No automated tests, build or lint were run.

## Showcase visuals rework — October 23, 2026

At the owner's request, the showcase visuals were reviewed and reworked.

- **Engineering:** the three mechanism scenes are now small illustrative interfaces drawn on canvas (`engineering/continuous-scene.js`), with the same controller, stage timing and copy:
  - a stream that drops (socket closed, cleanup, retries), resubscribes and keeps the missing interval empty, with a client log;
  - a price-history chart that zooms from a monthly to a daily range with finer detail, then loads older history, shown on an overview strip;
  - one exact decimal (123.4500) passing from SQLite through an Alembic migration to PostgreSQL NUMERIC and a typed Pydantic response.

  The values are illustrative, not employer data.
- **Clinical gait:** the boxes-and-arrows SVG world is replaced on the homepage by a continuous canvas scene (`research/clinical-scene.js`). A walked trial (straight, U-turn, straight) leaves footprints and a signal. The signal opens into 24 channels, and a 2 s window turns them into frozen NuTime fingerprints. These pool into mean/max/min/std for one participant, and a balanced logistic-regression head places that participant (2 classes, 3 classes, 8 cohorts). The SVG remains as the static fallback, and chosen stages show their completed state.
- **SHL and FoG:** a 2D annotation layer (`research/scene-overlay.js`) follows the 3D geometry, and the approved phone and character are unchanged.
  - SHL: sensor names, a 5 s window frame (500 samples per channel), model names and the fusion weights 0.54/0.29/0.17. Each model stream now carries one channel from every sensor, so no stream implies a single-sensor model.
  - FoG: lane names (UniShape, MantisV2) with cross-attention, and a row of 2 s windows at a 0.5 s hop that replaces the blurry textured label.

Visual review covered 1440×900 and 390×844 with local headless Chrome. No automated tests, build or lint were run.

## FoG figure redo — October 23, 2026

At the owner's request, the visible Quaternius character was replaced by a smooth, faceless studio mannequin. It has rounded limbs, a plain head and mitten hands, with two-tone clothing colors. The CC0 model still loads, invisibly. Its skeleton and the same authored walking/idle blend drive the mannequin every frame, so the motion and the movement-derived traces are unchanged. The view is now near-profile. Sensor pods sit on the body surface with depth testing: the outer ankles, the center of the lower back (on the back, not showing through the front) and the right wrist. Each trace starts at its pod. Visual review covered 1440×900 and 390×844 with local headless Chrome.

## FoG point-light walker and freezing episode — October 23, 2026

This supersedes the mannequin above. At the owner's request, the FoG figure is now a point-light walker drawn on the 2D layer. It shows 13 joint points plus the lower-back placement, with faint links, and no body, face or hands. The hidden CC0 skeleton still drives every point.

The motion was restructured so the freeze is visible. A procedural, illustrative episode in `fog-motion-data.js` runs in this order:
- normal walking;
- shorter, faster steps (festination);
- a freeze from 3.0 to 5.2 s, with the feet planted, small alternating heel lifts, the knees trembling at about 5.2 Hz and the trunk leaning forward;
- walking resumes.

Edited bones are reset to rest before every pose. The movement-derived traces are sampled from this same motion, so the ankle traces show the freeze burst. The labeled FoG window is the 3.0–5.0 s window on the 0.5 s hop grid. Footfall marks are taken from the sampled foot contacts, and they cluster (amber) where the feet stay planted. While the reader rests on the freeze step, the tremble continues in real time; this is the only live loop, and it stops off screen, with reduced motion or with motion paused. The step copy now reads "Then the feet freeze." This is a schematic illustration of one form of FoG, not patient data. Visual review covered 1440×900 and 390×844 with local headless Chrome, plus a frame-to-frame check that the tremble keeps moving when scrolling stops.

## FoG freeze callout — October 23, 2026

This supersedes the tremble/lean motion above. At the owner's request, the exaggerated knee tremble, heel lifts, trunk lean and live tremble loop were removed. The figure now walks, takes shorter steps, stops with the feet planted from 3.0 to 5.2 s, then walks again. During the freeze step, the legs highlight in amber. A callout box with a leader line points to the lower leg: "Freezing happens in the legs. The feet feel stuck to the floor; the next step does not start." The sequence then moves on to the signals. The step copy reads: "Steps shorten, then stop. The person means to walk, but the legs do not start the next step." No real-time loop remains. Visual review covered 1440×900 and 390×844.

## Academic design system and content — October 23, 2026

**Type and layout.** Inter (variable, Latin subset, SIL OFL 1.1) is self-hosted in `assets/fonts/`, with its source, hash and licence recorded there. `typography.css` defines one type ramp (display, title card, section, scene, card, lede, body, label) and a 13px floor for readable text; the chapter progress indicator stays at 12px. It also sets one 1200px container shared by the header, sections, scene copy and clinical copy, giving a single left edge. Labels share one style.

**Content.** The owner delegated the choice. Following common academic-site practice (distinctions listed, grades left to the CV), these were added from the owner's 30 September 2026 academic CV:
- an Honors list: SHL 2026 1st place, Exceptional Talents admission, ranked 2nd in the BSc CS cohort, and Tech Olympics finalist (AI / Text Processing, 2025);
- the current University of Tehran research role;
- the research mentor for the sampling project;
- three named teaching courses with terms and instructors;
- the MSc supervisors and the expected completion date (September 2027).

The redundant BSc line and the empty papers aside were removed. GPA values, course grades and the Milli contest were deliberately not added.

Visual review covered 1440×900 and 390×844 with local headless Chrome. No automated tests, build or lint were run.

## Publications redesign — October 23, 2026

At the owner's request, the boxed paper cards were replaced by an editorial list (header "Papers.", with a one-line lede). Each row has:
- an original SVG thumbnail in its project's palette and motif (SHL ribbons, the clinical U-turn path, the FoG point-light walker with highlighted legs), linking to that scene;
- the venue, with a status dot (green for accepted, amber for accepted with mandatory revisions);
- the title and authors;
- a factual one-line summary;
- a "My part" line for SHL and FoG, taken from the owner's CV (none is stated for SPMB);
- the existing links and citation buttons.

The statuses, authors, DOI and the permitted manuscript are unchanged. Visual review covered 1440×900 and 390×844.

## Engineering design system and content — October 23, 2026

The same process as the academic page was applied to `/engineering/`.

**Type and layout.** `engineering/type.css` uses the self-hosted Inter, the same type ramp, the same 1200px container and the 13px floor for readable text.

**Chapter stages.** The public-data chapter and the contributions chapter now open with the name-style stage: a title card, then a statement. The ECB chart is pulled beneath its stage and takes over in place (desktop with pinned scenes only), and stages fall back to headed sections on small screens.

**Content.**
- A new Independent projects section with three public repositories, each with its stated current status taken from its README:
  - research-notebook (CI on Python 3.11–3.14);
  - Accounting-system (Go/PostgreSQL/GORM, integration tests, no HTTP API yet);
  - Notification-System-and-Transaction-Reports (a Django/Celery/Redis/MongoDB development demo with simulated delivery and no tests yet).
- A recognition line: Top 100 finalist, Golden Code programming contest, Milli (2025), from the owner's CV.
- The contributions statement was tightened.

No employer records, internal systems or confidential details were added. Visual review covered 1440×900 and 390×844 with local headless Chrome. No automated tests, build or lint were run.

## Engineering motion at every size, stack section — October 23, 2026

- **Scroll animation at every size.** Engineering scenes previously animated only at 960×760 and larger; elsewhere they jumped to their final frame. The chart still pins at that size. On other screens, the chart and the three interface scenes now advance as their artwork scrolls through the viewport. Reduced motion still shows the final frame.
- **Chart card.** The series selector no longer clips its label.
- **Chart chapter statement.** It now explains the demo's purpose: the same care as the day job, applied to public ECB data.
- **New section: "Tools, in context."** Tools are grouped by the work they served, never as a bare list. Five groups cover work at Milli; one covers the independent projects. Only tools evidenced by the owner's CV, the page or the public repositories are listed.

Review covered 760×900, 1440×900 and 390×844.

## Engineering: Milli gold price chart and scene timing — October 23, 2026

**Chart data.** At the owner's request, the chart now shows Milli's public gold price per milligram, in Iranian rials. The source is `https://milli.gold/api/v1/public/milli-price/widget`, with DAILY (15 min), WEEKLY (about 2 h) and MONTHLY (about 8 h) series shown as Last 24 hours / 7 days / 30 days. Times are Tehran time.

The unit was verified against milli.gold's own page: the API values × 1000 equal the displayed per-gram rial prices. The endpoint currently sends no CORS header, so the page tries it live (with a 5 s timeout) and otherwise uses `engineering/milli-price.json`. That snapshot was retrieved 23 Oct 2026 11:47:42 UTC, and its response SHA-256 is stored in the file. If the endpoint allows `https://amirbasuti.github.io`, the chart becomes live with no code change.

The labels name the source and the employer relationship, and state that the chart and animation are the owner's own demonstration, not Milli's production interface. The previous ECB snapshot (`market-data.json`) is retained as provenance but is no longer loaded. The engineering Open Graph card was redrawn from the 30-day snapshot.

**Timing.** Unpinned scenes (the interface cards at every size, and the chart below 960×760) now wait at their first frame until the artwork is at least 85% visible, then play from the beginning, resuming if interrupted. The desktop pinned chart still follows scroll.

Review covered 760×900 and 1440×900.

## Engineering scenes follow scroll — October 23, 2026

This supersedes the time-based autoplay above. At the owner's request, every engineering scene is scroll-scrubbed, forward and back.
- **Interface cards.** Each card sits in a `.mechanism-stage` with a 62vh runway. It pins (sticky) once fully on screen, and its progress is the runway's travel past it. Below 620px height, or with reduced motion, it stays unpinned.
- **The Milli chart.**
  - It pins at 960×760 and above, as before.
  - It also pins on narrow screens at least 880px tall, where copy and card fit.
  - Elsewhere it is unpinned and advances with scroll, starting only once fully visible.

Review covered 760×900, 1440×900 and 390×844.
