# Geographic fixture provenance

The Hussain Sagar fixture is a bounded OpenStreetMap extract. It contains real building footprints, road centerlines and the Hussain Sagar water multipolygon (relation 2833155). The demo route follows Tank Bund Road (way 313222139); it is synthetic playback, not a recorded activity or a recommended pedestrian route.

- Source: https://www.openstreetmap.org/
- License and attribution: © OpenStreetMap contributors, ODbL 1.0, https://www.openstreetmap.org/copyright
- Query endpoint: https://overpass-api.de/api/interpreter
- Snapshot: 2026-09-06T01:47:20Z
- The manifest includes the original responses' combined SHA-256 fingerprint.
- The derived GeoJSON and fifteen zoom-12–14 PBF tiles are distributed locally with the app. Demo mode loads these files locally. Opt-in GPS mode loads approximate neighborhood cells through the local `/api/world` route and public Overpass servers; recorded activity trails are not submitted.
- The park/garden response is retained in `apps/client-web/tools/data/hyderabad-greenery.json`; its separate snapshot timestamp, SHA-256 and feature count are in the manifest.

Reproduction queries:

    [out:json][timeout:30];(way["building"](17.408,78.463,17.437,78.49);way["highway"](17.408,78.463,17.437,78.49);way["natural"="water"](17.4,78.455,17.447,78.505););out geom;

    [out:json][timeout:30];rel["natural"="water"](17.4,78.455,17.447,78.505);out geom;

Additional park/garden query:

    [out:json][timeout:20];wr[leisure~"^(park|garden)$"](17.4,78.455,17.447,78.505);out geom;

Save the first two responses as JSON and run, from apps/client-web (Node 24 supports the shared TypeScript normalization module):

    node tools/build-fixture.mjs /path/to/ways.json /path/to/water.json tools/data/hyderabad-greenery.json

Height semantics: explicit OSM heights take precedence, feet are converted to meters; building levels use 3.2 m per level. Missing heights use repeatable, visibly disclosed estimates based on building type and feature ID (for example, sheds are shorter than apartment estimates). Heights are bounded to 2–300 m in normalization; rendering no longer forces a 3 m minimum and respects normalized vertical offsets. No DEM elevation is supplied. Full building rings and lake/park holes remain in GeoJSON; vector tiles use clipped/generalized geometry at extent 4096 with a 64-unit buffer.

Building metadata includes mapped parts, minimum heights, supported roof shapes, roof direction/orientation and valid colors. Roof dimensions without source values are estimated; safety bounds can simplify unusual roofs. Live queries now include `building:part`. The saved fixture was regenerated from its existing source responses, not a new survey; it cannot add features absent from those responses. Procedural facade windows and tree placements are decorative approximations, not surveyed architecture or individual-tree locations. Trees are restricted to eligible mapped green polygons and avoid building/road buffers.

The building-part and roof geometry pipeline uses the MIT-licensed `polygon-clipping` package (0.15.7); its dependency license is separate from the ODbL geographic data license.

Live neighborhood queries also include tagged woods, grass, meadows and other mapped green areas. Public endpoints and their usage policies are documented at https://wiki.openstreetmap.org/wiki/Overpass_API. The fallback endpoint is https://overpass.private.coffee/api/interpreter.

Production ingestion will use the separate Overture/PMTiles pipeline described in the PRD.

## Animated athlete (0.1.2)

The bundled `apps/client-web/public/models/keepleft-athlete.glb` uses Quaternius CC0
Universal Base Characters and Universal Animation Library assets. The in-package
`public/models/NOTICE.md` records original sources, redistribution commit, SHA-256
checksums, author/license links and modifications. `scripts/prepare-athlete.mjs`
rebuilds the 1.6 MB texture-free kit from the two source GLBs. Idle, walking, jogging
and sprinting are generic authored animation clips; this is not a personal avatar.

Route-only photo stories and GIF stickers contain the recorded path, not OSM buildings
or map tiles. Selected photos stay on the user's device; the user chooses if and where
to share the output. Keepleft does not gain rights to their photo. The MIT-licensed
gifenc 1.0.3 encoder's license is bundled in `public/licenses/gifenc.txt`.
