# 07 — Verification record, release gates and compliance work

## 29 September 2026 verification record

Scope: route-presentation building protection/multi-section matching and this documentation handover. Existing unrelated UI/native changes were preserved, not reimplemented.

| Check | Result |
|---|---|
| Focused route-presentation suite | 18 tests passed |
| Full Vitest suite | 299 passed; 1 private-recording test skipped |
| TypeScript `npx tsc --noEmit` | Passed |
| Production web build | Passed |
| Bundled mobile build | Passed |
| Android debug APK | Gradle build passed; output `android/app/build/outputs/apk/debug/app-debug.apk` |
| iOS generic physical-device compile | Passed with `CODE_SIGNING_ALLOWED=NO`, output under `/private/tmp/keepleft-ios-handover` |
| New iOS signed install | Not performed in this handover |
| New phone replay / road-crossing outdoor validation | Not performed; remains required |

The rebuilt Android APK still carries the existing project version (23 / 0.2.18-private-beta); no distribution version bump was made. Its SHA-256 is `9dda92ac3a1600b7b1b4882d9d29f51ce782a97951fc61217f0363be79c42ca9`. Use the hash/build date to distinguish this file from an older APK with the same version label. No phone installation was performed.

Synthetic public-fixture performance probe: 4,096 route samples, 4,902 world features, 3,688 building forms; index construction ~21.2 ms, initial route ~11.7 ms, moving-tip median ~0.21 ms, p95 ~0.95 ms on this Mac. This is a CPU matching probe, **not** end-to-end FPS, Android battery performance or visual acceptance.

Warnings: web/mobile chunks >500 kB, ineffective dynamic import for `ios-location.ts` because it is also statically imported, Gradle flatDir metadata warning and Android SDK tooling XML-version mismatch. These did not fail the builds. Xcode emitted a supported-platform warning but returned success for the compile. Warnings still deserve planned cleanup; do not hide them or randomly upgrade the stack.

Native project sync also refreshed Android's generated Capacitor geolocation dependency entries. Keep them in sync with `package.json`; do not delete the generated plugin entries to make a diff smaller.

## Smallest useful validation sequence

From `apps/client-web`:

```sh
npm test -- lib/renderer/route-presentation.test.ts
npm test
npx tsc --noEmit
npm run build
npm run build:mobile
node tools/verify-route-presentation.mjs
```

For native changes add Android unit tests and the affected platform build. For timing/world-lifecycle changes, the exact saved replay and a physical device check are mandatory. A private file can be absent; say so and keep that gate open rather than manufacturing a pass.

## Physical acceptance matrix

Record app version/build, file hash, device/OS, date, activity type and pass/fail notes. Test the delivered package, not just localhost.

### Install, permissions and onboarding

- Fresh install: terms/privacy/safety gate, links work before acceptance, no clipped buttons.
- Existing-user upgrade: history preserved; consent version handling correct.
- Location off, denied, approximate-only, precise granted: distinct actionable states.
- iPhone: Developer Mode retained; profile valid; foreground GPS reaches the actual neighborhood.
- Cold uncached map, cached map, offline network, public-service failure: recording remains independent.

### Recording

- Walk, run and cycle selected before start.
- Stand still 2 minutes, then normal movement, sharp corner, out-and-back, stop, restart.
- Pause/resume; intentional finish confirmation; save exactly once.
- Poor GPS under cover; recover outdoors without fabricated distance spikes.
- Android: lock screen/background, notification active, app UI reopened, service state restored.
- iOS/web: explicitly test and communicate foreground-only limits; do not promise lock-screen continuity.
- Crash/process interruption: restore latest committed checkpoint, do not silently replace with demo.

### Replay and route display

- Same troublesome saved route: beginning, ~14-minute reconnect, neighborhood boundaries.
- 1× and 4×; Follow, Orbit, Overview; continuous zoom/drag while scrubbing.
- Pause/exit buttons remain responsive; no scene flashing or repeated whole-canvas resize.
- Genuine stops/out-and-back retained; no cycling snap to neighboring service road.
- New road fix: walking/running around a block spanning multiple OSM ways; ambiguous/missing roads produce conservative gaps, not invented shortcuts.
- Compare original path vs aligned display; stored distance/duration and GeoJSON unchanged.

