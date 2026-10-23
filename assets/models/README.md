# Character assets

## Current simple FoG figure

`fog-simple-person.glb` restores the earlier **Quaternius Man**, under CC0 1.0,
with the original connected body and skinned limb motion. The derivative keeps
only the authored walking and idle clips and removes unused data. The page uses
muted material colors and no image textures. No new runtime dependency is added.

- Size: 438,484 bytes (original 493,196 bytes).
- SHA-256: `5cf00b7ff1f4efa66e4044bd7ac2dc8fc9e8a7b22eadf321c687a935d04168a9`
- Source: https://poly.pizza/m/HMnuH5geEG
- License: https://creativecommons.org/publicdomain/zero/1.0/

The same walk-to-idle blend and grounding generate the four illustrative
movement traces. They are not recorded IMU data or clinical performance evidence.
The more detailed Innerscene figure below is retained but is no longer loaded.

## Retained detailed figure

`fog-person.glb` is an optimized adaptation of **Relaxed walk — Maya** by
Innerscene, built from MakeHuman/MPFB CC0 body, rig and skin assets. The source
is explicitly dedicated to **CC0 1.0**, including modification and redistribution.

- Source: https://www.innerscene.com/tools/library/3d-parts/relaxed-walk-maya-3d-person-animated-2c6669a2
- Download: https://www.innerscene.com/api/library/relaxed-walk-maya-3d-person-animated-2c6669a2/download
- License: https://creativecommons.org/publicdomain/zero/1.0/
- Original: 20,528,440 bytes; SHA-256 `99cc9ebfa208a57880e419978e898e662bc88e6fd6c9a320a4a3a39e69721fba`
- Web adaptation: 1,000,340 bytes; SHA-256 `6f9507f0d0c3cf73194515abd1da42a519d5d986d8e63163404e4b386fa96f68`

The web adaptation retains 19,817 triangles, the rig and the original two-second
`Walk_Relaxed` animation. Body color texture is 512 px; other textures are
256 px, with alpha retained for hair, lashes and eyebrows. Geometry is simplified
and quantized; neutral ivory/slate materials replace the source outfit colors.
No Draco or Meshopt runtime decoder is needed. This model was used in the prior detailed revision and is no longer loaded by
the current scene.

This is an authored animation, **not motion capture**. Its timing is adapted to
settle at a support pose for one illustrative interruption. The same pose and
contact correction supply the ankle, lower-back and wrist trajectories sampled
at virtual 60 Hz. The curves are illustrative kinematics, not measured IMU units,
patient data, a clinical reconstruction, or predictions. The generic person is
not a portrait of the site owner.

## Original simple character

`quaternius-man.glb` is **Man by Quaternius**, released under **CC0 1.0**.

- Source listing: https://poly.pizza/m/HMnuH5geEG
- License: https://creativecommons.org/publicdomain/zero/1.0/
- Original GLB: https://static.poly.pizza/3746be88-6799-4817-929b-6bc067c47caa.glb
- Original byte size: 493,196
- Source SHA-256: DAD8FA3CA2BC7760892F9FF47F544941179E50ACB2AA772CF9F035154A37FC58

The previous revision used the authored `HumanArmature|Man_Walk` and
`HumanArmature|Man_Idle` clips. This earlier asset is retained for provenance;
the current scene loads the smaller derivative described above.

The FoG illustration samples ankle, lower-back and wrist joint movement at
60 Hz from the same animation blend and contact correction that it displays.
The resulting normalized kinematic curves are illustrative, not FoG-STAR
recordings, clinical inertial measurements, or model predictions.

The supporting GLTFLoader and BufferGeometryUtils are from official Three.js
release r180, under `vendor/three-r180/LICENSE` (MIT). Their sole source edit
changes the bare `three` imports to the matching vendored module path.

## Use since 23 October 2026

The model's meshes are hidden. Its skeleton and authored walking/idle clips drive the original faceless mannequin in `research/fog-scene.js`; no Quaternius geometry is visible.

Since the later 23 October revision, the same hidden skeleton drives a point-light walker. A callout explains the freeze; no procedural tremble is applied.
