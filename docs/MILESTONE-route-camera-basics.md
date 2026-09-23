# Route and camera basics — 0.1.4-test

## Delivered

- Replaced the faint world-unit ribbon with a 5 CSS-pixel dark blue MapLibre line and 8-pixel pale outline. Round joins avoid the old reversal geometry problem. The line remains on the ground, not painted over building roofs.
- Added conservative display-only matching against already-loaded roads: an unambiguous candidate within 8 m, actual mapped corners/junctions, building-crossing rejection and an original-path toggle. See ADR-008 for bounds and exclusions. Native recording, activity totals, persisted samples and exports are unchanged.
- Preserved recording breaks. Only short breaks supported by a clear connected road get a dashed inferred connector; unsupported gaps remain open.
- Follow starts behind the runner. Both tracking modes apply obstruction-aware automatic framing until the user adjusts it. Manual tilt, zoom and relative bearing are retained; a temporary pan no longer permanently offsets tracking. Reset view restores automatic framing. No oval cutaway or new bulb effect.
- Fixed a genuine mobile gesture conflict: disabling MapLibre panning restored browser touch scrolling and cancelled one-finger angle drags. The map canvas now explicitly owns these touch gestures; pinch still belongs to MapLibre.
- Added collapsible activity/replay details while retaining essential playback/recording controls. The timeline thumb now receives its accessible label.
- The small estimated-position dot remains visible through foreground geometry outside Third person. It is not a precision claim or road-navigation instruction. Athlete assets/artwork are unchanged.

## User recording inspection

The supplied September 13 GeoJSON was read locally only, not uploaded, edited, or used to fetch private-area maps. It contains 177 accepted points in six segments over 234.5 seconds, with five explicit breaks. Three break endpoint separations are approximately 2–4 m; the others are approximately 7 m and 16 m. The stored total, approximately 1,237.5 m, agrees with the sum within recorded segments.

The export lacks rejected fixes, provider IDs and break reasons. It therefore cannot establish why every break or excursion occurred, or prove the user's actual movement. This slice does not change capture filtering or retroactively correct distance.

## Verification

- TypeScript and 164 shared/web tests in 32 files passed. Route tests cover corners, shared junctions, turnarounds, ambiguous parallel roads, restrictions, building intersections, recording gaps, seeks and incremental cache invalidation.
- Focused source lint passed for the route/camera helpers, renderer, normalization, replay controls and slider. General repository lint remains unclean, including pre-existing React compiler/ref patterns in the experience component; no whole-repository clean-lint claim.
- Mobile and browser production builds passed. Android debug assembly, unit-test task and Android lint passed; unchanged native tests were reused from Gradle's valid cache (10 focused checks plus one template check). Existing build/lint warnings remain.
- Isolated Chrome mobile-touch acceptance used only the public synthetic Hyderabad fixture, with outside network requests blocked. It verified one-finger tilt, retained Follow/Third-person tilt, selected-mode retention, replay seeking, expanding/collapsing details and bounded geometry counts.
- On a 393 × 852 test viewport, the replay dock reduced from 334 px to 132 px. Final software-rendered sample: 30 FPS, six Three.js draw calls, 54,934 triangles, nine geometries. Five geometry samples remained at nine. This is not a Pixel GPU, battery, thermal or total-heap measurement.
- Synthetic desktop route benchmark: 4,096 points and 3,688 building forms; about 11 ms index construction, 14 ms initial route, 0.06 ms median / 0.19 ms p95 moving-tip update. These are desktop observations, not device guarantees.
- APK package `app.keepleft.mobile`, versionCode 5, versionName `0.1.4-test`. Signature matches the prior test APK; packaged entry point matches the final accepted mobile build. No database migration or identity change.

## Remaining acceptance / limits

Install over the previous test version; do not uninstall if keeping local runs. Verify a saved run and a short outdoor walk on Pixel 7: manual camera tilt/zoom, recenter after panning, route contrast, alignment on/off, replay seeking and collapsed recording controls. Manual framing can intentionally select an obstructed view; Reset restores automatic framing. Matching is limited by map coverage and GPS uncertainty and is not a comprehensive road network or navigation service.

Phone/background-capture, recovery and native-export qualification remains required. Known dependency advisories and repository lint issues remain public-release blockers. No additional building art, health imports, cloud services or new product features were introduced in this slice. Next product milestone remains the focused finish summary after this usability update is accepted.