### UI and sharing

- Narrow screen and larger font: Start/Finish/header not clipped, bottom safe areas honored.
- Home vs latest-run vs weekly totals unambiguous; Stats filters/date history actually use saved data.
- All enabled PNG/GIF/photo metrics visible; no unwanted background box in transparent output.
- Drag/pinch photo overlay to every edge; output matches preview; cancellation recovers.
- Try actual receiving apps for copy/share. PNG transparency, GIF animation and MP4 compatibility separately.
- Endpoint masking ON/OFF and short route warning; no unintentional private address.

### Endurance and data

- 30/60/120-minute battery, thermal, memory and responsiveness tests on Pixel 7, a lower-memory Android and the target iPhone.
- Reopen history offline, storage-full/quota failure, save failure surfaced, no silent deletion.
- Export single activity and all; verify files before deleting anything.
- Delete individual/all with confirmation, draft/cache handling, legal-reset behavior.

## What remains before calling it production-ready

### Blocking or materially incomplete

- iOS native background capture, interruption handling and durable recovery parity, **or explicitly ship a limited foreground-only beta with clear user expectations**.
- Real-device verification of current iOS live neighborhood downloads and the new road matcher.
- Dependency/security review: prior installation reported advisories; this handover did not remediate or certify them. Run a current audit, classify runtime exposure, fix with targeted regression testing.
- Reliable, versioned full backup/restore. Current bulk GeoJSON flattens activity grouping and is not a database backup.
- Public-map service capacity/terms and an operational plan for growth; public Overpass has no product SLA.
- Native export/clipboard compatibility, especially iOS; no universal animated-sticker paste promise.
- Final legal/privacy/network audit, named support contact and real hosted policy URLs.

### Implemented in source, still requires UX/device qualification

- Terms/privacy/about pages; native equivalents; versioned local consent gate.
- Pre-permission explanation, GPS/map error states, two-tap finish.
- History periods/type filters, saved activity access, metric toggles and PNG copy paths.
- Bulk/per-activity deletion and route exports.
- Day/night on run UI and hidden third-person entry points.

“Implemented” does not mean accessibility, all device layouts or legal compliance are signed off.

## Consent and legal audit

`lib/legal/consent.ts` stores version `2026-09-24-beta-1` under `keepleft-legal-consent`, acceptance timestamp and terms/privacy/safety flags. The gate has Terms and Privacy checkboxes plus safety acknowledgement; a version change requires renewed acceptance. The current dialog uses an open dialog element; keyboard/focus containment and screen-reader behavior still need manual audit.

Web pages and `MobileLegalPage` have duplicated content. Keep them consistent. In particular review:

- Avoid absolute “no location information leaves the device”: map-area queries do leave it.
- GPS recording vs GPS preview: verify actual provider lifecycle before claiming all location access immediately stops on every pause/finish.
- Do not claim the repository is publicly open source without a deliberate published license/repository decision.
- Replace generic contact wording with the actual responsible party/support channel before public release.
- Explain estimated building heights, route alignment, calories/elevation limitations, third-party data and local data-loss risks.
- Review jurisdiction-specific terms with qualified counsel if distributing publicly. This engineering audit is not legal approval.

## Store declarations are not pre-filled facts

The older `STORE_PREPARATION.md` contained overconfident “no sharing” answers and described debug build commands as signed-release generation. Those have been corrected. The final binary's behavior, service logs/retention and provider relationships determine declarations.

Google explicitly requires developers to account for app and SDK data behavior in [Data safety guidance](https://support.google.com/googleplay/android-developer/answer/10787469). On-device-only activity storage does not automatically settle disclosure for outgoing geographic queries. Apple's privacy manifest is currently present with empty collected-data and accessed-API arrays; inspect final app/plugin manifests and required-reason API use rather than assuming empty arrays mean compliance.

Store publishing is a separate project from local beta installation: signing, current SDK acceptance, privacy/support URLs, screenshots, ratings, disclosures, test tracks and review evidence still need final owner decisions. See [Android](02-ANDROID.md) and [iOS](03-IOS.md) for packaging differences.
