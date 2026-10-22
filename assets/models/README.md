# Character asset

`quaternius-man.glb` is **Man by Quaternius**, released under **CC0 1.0**.

- Source listing: https://poly.pizza/m/HMnuH5geEG
- License: https://creativecommons.org/publicdomain/zero/1.0/
- Original GLB: https://static.poly.pizza/3746be88-6799-4817-929b-6bc067c47caa.glb
- Original byte size: 493,196
- Source SHA-256: DAD8FA3CA2BC7760892F9FF47F544941179E50ACB2AA772CF9F035154A37FC58

The site uses the authored `HumanArmature|Man_Walk` and
`HumanArmature|Man_Idle` skeletal animations. Materials are recolored at
runtime; the supplied model is a generic character, not a portrait.

The FoG illustration samples ankle, lower-back and wrist joint movement at
60 Hz from the same animation blend and contact correction that it displays.
The resulting normalized kinematic curves are illustrative, not FoG-STAR
recordings, clinical inertial measurements, or model predictions.

The supporting GLTFLoader and BufferGeometryUtils are from official Three.js
release r180, under `vendor/three-r180/LICENSE` (MIT). Their sole source edit
changes the bare `three` imports to the matching vendored module path.
