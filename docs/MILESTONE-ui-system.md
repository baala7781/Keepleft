# Monolith Circuit UI — 0.2.0-ui1

2026-09-14. Feature work paused for the approved UI phase.

## Delivered
- Consolidated historical theme overrides into one semantic charcoal/mint system.
- Local Space Grotesk and Manrope fonts, including licenses, for web and offline Android.
- Running journal home, actual-route portraits, saved-run details and direct replay navigation.
- Confirmed deletion and retained native/browser export flows.
- Compact running and replay dock; unused ready-state metrics hidden; measured spring layout transitions and reduced-motion support.
- Settings entry/exit motion, Escape dismissal, focus restoration and inert closed controls.
- Matching story studio and saved activity surfaces.
- Dark green route with light casing and a rose athlete marker; geographic capture and camera algorithms retained.
- Android home navigation, active-session reopening, new launch colors and icon.

## Validation
- TypeScript no-emit check passes.
- Web suite: 167 tests across 33 files pass.
- New route portrait tests preserve gaps/invalid-fix boundaries, avoid input mutation, handle the date line and stationary/empty tracks.
- Web production and mobile bundle builds pass. Existing large renderer chunk warning remains.
- Android assembleDebug succeeds: versionCode 6, versionName 0.2.0-ui1.
- Android testDebugUnitTest passes as up-to-date; native recording source was not modified.
- Refreshed local home serves HTTP 200 at localhost:3000.
- Source-level design review completed using the selected frontend-design and Microsoft review guidance. No Figma comparison claimed.

## Still requires user review
Physical Pixel 7 visual approval: sunlight readability, one-handed access, collapsed replay, story controls, Android task switching, and route-marker distinction. Browser visual/gesture QA was not run in this slice.

The build is debug-signed for private testing, not a Play Store release. Install as an update to keep the existing local activity database; do not uninstall to update.
Design source: KEEPLEFT_UI_SYSTEM.md.
