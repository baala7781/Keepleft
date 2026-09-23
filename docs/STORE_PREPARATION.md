# Keepleft App Store and Google Play Preparation Guide

This guide details the compliance declarations, store listings, permissions, and validation requirements for submitting Keepleft to Google Play (Android) and the Apple App Store (iOS).

---

## 1. Core Architecture and Data Truth

Keepleft is an entirely on-device running and GPS activity tracking app:
- **No User Accounts:** No sign-up, login, or backend user databases.
- **Local Storage:** GPS coordinates, routes, activity history, and metrics are stored locally in IndexedDB (Web) or local SQLite/Room database (Android).
- **No Location Upload:** Raw GPS fixes and accepted coordinates never leave the device.
- **Map & Terrain Streaming:** Viewport-bounded bounding box queries are made to public OpenStreetMap/Overpass API endpoints. No user route history, exact coordinates, or personal identifiers are transmitted.
- **Story & Photo Placement:** All photos and sticker exports remain in local memory/storage until the user manually saves or shares them.

---

## 2. Google Play Store (Android)

### 2.1 Permissions Used
- `android.permission.ACCESS_FINE_LOCATION` (Precise GPS tracking)
- `android.permission.ACCESS_COARSE_LOCATION` (Initial network fix)
- `android.permission.FOREGROUND_SERVICE`
- `android.permission.FOREGROUND_SERVICE_LOCATION` (Keeps GPS service active with ongoing notification while screen is locked)
- `android.permission.POST_NOTIFICATIONS` (Foreground notification display)
- `android.permission.INTERNET` (Map tile & vector footprint streaming)

*Note:* `ACCESS_BACKGROUND_LOCATION` is **not** requested or declared. Android 14+ background tracking is powered via `FOREGROUND_SERVICE_LOCATION` with a persistent notification.

### 2.2 Prominent In-App Location Disclosure
- **Implementation:** Before `enableLocation()` triggers the system permission dialog, Keepleft presents an in-app disclosure dialog:
  > *"Your location stays on this device. Keepleft uses precise GPS to record your route. Your coordinates are stored locally and never sent to a server. Recording continues when your screen is locked so your full route is captured."*
- Users have clear "Allow location access" and "Not now" options.

### 2.3 Google Play Data Safety Form Answers
| Question | Answer | Notes |
|---|---|---|
| Does your app collect or share any user data? | **No** (or "Data is processed ephemerally on-device only") | GPS coordinates are saved locally on-device only. |
| Is data collected? | **No** | Stored in on-device app sandbox; not collected by developer. |
| Is data shared with third parties? | **No** | Zero third-party sharing. |
| Is data encrypted in transit? | **Yes** (HTTPS for OSM tiles) | |
| Can users request data deletion? | **Yes** | In-app "Delete all data" button, per-activity delete, or uninstall. |

### 2.4 Google Play Review Video and Declaration
- **Use Case:** Foreground fitness tracking (walk, run, cycle).
- **Review Video:** Short 30-second screen capture demonstrating:
  1. Opening the app and tapping "Start a run" / "Explore".
  2. The in-app location disclosure dialog.
  3. Granting location permission.
  4. Active recording with the persistent Android notification appearing in the notification shade.
  5. Screen lock and resume showing continuous route recording without pauses or lost points.

### 2.5 Store Listing Details
- **App Title:** Keepleft: Run, Walk & Cycle
- **Short Description:** GPS run and cycle tracker with 3D miniature world replay. On-device & private.
- **Category:** Health & Fitness / Sports
- **Content Rating:** Everyone (PEGI 3, ESRB Everyone).
- **Privacy Policy URL:** Hosted at `/privacy` (e.g. `https://keepleft.app/privacy`).

---

## 3. Apple App Store (iOS)

### 3.1 Permissions & Info.plist
- `NSLocationWhenInUseUsageDescription`:
  > *"Keepleft uses your location while you record a walk, run, or cycle and to show your position in the miniature world."*
- *Native iOS background location:* Add `UIBackgroundModes` with `location` only once native CoreLocation background capture adapter is implemented.

### 3.2 App Store Privacy Nutrition Labels
- **Data Used to Track You:** None.
- **Data Linked to You:** None.
- **Data Not Linked to You:**
  - *Location (Precise Location):* Used for App Functionality. Stored on device only, not collected by developer.
  - *Diagnostics:* None collected.

### 3.3 Privacy Manifest (`PrivacyInfo.xcprivacy`)
- `NSPrivacyTracking`: `false`
- `NSPrivacyCollectedDataTypes`: `[]` (empty list; developer collects zero data)
- `NSPrivacyAccessedAPITypes`: System boot time / file timestamp APIs if required by Capacitor plugins.

---

## 4. In-App Data Management & User Rights

- **Per-Activity Deletion:** Available on the activity detail card (Home) and Activity Library (Run settings).
- **Bulk Deletion:** "Delete all data" button with confirmation alert in `Activity settings → Saved activities`.
- **Route Export:** Single-click GeoJSON export per activity and "Export all data" bulk GeoJSON export.
- **Account Deletion:** Not applicable as there are no user accounts.

---

## 5. Release Build & Validation Checklist

Before publishing:
1. `npm test -- --run` — all unit and integration tests pass.
2. `npm run build` — production web bundle compiles without errors.
3. `npm run android:apk` (or `cd apps/client-web/android && ./gradlew bundleRelease`) — produces signed release AAB.
4. Physical Device Qualification (Pixel 7 / Android 14):
   - 30-minute walk/run test with screen locked.
   - Poor GPS / airplane mode recovery test.
   - Pause / resume / stop lifecycle test.
   - 1× and 4× 3D world replay smoothness check (verifying 0.2.16 fix).
   - Story Studio sticker export.
