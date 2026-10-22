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
