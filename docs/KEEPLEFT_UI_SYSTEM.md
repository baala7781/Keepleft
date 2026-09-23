# KeepLeft design system
Updated 2026-09-14. UI frozen at 0.2.1-noir; world rendering advances in 0.2.2-world-v2. See WORLD_ENGINE_V2.md and ADR-011.

## Decision and product
The user rejected the mint Monolith Circuit proposal and supplied three noir/crimson reference screens. Those references supersede the previous direction. KeepLeft is a miniature running world: record with the phone mostly put away, revisit the run, then make a photo story.

Selected direction: charcoal terrain, dark water, pale architectural masses, organic dark tree crowns and a single crimson activity signal. The reference-led composition, not a generic component library, is the visual authority. Home is a journal; the running/replay screens give the world the largest available surface.

Creation follows the frontend-design skill: deliberate material, typography and composition choices, followed by browser critique. Previous source-level Microsoft frontend-design-review guidance is retained for accessibility and interaction review. No Figma file or pixel-exact compliance is claimed.

## Reference fidelity and geographic truth
Match the supplied material contrast, crimson controls, outlined black panels, compass, replay rail and scene-backed home. Do not copy the phone bezel/status bar into app content; Android owns those. Do not invent heart rate, elevation, names or saved activities to fill the reference layout.

The bundled world is Hussain Sagar, not the Serilingampally/Durgam Cheruvu map depicted in the references. Actual features and coverage must remain truthful. The demo's initial view showcases mapped NTR Gardens; live GPS never uses that composition as a substitute for the user's location.

The screenshots depict more detailed terrain and assets than the current renderer supplies. This implementation is not a 99% match. Remaining differences include flat terrain, estimated missing building heights, procedural vegetation, no landmark-specific assets and no photographic ground detail.

## Tokens
UI source: apps/client-web/app/keepleft.css. World source: lib/renderer/noir-palette.ts. Global CSS maps semantic tokens rather than introducing another theme.

| Role | Value |
|---|---|
| Base | #0b0c0e |
| Panel | #111214 |
| Elevated control | #1d1f22 |
| Boundary | #454548 |
| Primary text | #f5f5f5 |
| Secondary text | #aaa9ac |
| Action / progress | #f33b53 |
| Secondary signal | #ff6c7e |
| Focus | #ff6377 |
| Ground | #202324 |
| Water | #131a1d |
| Canopy | #4c514e |
| Building | #e0e2e3 |
| Route / core | #fa4058 / #ffb0b8 |

Crimson means activity or a selected control; it is not a wash over the whole scene. Use a pale route core and restrained halo over the dark road. There are no blue or mint primary accents. New route-story exports use crimson; already exported media is not changed.

Primary buttons follow the reference's dark red surface with a fine crimson perimeter and a restrained tonal gradient. Panels are dark with thin grey borders. No independent glowing cards. Map-overlay translucency and vignette have a legibility purpose.

## Typography, spacing, iconography
Manrope is the principal UI/wordmark face; Space Grotesk supplies selected numeric/display styles. Both fonts and OFL licenses are bundled locally; no runtime font request. Use tabular figures for metrics and playback.

Mobile wordmark approximately 26px, primary heading 22–24px, figures 28px, controls 12–15px, supporting metadata 11–13px. Reserve small tracked uppercase copy for the reference's section captions and motto, not dense telemetry.

4px base spacing: 4, 8, 12, 16, 24, 32, 48, 64px. Mobile map margins 20px; bottom dock 12px from horizontal edges plus safe-area handling. Controls 12px radius, history cards 14–16px, dock 28px, primary start/play actions pill-shaped. Radius encodes hierarchy rather than applying one rounded-card style everywhere.

Lucide line icons, generally 16–22px. Icon-only controls need a descriptive accessible name. 44px minimum target; primary recording action 52px. Do not use a decorative notification dot to imply an unread item.

