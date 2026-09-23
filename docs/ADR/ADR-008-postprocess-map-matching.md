# ADR-008: Post-process map matching

Accepted. Raw filtered GPS remains the source of truth during recording. Map matching is a replaceable post-processing stage for route presentation and replay; it must never block capture or overwrite original samples.

## 0.1.4-test: bounded local display alignment

The renderer may align displayed samples and the position marker to an unambiguous road within 8 metres, using only the already-loaded neighborhood. It follows vertices on the same road or two roads with an actual shared mapped junction, preserves reversals, rejects inferred links through ground-level building footprints, and falls back to the original path when unsupported. Bridges, tunnels, major limited-access roads and explicitly prohibited pedestrian ways are excluded. This is not navigation, comprehensive network matching, or proof of the user's exact location.

Recording segments remain separate. Only short breaks whose endpoints are within 10 metres and have a clear mapped connection of at most 18 metres get a dashed display connector. This is an inferred connection, not recorded movement; longer or unsupported gaps remain open. No distance or time is added. An in-app toggle disables display alignment and connectors. Stored samples, reported activity totals, GeoJSON exports and photo-story routes remain unchanged.

The road/building spatial indexes and incremental route-prefix cache bound routine work. Native capture remains independent of this renderer. Display line updates are throttled with worker backpressure; geometry is not allocated per recorded point.
