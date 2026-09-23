# Keepleft athlete

Character and animations by Quaternius, CC0 1.0 Universal (public domain dedication).
License: https://creativecommons.org/publicdomain/zero/1.0/

Author's packs:
- https://quaternius.com/packs/universalbasecharacters.html
- https://quaternius.com/packs/universalanimationlibrary.html

Keepleft modifications: texture-free vertex-colour sports kit, metre-scale normalization,
four locomotion clips retargeted to the shared UE skeleton, removal of root displacement.
This is a generic athlete, not a likeness generated from a user's photograph.

Source files were retrieved from a pinned redistribution containing the author's CC0 notices:
https://github.com/Seyamalam/blood-league-kickoff/tree/aa02a4e6d8337a0604d2da131bcbbeb1f01badf0/public/assets/vendor/quaternius

- night-striker.glb: SHA-256 a466828c67a4acc9b2413212ce6d9cde235e3aed9b675680c14fd9673858f118
- universal-animation-library.glb: SHA-256 4c748767741a3e495d89667b9a218b690ba9810b9517a12e960780e3ca72c4e9
- keepleft-athlete.glb: SHA-256 9ee8d58f1f9d9d504a0975b573247c7c58bf042ce11e19b0c65da11ad0ac27fd

Reproduce using scripts/prepare-athlete.mjs in the repository, passing the base GLB,
animation GLB, and output path. No animation or character downloads occur at runtime.
