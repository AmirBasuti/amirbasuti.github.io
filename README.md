# Amir Basuti — Research / Engineering

Separate academic and professional portfolios: [amirbasuti.github.io](https://amirbasuti.github.io/).

- **Research:** selected papers, case studies, education and research interests.
- **Engineering:** backend/data/interface work and an interactive, sourced public-data example.
- **SHL:** an original 3D handset and persistent signal ribbons, driven by native scrolling, with optional playback and manual exploration.
- **FoG and clinical gait:** schematic method journeys, chapter controls and readable method notes.
- **Homepage:** an academic profile with selected research and papers; technical detail sits beneath the main reading path.
- The academic and engineering sections have separate introductions, content and motion. Only navigation links connect them; employer work is absent from the research profile, and research is absent from the engineering portfolio.

The site uses static HTML, CSS, JavaScript and local assets. No build step, runtime framework, external fonts or analytics is required. The SHL illustration lazily loads a locally vendored Three.js r180 renderer; readable content and an original static phone remain available without WebGL. Motion is event-driven, stops when it has no work, and respects reduced-motion preferences. Publish `main` from the repository root with GitHub Pages.

Accepted work is distinguished from confirmed publication. Only the SHL author manuscript is included; other selected papers have metadata and accurate acceptance status. Research illustrations and interface sketches are labeled and are not patient recordings or live model outputs.

## Data and asset sources

The engineering chart uses a dated ECB reference-rate snapshot, in **USD per one EUR**. It is not a live quote, Iranian cash-dollar rate, retail execution price or gold-price history. Source, retrieval time and reuse terms accompany the data. Derived changes are computed from those reference observations. No unlicensed provider history or private employer data is included.

The SHL manuscript and rendered Figure 1 are by Mohebbi et al. (2026), *Early and Late Fusion of Frozen Foundation Models for IMU-Based Human Activity Recognition*, **CC BY 4.0**. The figure shows study alternatives; the case study identifies the selected final three-model late fusion.

University marks identify the listed education affiliations. Unmodified source assets: [University of Tehran](https://ut.ac.ir/images/www/en/website/original/2024/663f1e1ba65e1-1676967694-ut-logo-en.png), [Kharazmi University](https://khu.ac.ir/templates/tmpl_modern01/images/main_logo.png).

## Motion and content revision — October 2026

The SHL film keeps one phone and nine ribbons in one camera view. Ribbons emerge from screen coordinates, spread into a five-second window, gather into three illustrative model streams and converge around a Walking example. Geometry is updated in place, the render resolution is capped, and the animation stops after settling or leaving view. The phone, studio environment, screen texture and all other illustrations are original. The example describes the method; it is not recorded sensor data or a model prediction.

The composition takes inspiration from the restrained product presentation on [Apple's AirPods page](https://www.apple.com/airpods-pro/). [Drei ScrollControls](https://github.com/pmndrs/drei/blob/master/src/web/ScrollControls.tsx) and [14islands scroll rig](https://github.com/14islands/r3f-scroll-rig) informed overlapping progress ranges, damping and DOM-aligned visuals. No Apple assets or clone code are included. Three.js is the only new dependency; its [MIT license and pinned source](vendor/three-r180/README.md) are included.

Research and engineering retain separate content. Larger HTML text, fewer decorative labels and expandable technical notes keep the main reading path clear. Reduced motion uses direct manual views. The other research and engineering scenes use original SVG/CSS artwork.

This visual revision was reviewed in the browser and by reading the source. Automated tests and lint suites were not run for this change, as requested by the site owner.