## World art and rendering
- Preserve mapped footprints, building parts and supported roof shapes. Deterministic pale tonal variation replaces multicoloured building faces.
- Cool-neutral hemisphere and directional lighting, ambient underside shading, static shadow updates. No screen-wide bloom or depth-of-field pass in this slice.
- Vegetation V2 uses four distinct metre-scale archetypes, branching near geometry, reduced mid crowns and camera-facing far silhouettes. Geometry/materials are pooled; the 256×128 side/top atlas is generated locally.
- Seeded clustering, archetype scale variation, woodland/park/garden rules and mapped tree-lined road metadata replace the single large-canopy treatment. Explicit open clearings remain clear.
- Aerial vegetation remains visible from zoom 13.5. Projected-size estimates, distance, hysteresis and caps determine near/mid/far detail. Small near/mid wind is disabled for reduced motion, battery saver and static previews.
- Balanced caps at 1,800 trees and 1,800 windows; High at 3,600 trees and 4,200 windows. Battery saver removes these extras.
- Place trees within mapped canopy/park/garden/orchard polygons, or beside explicitly tree-lined roads; exclude buildings, road surfaces, water and mapped open clearings. Individual trees are illustrative, not surveyed positions. A park polygon does not prove actual canopy density.
- Use an unobscured crimson position marker, including third person. Its separate uncertainty ring is not a guarantee of GPS accuracy.
- Buildings are never erased by an oval/cutaway effect.
- Actual recording and storage remain independent of animation and map availability.

## Screen contracts
### Home
KeepLeft and Start a run in the header. One real 3D preview of the last saved activity's neighborhood, with actual date/place/distance and replay entry. With empty storage, label the public local demo and invite the first run; do not create a fictional history.

One active WebGL preview is lazy-loaded and demand-rendered. The secondary scene card reuses an in-memory poster; it does not create another renderer. A saved-run map failure falls back to that run's recorded route, never an unrelated map.

Four compact outlined stats use actual activity totals. The journal retains details, replay, export and confirmed deletion. Bottom navigation only advertises working destinations: Home, Stats and Explore. No dead Profile destination.

### Running
World-first, compact brand/place, home/settings actions, camera mode, adjustment controls and north compass. The reference's initial zero metrics are visible. Demo and GPS states are clearly differentiated.

The dock owns ready/recording/paused/completed state and the next action. Collapse details while keeping core controls. Home is disabled during capture and before an unsaved GPS completion is retained. Android recovery still opens active sessions into the running screen.

Location/provider and renderer diagnostics belong in settings. Never claim GPS is connected from the reference text when the provider has not supplied a fix.

### Replay
Run identity, back and working Share entry in the header. Follow/Orbit/Overview rail, with More views and settings retaining access to Third person. Rail placement reserves the measured dock height; it must not be hidden behind the expanded summary.

The expanded summary shows the immutable whole-run distance, duration and average pace. The scrubber owns playback time. Compact mode shows progress and playback controls. No uncollected heart-rate/elevation rows.

Play/Pause, speed, Restart and Exit remain available. Camera selection is independent of playback. A selected preset establishes a starting angle; subsequent gestures retain the user's framing. Preserve source gaps and explain approximate timing in legacy recordings.

### Story and dialogs
Use the same palette/type/focus system. Share opens the actual photo-story editor, not a placeholder. Keep touch placement handles and existing export functionality. Delete requires confirmation. No export to a remote service in this UI milestone.

## States and motion
- Ready: short prompt, truthful location state, start action.
- Locating/error: provider status and actionable retry, not indefinite false readiness.
- Recording/paused: stable metrics with clear Pause/Resume/Stop.
- Complete: replay/story and existing save/export guards.
- Storage loading: do not flash a false empty journal.
- Scene loading: preparation text; failures disclose an unavailable map.
- Press response: 120ms colour/border feedback.
- Settings: 220ms opacity and 8px displacement, inert when closed, Escape and focus return.
- Dock: measured 320ms critically damped layout transition. Browser-owned animation; no per-frame React state.
- Replay rail reserves dock space. Avoid moving targets over other controls.
- Default idle demo does not continuously orbit; explicit Orbit is available.
- Home preview draws on demand; no hidden runner/clock animation.
- Numeric updates use stable tabular typography rather than continuous odometer effects.
- Reduced motion cancels dock animation and minimizes transitions; existing renderer motion preference is retained.
- Avoid gratuitous stagger, perpetual pulse and decorative spring effects.

## Mobile, accessibility and light strategy
Safe areas, bounded scrolling panels, visible keyboard focus and target sizes apply across screens. Preserve map rotation/pitch, one-finger angle adjustment and pinch zoom. Photo/editor dialogs retain focus management.

Dark only in this iteration; no nonfunctional theme toggle. Sunlight contrast, sustained heat, battery use and touch responsiveness require physical Pixel 7 testing. Browser viewport emulation is not device qualification.

Future charts should use explicit units, clear gaps, restrained strokes and text equivalents. No invented calories or health data. Feature expansion remains paused until the revised visual direction is accepted.

## Validation
See MILESTONE-noir-world.md for exact build/test results and remaining review gates. Keep MILESTONE-ui-system.md as history of the rejected mint version; it is not the current design authority.
