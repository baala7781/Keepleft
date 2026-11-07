# YourLeft App Store and Google Play Preparation Guide

> Updated audit note, 29 September 2026: this is preparation, not approved legal/store declarations. Read [the current release audit](handbook/07-TESTING-AND-RELEASE.md) and [iOS guide](handbook/03-IOS.md). Store answers require verification against the shipped binary, providers and current policies.

This guide details the compliance declarations, store listings, permissions, and validation requirements for submitting YourLeft to Google Play (Android) and the Apple App Store (iOS). The native package identifier remains `app.keepleft.mobile` to preserve updates and local activities; only the user-facing name is changing.

---

## 1. Core Architecture and Data Truth

Keepleft records activities locally, but downloads map data from external services:
- **No User Accounts:** No sign-up, login, or backend user databases.
- **Local Storage:** GPS coordinates, routes, activity history, and metrics are stored locally in IndexedDB (Web/iOS WebView) or a private SQLite database (Android).
- **Activity storage:** The recorder does not automatically upload saved raw/accepted routes. Users can deliberately export/share them.
- **Map requests:** Public Overpass receives geographic area/locality queries and normal network metadata, including source IP. This can reveal the area being viewed; local activity storage does not mean no location-related disclosure. The full saved activity is not included in map queries. Bundled demo terrain and live geography have different pipelines.
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
  Explain local activity storage separately from external map-area requests. Android uses an ongoing location foreground service; iOS/web are foreground-only. Audit actual UI wording rather than using an absolute "no location information is sent" or cross-platform background guarantee.
- Users have clear "Allow location access" and "Not now" options.

### 2.3 Google Play Data Safety Review — not ready-to-submit answers
| Question | Answer | Notes |
|---|---|---|
| Activity history | Stored locally; user-initiated exports exist | Verify no new upload/analytics SDK was added. |
| Map-area queries / location | Review required | External services receive geographic query areas and network metadata; evaluate collection/sharing definitions and exceptions. |
| Transit protection | Current map endpoints use HTTPS | Inspect all final app/SDK requests. |
| Deletion | Local controls implemented | Does not delete files already exported/shared or provider logs. |

Use [Google's current Data safety instructions](https://support.google.com/googleplay/android-developer/answer/10787469); do not auto-submit "No data shared" from this document.

### 2.4 Google Play Review Video and Declaration
- **Use Case:** Foreground fitness tracking (walk, run, cycle).
- **Review Video:** Short 30-second screen capture demonstrating:
  1. Opening the app and tapping "Start a run" / "Explore".
  2. The in-app location disclosure dialog.
  3. Granting location permission.
  4. Active recording with the persistent Android notification appearing in the notification shade.
  5. Screen lock and resume showing continuous route recording without pauses or lost points.

### 2.5 Store Listing Details
- **App Title:** YourLeft: Run, Walk & Cycle
- **Short Description:** Record your route. Replay it through a living 3D miniature world.
- **Category:** Health & Fitness / Sports
- **Content Rating:** Complete the current Play Console questionnaire; do not preselect a rating from this guide.
- **Privacy Policy URL:** Planned: `https://yourleft.run/privacy`. The domain is not yet owned/hosted. Add this URL to Play Console only after DNS and HTTPS hosting work publicly and the page is verified without login or geographic restrictions.

---

## 3. Apple App Store (iOS)

### 3.1 Permissions & Info.plist
- `NSLocationWhenInUseUsageDescription`:
  > *"Keepleft uses your location while you record a walk, run, or cycle and to show your position in the miniature world."*
- *Native iOS background location:* Add `UIBackgroundModes` with `location` only once native CoreLocation background capture adapter is implemented.

### 3.2 App Store Privacy Nutrition Labels
Determine final answers from the actual binary and external map providers. Local recording and absence of accounts do not, by themselves, settle the classification of geographic network queries. No advertising/analytics SDK is intentionally used in this beta; audit dependencies and provider retention before submission.

### 3.3 Privacy Manifest (`PrivacyInfo.xcprivacy`)
- Included in the iOS application target at `ios/App/App/PrivacyInfo.xcprivacy`.
- `NSPrivacyTracking`: `false`
- `NSPrivacyCollectedDataTypes`: `[]` (empty list; developer collects zero data)
- `NSPrivacyAccessedAPITypes`: currently an empty array in the app manifest. Inspect required-reason APIs and merged plugin manifests; the file's existence is not proof of completeness.

---

## 4. In-App Data Management & User Rights

- **Per-Activity Deletion:** Available on the activity detail card (Home) and Activity Library (Run settings).
- **Bulk Deletion:** "Delete all data" button with confirmation alert in `Activity settings → Saved activities`; removes activities, unfinished recordings, offline maps, and preferences.
- **Route Export:** Single-click GeoJSON export per activity and "Export all activities" bulk GeoJSON export.
- **Account Deletion:** Not applicable as there are no user accounts.

---

## 5. Release Build & Validation Checklist

Before publishing:
1. `npm test -- --run` — all unit and integration tests pass.
2. `npm run build` — production web bundle compiles without errors.
3. `npm run android:apk` produces a debug APK. A release AAB requires separately configured release signing followed by `./gradlew bundleRelease` from the Android directory; the current project has no release signingConfig. See [Android build guide](handbook/02-ANDROID.md).
4. Physical Device Qualification (Pixel 7 / Android 14):
   - 30-minute walk/run test with screen locked.
   - Poor GPS / airplane mode recovery test.
   - Pause / resume / stop lifecycle test.
   - 1× and 4× 3D world replay smoothness check (verifying 0.2.16 fix).
   - Story Studio sticker export.
