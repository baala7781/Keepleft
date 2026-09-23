# Keepleft routine UI and release handoff

Status: Android `0.2.16-reconnect-bridge` passed the user's same-route Pixel 7 check with no pauses or flicker. Preserve the reliability rule in `.cursor/rules/replay-reliability.mdc` and do not refactor tracking/rendering while completing this list.

## Phase 1 — blocking mobile UI fixes

- Create-post screen: keep the full composition inside safe areas; show every enabled metric (time, distance, pace/speed) without content falling below the viewport.
- Restore the transparent standalone route/sticker presentation. Remove the unwanted decorative metric-card background.
- Improve photo placement: obvious add/replace controls, bounded drag, pinch resize, reset, and a clear export state. Do not change export coordinates or GIF/video encoding.
- Move Day/Night controls to the live/replay run screen only; remove them from Home.
- Fix the Home header so `Start a run` never clips or overflows on narrow phones and Android font scaling.
- Redesign the active `Finish` control as a clear destructive/terminal action with a consistent premium shape; keep Pause visually secondary and prevent accidental finish.
- Audit bottom sheets, replay controls, speed selector, timeline and bottom navigation for Android safe areas, keyboard-free reach, 44–48 px touch targets and no horizontal clipping.

## Phase 2 — information architecture and stats

- Home should not show the same recent activity twice. Keep one latest-journey hero and a compact recent list, or remove the duplicated preview.
- Label aggregate cards explicitly as `All-time`/`Your totals`; do not place them where they read as metrics for the latest run.
- Use a lightweight cached/static thumbnail on Home. Do not mount a second continuously rendering 3D world for a card.
- Stats needs real historical context: day/date grouping, activity type, distance, time, pace/speed, totals and an empty state. Add a restrained calendar/heatmap or trend only when it is derived from saved activities.
- Verify Home, Stats, Explore/Run, activity detail and Back navigation on both browser history and Android hardware back.

## Phase 3 — onboarding, accessibility and content

- Add a concise pre-permission explanation for precise foreground/background location and explain why recording continues when the screen is locked.
- Add denied, weak-GPS, offline-map, empty-history, export-progress, export-failure and recovery states with actionable copy.
- Audit accessible names, focus order, contrast, reduced motion, text scaling and screen-reader announcements for recording status.
- Keep OSM/terrain attribution visible and add a readable data-licenses/about screen using `docs/DATA_LICENSES.md`.
- Kedarnath may replace the demo only with a real matching geographic/terrain fixture and correct attribution. Do not relabel the Madmaheshwar fixture.

## Phase 4 — store/compliance preparation

- Publish a non-editable privacy-policy web page and link it both inside the app and in store listings. Describe actual local storage, map requests, location use, export/share behavior and deletion; do not invent claims.
- Android: prominent in-app background-location disclosure before the permission prompt; Play Data safety form; background-location declaration and short review video; content rating; support contact; store copy/screenshots/icon; signed release AAB; internal/closed testing; crash/battery/thermal qualification.
- iOS: update location descriptions to include walk/run/cycle; add the correct background location mode only after native iOS capture exists; privacy manifest/App Privacy answers; age rating, screenshots, support/privacy URLs, TestFlight testing, signing and App Review metadata.
- Add in-app export and delete-all-local-data controls. Account deletion is required only if accounts are later introduced.
- Validate every declaration against the shipped binary and active SDK behavior before submission.

## Do not include in this handoff

- No third-person camera, avatar/FBX work, cars, buses, street furniture, friends, leaderboards, health integration or backend accounts.
- Do not change GPS filters, replay timing, segment bridging, world streaming, road matching, render quality or GIF/video internals.

## Required validation

- `npm test -- --run`
- `npm run build`
- `npm run android:apk`
- Pixel 7: Home/Stats/navigation, live run controls, the same saved replay at 1× and 4×, timeline dragging, Create Post and export.
- Do not call the app release-ready until walk/run/cycle, poor GPS, pause/resume, screen lock, offline behavior, save/recovery and 30/60/120-minute battery/thermal checks pass.
