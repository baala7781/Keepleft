# 04 — GPS accuracy, maps, road alignment and data

## Three different truths

1. **Recorded truth:** delivered GPS fixes, timestamps, accuracy, acceptance decisions and segment boundaries.
2. **Measurement truth:** accepted distance, active duration, speed/pace and saved totals.
3. **Presentation:** stabilized replay timing, bounded visual smoothing, optional road alignment and camera movement.

Presentation may improve readability but must not rewrite 1 or 2. The on-screen route can therefore differ slightly from GeoJSON. This is intentional and must remain inspectable, not hidden behind a claim of perfect accuracy.

## Why GPS can appear inside a building

- Satellite blockage/reflection in streets and near tall buildings can place a fix several metres away.
- An accuracy radius is uncertainty, not proof the person was precisely at its centre.
- Sparse fixes joined by a straight line can cut a real corner.
- OSM roads may be split into many ways; sidewalks, small paths, bridges and private roads may be missing or restricted.
- Building footprints may be outdated, offset or incomplete. A roof/upper floor may overhang a passage.
- Screen-width route ribbons become wider in world metres when zoomed out; a line may visually touch a footprint even when its centreline is clear.
- An independent marker snap can differ from the line between samples. Do not assume every apparent crossing is caused by raw GPS.

No setting can guarantee centimetre-accurate consumer-phone GPS. Do not solve this by deleting all sharp turns, globally widening snapping or forcing cycling onto the nearest road.

## 29 September road-display correction

Code: `apps/client-web/lib/renderer/route-presentation.ts` and its adjacent tests.

Existing behavior already projected a point onto a nearby eligible road, used bounded accuracy (8–20 m), rejected ambiguous alternatives, preferred an already supported road through minor jitter, preserved U-turns and followed intermediate vertices. However, road connection only handled one way or two ways with a common junction. A multi-way connection could fail and then draw a raw straight fallback through a building.

New behavior:

- Index connected road vertices while constructing the existing road spatial index.
- If the simple connection fails, search connected sections within the existing distance budget; stop after at most 256 queue iterations.
- Use actual shared vertices rather than joining nearby but disconnected roads.
- Check candidate connections against mapped ground-level building solids, retaining existing courtyard/min-height behavior.
- If no supported connection exists, keep the raw point but mark an intersecting fallback as a **display-only break**. It is better to show uncertain continuity than invent a solid route through a building.
- Keep incremental prefix caching, recording data, stored totals and replay clocks unchanged.

This is conservative local display matching, not global navigation or a reconstruction of the user's exact sidewalk. It may leave gaps when roads are missing, ambiguous, blocked or beyond the search budget. An isolated raw point/marker can still lie inside a footprint if no reliable road match exists. Do not describe this as complete elimination of all building overlap.

The change applies where road alignment is enabled for eligible walking/running display. Cycling, fast legacy replays, demo routes and the original-path view retain their existing non-snapping behavior. Social stickers are generated separately from activity data; this map-world matcher does not rewrite sticker geometry.

Regressions cover multiple road sections around a block, building-crossing fallback, disconnected roads, mapped corners, parallel roads, out-and-back, real gaps, replay seeks, changing accuracy and moving-window cache reuse. The exact private outdoor crossing has not been revalidated on a phone in this handover.

## Speed and pace

- Speed is distance per time, displayed as km/h where selected/appropriate.
- Pace is minutes per kilometre, conventionally used for walk/run. They are not interchangeable.
- Instant GPS speed can fluctuate; `display-speed.ts`/`hybrid-speed.ts` separate presentation smoothing from accepted measurement.
- Poor GPS can pause accepted distance while elapsed time continues according to activity state.
- Selecting cycle vs run matters to filtering; older files without type cannot be confidently reclassified.

Do not average across genuine stops simply to keep a pleasing number. Check source timestamps, reported speed and rejection decisions before changing thresholds.

## Live map data path

`lib/geodata/osm.ts` builds neighborhood queries and normalizes roads, buildings, greenery and water. `service.ts` queries:

- `https://overpass-api.de/api/interpreter`
- `https://overpass.private.coffee/api/interpreter` as fallback

It requests a bounded neighborhood plus locality information, limits response size to 8 MB, and keeps a small in-memory cache (15-minute entries, at most two cached/pending areas as implemented). Native HTTP uses 15-second connect/30-second read timeouts. Public services may be slow, rate-limited or offline; a fallback is not a service-level guarantee.

- Web: `/api/world` on the web runtime forwards public-data requests.
- Android: `CapacitorHttp` plus native map persistence.
- iOS: `CapacitorHttp` plus `keepleft-world-cache` IndexedDB.
- Demo: bundled public fixture/terrain, independent of current phone location.

Approximate query area and network metadata such as IP can reveal where the app is being used. “Activities stay local” must not be shortened to “no location-related information ever leaves the phone.” The app does not include the saved full route or account identity in map requests, but services still see the query. No need to upload a private run to diagnose map loading.

## Offline behavior

GPS can work without an internet connection outdoors. Uncached map geography cannot appear from nowhere. Previously downloaded areas may render from cache; demo rendering does not prove the current area is cached. Cache availability, quota and persistence vary by platform. Do not promise an offline globe or permanent cache retention.

Live terrain is not universally draped: the authored mountain demo uses its DEM; recorded GPS worlds retain their existing flat render plane. Missing heights use estimates; trees/facades are partly procedural, not surveyed individual objects. See `docs/DATA_LICENSES.md` and fixture manifests for provenance.

## Storage and recovery

| Data | Web / iOS | Android |
|---|---|---|
| Completed activities and drafts | IndexedDB `atlas-activities`, schema 2; `activities`, `summaries`, `drafts` | Native `RunDatabase` SQLite: current state, runs, points, maps |
| Geographic cache | IndexedDB `keepleft-world-cache`, `areas` | Native maps table plus web-side cache where used |
| Consent/preferences | localStorage keys plus application state | WebView preferences plus native state |

Retain the `atlas-activities` name despite the Keepleft rename. Changing it would make existing activities appear lost. Draft ownership prevents competing writers from silently overwriting a recovered activity. Only committed checkpoints survive a crash; neither IndexedDB nor SQLite means every last GPS callback is guaranteed saved.

Web data is origin-specific: `localhost:3000`, `localhost:3001` and `127.0.0.1` are separate storage contexts. A changed port can make history appear empty without deleting the old history. Native phone storage is separate from the laptop browser.

## Export and deletion: important limitations

- Single-activity GeoJSON exports accepted route segments, timestamps, active elapsed times, accuracy and top-level distance/duration.
- The current **Export all activities** flattens features from multiple activities into one collection. It does not preserve a full per-activity database snapshot, raw/rejected fixes, all identities/metadata, preferences or maps.
- There is no established user-facing round-trip restore flow for that bulk export. Keep per-activity exports too, and do not call the bulk file a complete restorable backup.
- Export files contain sensitive locations. Keep them privately, not in `public/`, fixtures, Git or packaged assets.
- Delete all removes activity/draft data, cache and selected Keepleft preference/consent keys. It is blocked while an activity is recording/paused. Export first.
- Removing the app/site storage can destroy history; OS backup/restore behavior is platform-specific. Android explicitly disables app backup.

A future proper backup format should preserve activity boundaries/types/metrics/raw provenance, include schema/version validation, and have a tested import/merge conflict policy. This is a release-quality data-safety task, not currently guaranteed by GeoJSON export.
