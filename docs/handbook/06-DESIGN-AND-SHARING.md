# 06 — Visual identity, interaction and social exports

## Product identity and scope

Keepleft should feel like movement through a miniature world, not a generic map/dashboard or a Strava/Relive clone. The owner rejected mint, default blue, orange/yellow associations and a later overly different palette. Current direction is noir/charcoal with a distinctive rose-crimson accent, restrained silver type and quieter rectangular component treatments.

Current source anchors:

- `lib/renderer/noir-palette.ts`: route `#e33b63`, core `#e0e2e3`, halo `#8d2648`; ground `#202324`, canopy `#57604f`, water `#131a1d`.
- `app/reference-ui.css`: ink `#0b0c0e`, surface `#111214`, line `#383b3f`, accent `#e33b63`, muted `#aaa9ac`.
- `app/globals.css` imports `keepleft.css` then `reference-ui.css`. Later overrides matter.
- `world-theme.ts` controls world day/night; this is not automatically a full light-mode app theme.
- `keepleft.css` defines locally served Manrope for body text and Space Grotesk for display text. Preserve font fallbacks and test large-text layouts rather than relying on desktop font rendering.

Reference images are artistic targets, not proof of geographical detail, weather, heart-rate or elevation features. Do not add invented numbers just to match a screenshot.

## Screen responsibilities

- Home: latest journey and its own metrics, recent activity links and clearly labeled weekly context. No duplicate live miniature map just for decoration.
- Stats: saved-history periods and activity-type filters, meaningful dates/totals/trends, honest empty states.
- Run/Explore: world dominates; activity selection, GPS state, camera, day/night, record/pause/finish and accessible settings.
- Replay: Follow/Orbit/Overview, timeline, speed, pause/exit, collapsible details; preserve responsive controls.
- Story Studio: transparent PNG, photo story, animated route sticker, metric toggles and explicit copy/share/download outcomes.
- Terms/Privacy/About: accessible before and after consent, both web routes and native navigation.

Activity type is chosen before recording; cycle excludes third person, and current V1 hides third person for all types. Finish uses a second confirming tap with a short confirmation window; Pause is a separate reversible action. Do not style an accidental one-tap finish back into the app.

## Interaction and motion principles

- World motion is the primary animation. UI motion should clarify state, not constantly compete.
- Preserve the chosen camera mode during manual interaction; do not silently switch to Explore because of a gesture.
- Controls must remain usable during map loading, replay and export.
- Keep mobile safe areas, large touch targets, text scaling, visible focus, accessible names and reduced-motion behavior.
- Avoid expanding a decorative panel over the map when a compact status/handle is sufficient.
- Never improve visual density by restoring frame-time spikes. Prefer stable instancing, bounded detail and measured commits.

See historical `KEEPLEFT_UI_SYSTEM.md`, but current code may differ from its older mint/noir checkpoint. Do not paste its colors over the current palette without owner approval.

## Story export pipeline

`StoryScene` draws from saved activity data, not a screen capture of the map. Route stickers and photo overlays are a separate 2D composition pipeline. The line's quality depends on source geometry, backing canvas resolution, scale and encoder—not merely CSS width.

| Output | Implementation / limits |
|---|---|
| Transparent PNG | `png-export.ts` draws route + chosen metrics into alpha canvas; Android saves/copies via native bridge; browser/iOS uses Clipboard API when available |
| Animated GIF | `sticker-export.ts`, `gif-encoding.ts`, `gif.worker.ts`; worker encoding keeps UI more responsive; GIF has palette/transparency limitations |
| Photo video | Android native encoder via `exportNativeStory`; browser/iOS uses supported `MediaRecorder` + canvas capture, may be unavailable or choose WebM |
| Photo placement | `placement.ts`, `presets.ts`; drag/pinch coordinates must agree with exported coordinates |

Video/photo presets currently: Story 720×1280, Feed 720×900, Square 720×720. Do not advertise 4K or native iOS MP4 parity. PNG/sticker overlay backing resolution is managed separately in the scene; inspect it before changing quality.

Browser video capture is real-time. Android sends one encoded frame at a time, with asynchronous JPEG preparation and bounded memory; elapsed export time depends on phone/format. Progress and cancellation are required. Do not accumulate hundreds of full-size canvases in memory to make export “faster.”

## Copy/paste expectations

Transparent PNG is the practical static sticker path: export → copy → paste into an app that accepts image clipboard data. It does not require selecting a photo inside Keepleft. The receiving app can flatten alpha, reject the image, or handle it differently.

There is no universal “copy animated GIF and paste anywhere” contract. Some apps paste a still frame or do not accept animated clipboard media. Offer Share/Save when copy is unsupported; never report success for a failed clipboard write. Android native clipboard support differs from Safari/WKWebView. Test intended destinations such as WhatsApp/Instagram on real phones instead of assuming API presence proves compatibility.

## Privacy in social exports

`lib/story/privacy.ts` hides the first/last 200 m by default when sufficient route length remains. For routes shorter than approximately 500 m the function does not apply that mask; the UI must warn, not claim privacy automatically. This is not anonymization: a route or visible photo can still identify a home/routine.

Toggling marker icons off is not the same as removing endpoint coordinates. Verify PNG, GIF and photo-video outputs separately, including enabled metric visibility and location/date privacy.

## Known design/development debt

- CSS is layered with repeated overrides; consolidating into one token/component system is desirable, but a broad rewrite is not a reliability fix.
- Mobile and web legal content are separate implementations and can drift.
- Hardcoded About/version strings can lag native versions.
- Long place names, small-screen headers, safe areas and large fonts need repeated phone checks; desktop responsiveness is insufficient.
- Home preview loading depends on data/caching; avoid mounting multiple continuously rendered worlds to solve a thumbnail problem.
- Buildings/heights and tree placement are approximate, not a 99% photoreal copy of references. Live terrain fidelity differs from the demo.
- No imported personalized avatar or new owner-provided running FBX is required for this beta. Existing athlete assets do not justify restoring hidden third-person controls.
- Weather, heart rate, medical/calorie precision and leaderboards are not to be inferred from reference screenshots.

For a UI-only change, restrict work to the screen/component/styles and social modules involved. Protect recording, replay timing, renderer lifecycle and world streaming. Re-test mobile navigation and export previews, not just the screen that changed.
