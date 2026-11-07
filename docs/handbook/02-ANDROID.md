# 02 — Android build, installation and distribution

## Prerequisites

- Node/npm and `npm ci` in `apps/client-web`.
- Android SDK with platform/build tools required by the Gradle project. Current `android/variables.gradle`: compile/target SDK 36, minimum SDK 24.
- JDK 21 is the intended local Java toolchain; check `java -version` and `/usr/libexec/java_home -V`.
- Android Studio is the easiest SDK manager. Set `android/local.properties` to your real SDK directory if needed; do not commit machine-local paths.
- Accept Google's SDK terms yourself when prompted. Previous acceptance on one machine does not configure another machine.

## Build a test APK

```sh
cd /Users/baala/Documents/Codex/2026-09-06/fir/atlas/apps/client-web
npm ci
npm run android:apk
```

If Java selection is wrong, set it explicitly in this terminal first:

```sh
export JAVA_HOME="$(/usr/libexec/java_home -v 21)"
```

Expected output: `android/app/build/outputs/apk/debug/app-debug.apk`. The script rebuilds web assets, syncs Capacitor, then runs Gradle `assembleDebug`. This APK is debug-signed for testing, not a store release.

## Install/update

Option A: send the APK through a trusted file-transfer channel, open it on Android, and grant that source permission to install unknown apps when requested. Revoke that permission afterward if desired.

Option B: use Android platform-tools:

```sh
adb devices
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Enable USB debugging and approve this Mac on the phone for the ADB option. `-r` requests an update that preserves app data; keep application ID and signing key unchanged. Export activities before any risky upgrade.

If `INSTALL_FAILED_UPDATE_INCOMPATIBLE` appears, the installed APK and new APK have different signing certificates. **Do not reflexively uninstall**: uninstall loses private activities. Retrieve the original signing key/build environment or export data first. A new Mac's default debug key may differ.

The app ID is `app.keepleft.mobile`. Current project version is `0.2.18-private-beta`/23; source fixes do not automatically increment it. Before distributing each new test build, deliberately bump versionCode and versionName in `android/app/build.gradle`, and record the file hash so testers know what they installed.

## GPS setup and outdoor test

1. Turn on Android location services.
2. Give Keepleft precise location access, not approximate-only.
3. Accept in-app explanation and notification permission where requested.
4. Go outdoors, allow an initial fix, verify the place/map changes from demo.
5. Select walk/run/cycle correctly before recording.
6. During recording expect the native foreground-service notification.
7. Test screen lock, pause, resume, finish, save, reopen and replay.

Implementation: `RunService`, `RunEngine`, `RunDatabase`, `KeepleftRunPlugin`. The manifest requests fine/coarse location, location foreground service, notifications and internet. It does not declare `ACCESS_BACKGROUND_LOCATION`. Android battery/vendor restrictions can still interfere; a foreground service is not a blanket guarantee of lossless tracking.

Maps and recording are independent. An Overpass timeout may leave the map empty while GPS records normally. See [troubleshooting](08-TROUBLESHOOTING-AND-HANDOFF.md).

## Native tests

From `apps/client-web/android` with the SDK/JDK configured:

```sh
./gradlew testDebugUnitTest
```

These exercise native logic but do not replace real GPS/battery tests. Use the [release matrix](07-TESTING-AND-RELEASE.md) after changes to recording or rendering.

## Release signing is a separate step

`npm run android:release` runs `assembleRelease`; it does **not** configure a release signing identity. The currently inspected `build.gradle` has no release signingConfig. A successful release task may therefore produce an unsigned artifact.

For a public release:

1. Create and securely back up a release/upload keystore using Android Studio's Generate Signed Bundle/APK workflow.
2. Store passwords outside Git; use local secure properties or CI secrets.
3. Configure the correct signing workflow, increment versionCode, and build a signed APK for direct beta distribution or AAB for Play.
4. After signing is configured, `./gradlew bundleRelease` produces the Play bundle. Verify its signature and test the actual signed artifact.
5. Preserve the key. Losing signing access can block direct upgrades for existing users.

Do not call `npm run android:apk` a signed release-AAB command. APK and AAB are different output formats.

## Data precautions

Activities live in private SQLite; uninstalling/clearing app storage deletes them. Android backup is disabled in the manifest. Export before reinstalling or changing keys. GeoJSON is useful route data but the current bulk export is not a full restorable application backup; see [04](04-LOCATION-MAPS-AND-DATA.md).
