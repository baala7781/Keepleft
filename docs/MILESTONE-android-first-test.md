# Keepleft Android first-test build — 2026-09-13

## Scope delivered

- Capacitor 8.5.2 Android shell, application ID `app.keepleft.mobile`, version `0.1.0-test`, min API 24 / target API 36. Vite bundles the UI, MapLibre worker, Three renderer and Hyderabad fixture into the APK. There is no remote `server.url` and no laptop dependency.
- Native location foreground service with ongoing recording notification, Pause/Resume and Stop & save. Start while the app is visible. Precise location is required; notification permission is requested on relevant Android versions.
- Capture and storage do not depend on rendering or map requests. Native SQLite holds accepted GPS points, activity snapshots and up to eight successful nearby-map areas. The UI receives incremental route samples once a second. Reopening after process death restores an unfinished recording paused; the unobserved gap is not counted as a route segment.
- The same quality limits as the web filter: reject tracking positions worse than 50 m, positions older than 30 seconds, impossible jumps and stationary noise. A >20-second gap starts a new segment without connecting distance. Coarse positions up to 1 km may load a map independently. These are filters, not a guarantee of 50 m or better real-world accuracy.
- Native HTTPS map requests reuse the OSM normalizer and two Overpass mirrors. Cached areas can render offline; uncached areas require internet. Cache read/write failures do not block capture. Cached maps can be stale; cache freshness controls and a production tile service remain follow-up work.
- One-finger Angle mode turns/tilts the map; Move mode pans. Pinch zoom remains enabled. Camera mode selection applies the default viewpoint, and manipulation retains that mode. Dedicated rotate/tilt buttons remain available.
- Run export invokes Android's share sheet. No route analytics/cloud sync. Backups/device transfers excluded using [Android's backup configuration](https://developer.android.com/identity/data/autobackup).

## Verification and limits

- TypeScript check, 109 web/shared tests, web production build and mobile bundle build passed.
- Four native Java GPS-filter unit tests passed; Android debug assembly and Android lint passed with no errors. Remaining warnings concern template resources/version freshness and the application-context singleton, not a clean lint claim.
- Native bridge tests cover incremental samples, completed-route replay compatibility, paused recovery, serialized commands, error visibility, and UI disposal without stopping capture.
- At 390 × 844, browser QA verified angle drag, immediate third-person preset and retaining the selected mode after manipulation. This is pointer/browser QA, not physical multitouch or handset GPU qualification.
- No Android device was connected. Installation, actual permission flows, SQLite process-death recovery, notification actions, screen-off GPS, battery and OEM restrictions require real-device testing. A foreground service cannot guarantee survival of force-stop or all manufacturer battery policies.
- No road snapping is applied. GPS uncertainty and incomplete footprints can put the marker inside a building. Snapping raw samples onto a road would conceal uncertainty and remains deferred to an opt-in postprocessing design.
- General repository lint is not clean (existing source/template issues); lint on the new native adapter and angle helper files passes. Generated Android assets are excluded from source linting.
- `npm audit --omit=dev` reports six dependency entries (one low, five high), mainly Node build/server paths: esbuild, image-size/vinext, react-server-dom-webpack, undici and Vite. The APK entry is client-only and does not bundle a Node/Vinext server; this is not a full security audit. Resolve advisories before public web/app release; do not apply blanket forced upgrades during handset qualification.

## Rebuild on this Mac

From `apps/client-web`:

```sh
npm run android:sync
cd android
JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home ANDROID_HOME=/opt/homebrew/share/android-commandlinetools ./gradlew :app:testDebugUnitTest :app:assembleDebug :app:lintDebug
```

Output: `apps/client-web/android/app/build/outputs/apk/debug/app-debug.apk`. This is a debug-signed private test build, not a Play Store release. Retain the local debug signing key for compatible test updates; production signing is a separate step.

## First outdoor test

1. Transfer the APK to the Android phone and open it to install. If Android requests permission to install from that transfer app, enable it only for that source and turn it off after installation. Do not disable Play Protect.
2. Open Keepleft, choose Use my location, allow precise location while using the app, and enable notifications. Wait outdoors for a fresh, stable position and the nearby map.
3. Start a short 3–5 minute walk first. Verify the Keepleft recording notification is present. Turn/tilt with Angle, then return to Move to pan. The chosen camera mode should remain selected.
4. Lock the screen for about one minute, continue walking, reopen Keepleft and check that active time and a plausible route continued. Stop & save, open Saved activities in Run options and replay.
5. Close/reopen the app and verify the saved run still exists. Export a backup if useful. Test airplane-mode recording only after the local map has loaded; uncached map data will be unavailable.

Report the phone model/Android version and which step fails. Do not treat this first run as a trusted race-distance measurement. Check the screen only while safely stopped.
