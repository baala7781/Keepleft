# 03 — iPhone: Xcode, signing, build, connect, install and update

This is the detailed continuation guide for the owner. An iPhone cannot install an arbitrary package the same way Android installs an APK.

## 1. What was already done

- Xcode was downloaded from Apple's website as `Xcode_27.1_beta.xip` after the App Store download flow stalled.
- It was extracted and opened at `/Users/baala/Downloads/Xcode.app`. First-launch components were installed; simulator runtimes were offered separately.
- The app project already exists at `apps/client-web/ios/App/App.xcodeproj`; do **not** run `cap add ios` again.
- Apple Account was added in Xcode and the owner's Personal Team selected for App signing.
- The iPhone was paired/trusted, Developer Mode was enabled, phone restarted and confirmation completed.
- A development-signed app was successfully built and installed. The last known pre-handover installation is `0.2.20` build `25` on 28 September 2026.
- Native foreground GPS and direct native HTTP map loading were added. See sections 9–10 for why this mattered.

Do not assume that the phone is currently connected or that a file in Downloads represents the newest installed code. Check the actual device/build.

## 2. Select the correct Xcode

In Terminal:

```sh
export DEVELOPER_DIR="/Users/baala/Downloads/Xcode.app/Contents/Developer"
xcodebuild -version
xcodebuild -showsdks
```

If Xcode is moved to Applications, use `/Applications/Xcode.app/Contents/Developer` instead. `DEVELOPER_DIR` only affects this terminal and child commands; it avoids changing the machine-wide selection.

The Mac previously selected `/Library/Developer/CommandLineTools`. Those tools alone cannot compile this iPhone app. If you prefer a permanent selection, explicitly choose the correct Xcode in Xcode Settings → Locations → Command Line Tools, or use `sudo xcode-select --switch /actual/path/Xcode.app/Contents/Developer` yourself. Do not blindly overwrite another project's Xcode configuration.

Open Xcode once and finish any component/license prompts. The iPhone SDK and supported device runtime are required. Downloading every simulator is not necessary for a physical-device build; simulator builds require an installed compatible runtime.

The beta version is the toolchain actually used here, not a blanket recommendation to ship with a beta SDK. Before store submission check Apple's currently accepted Xcode/SDK requirements.

## 3. Prepare current Keepleft assets

```sh
cd /Users/baala/Documents/Codex/2026-09-06/fir/atlas/apps/client-web
npm ci
npm run ios:sync
npm run ios:open
```

`ios:sync` builds the mobile bundle and copies it into the native project, then updates Capacitor plugins. Merely refreshing `localhost:3001` does not update iPhone. Merely pressing Build without sync after UI edits can package stale assets.

This project uses Swift Package Manager integration (`ios/App/CapApp-SPM/Package.swift`), not a documented CocoaPods-first workflow. Let Xcode resolve packages. Do not add a second dependency manager as a troubleshooting guess.

## 4. Signing in Xcode

1. Xcode → Settings → Accounts: sign in to your Apple Account yourself.
2. Open `App.xcodeproj` and select the **App target**, not just the project.
3. Signing & Capabilities → enable Automatically manage signing.
4. Select your Personal Team, or your paid development team if enrolled.
5. Keep bundle identifier `app.keepleft.mobile` for updates to the existing installation.
6. Select the **App** scheme and your physical iPhone destination.
7. Resolve the displayed signing issue, if any; Xcode needs a valid certificate/private key and provisioning profile authorizing that device.

Do not paste Apple passwords, private keys or provisioning files into public issues/chats. Another developer's account may not have permission to use your existing bundle identifier; changing it creates a separate app and separate storage rather than migrating the old app.

Current version fields are in `ios/App/App.xcodeproj/project.pbxproj`: `MARKETING_VERSION=0.2.20`, `CURRENT_PROJECT_VERSION=25`. Increment deliberately for a new distributed build; keep Debug/Release values consistent. An About label hardcoded elsewhere may be stale, so it is not definitive evidence of binary version.

## 5. Connect and trust the iPhone

1. Unlock iPhone and connect it using a data-capable cable.
2. Confirm Trust This Computer and enter the device passcode on the phone.
3. In Xcode's device window (Devices and Simulators/Device Hub depending on Xcode), wait for pairing and preparation.
4. If asked, turn on Settings → Privacy & Security → Developer Mode.
5. Restart the phone and confirm enabling Developer Mode after restart. Merely flipping the switch before restart is insufficient.
6. Run the App scheme. If a developer-trust prompt appears, follow the phone's Settings → General → VPN & Device Management instructions for that development identity.

**Leave Developer Mode enabled while using this development-signed Keepleft build.** It is not required only at installation time. TestFlight/App Store distribution is a different path and does not require Developer Mode. See [Apple's Developer Mode guide](https://developer.apple.com/documentation/xcode/enabling-developer-mode-on-a-device).

You do not need to toggle Developer Mode before every build; normally it stays enabled until you disable it. You do not need to keep the phone tethered to use the installed app.

## 6. Build and install from Terminal

Run from `apps/client-web`, after signing has been configured in Xcode:

```sh
export DEVELOPER_DIR="/Users/baala/Downloads/Xcode.app/Contents/Developer"
npm run ios:sync
xcodebuild -quiet \
  -project ios/App/App.xcodeproj \
  -scheme App -configuration Debug \
  -destination 'generic/platform=iOS' \
  -derivedDataPath /private/tmp/keepleft-ios-device \
  -allowProvisioningUpdates build
```

This generic destination can build without a currently connected phone when suitable signing/provisioning is available. `-allowProvisioningUpdates` permits Xcode to communicate with Apple's provisioning service using the configured account.

Inspect connected/paired devices, then replace the placeholder with the returned identifier:

```sh
xcrun devicectl list devices
codesign --verify --deep --strict /private/tmp/keepleft-ios-device/Build/Products/Debug-iphoneos/App.app
xcrun devicectl device install app \
  --device YOUR_IPHONE_IDENTIFIER \
  /private/tmp/keepleft-ios-device/Build/Products/Debug-iphoneos/App.app
```

No personal device identifier is embedded in this guide. Installation requires a reachable, trusted device and valid signing. `BUILD SUCCEEDED` is not the same as `install succeeded`, and neither proves GPS/replay works outdoors.

For compile-only diagnosis without signing:

```sh
xcodebuild -quiet \
  -project ios/App/App.xcodeproj -scheme App -configuration Debug \
  -destination 'generic/platform=iOS' \
  -derivedDataPath /private/tmp/keepleft-ios-unsigned \
  CODE_SIGNING_ALLOWED=NO build
```

The result of this last command is **not an installable iPhone package**. Do not send it to a tester as a finished app. Simulator `.app` products are also not physical-iPhone binaries.

## 7. Optional IPA packaging

An IPA is a ZIP with `Payload/App.app` inside. Packaging does not create signing. After the signed build and verification above, this standalone shell script packages it in a temporary directory:

```sh
#!/bin/zsh
set -e
codesign --verify --deep --strict /private/tmp/keepleft-ios-device/Build/Products/Debug-iphoneos/App.app
package_dir=$(mktemp -d /private/tmp/keepleft-ipa.XXXXXX)
mkdir "$package_dir/Payload"
ditto /private/tmp/keepleft-ios-device/Build/Products/Debug-iphoneos/App.app "$package_dir/Payload/App.app"
cd "$package_dir"
/usr/bin/zip -qry "$package_dir/Keepleft-development.ipa" Payload
echo "$package_dir/Keepleft-development.ipa"
```

Copy the resulting IPA to a durable folder if needed. Temporary folders may be cleaned by the OS. Do not re-sign blindly to make an invalid package appear valid. An old file named `Unsigned-Compile.zip` is source/build evidence, not an app installer.

## 8. Updates, WhatsApp, Wi-Fi and expiry

- **Can I send the IPA through WhatsApp and tap to update?** No, not for this Personal Team development workflow. The receiver needs valid device provisioning and a supported installation method. Having an older app installed does not bypass signing.
- **Must the cable be connected every build?** No for compilation. Installation requires a reachable paired phone; cable is simplest, but Xcode supports network-connected paired devices. Check device availability in Xcode or `devicectl`.
- **Why did an install succeed while unplugged?** A paired phone may be reachable over Wi-Fi. A prior installation succeeded without the user expecting a cable connection; the exact transport was not independently logged. This is not an app-store or over-the-air update mechanism built into Keepleft.
- **Will it expire?** Personal Team profiles expire after 7 days; rebuild/reprovision and reinstall. Apple's current [account overview](https://developer.apple.com/help/account/basics/about-your-developer-account) explains the restrictions. Do not hardcode one historical expiry date as a permanent rule.
- **Will updates erase activities?** Normal updates with the same identity should preserve the app container; still export important activities. Uninstall, bundle-ID changes, storage clearing and some recovery actions can lose data.
- **How do friends test easily?** Enroll in the appropriate paid Apple Developer Program and use TestFlight. Ad hoc distribution is another registered-device workflow, not unrestricted APK-style sharing. Consult [Apple distribution documentation](https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases).

## 9. GPS fix history and present limitations

The first iOS shell relied on browser geolocation. The platform adapter now uses `@capacitor/geolocation` 8.2.2 for foreground Core Location. `IOSLocationProvider` handles permission, watch lifecycle, error codes and late callbacks; `IOSActivityRuntime` uses it for preview and resume.

The Info.plist contains usage descriptions. That alone does not implement background recording. This iOS beta must be treated as **foreground-only**: screen lock or backgrounding can interrupt recording. Native background capture/persistence/recovery is still a significant release task. Do not promise Android parity or infer it from an `AlwaysAndWhenInUse` description string.

On the phone: Settings → Privacy & Security → Location Services on; Keepleft permission enabled; Precise Location on. Check outdoors. GPS fixes and a rendered map are separate systems.

## 10. Why the demo loaded but my current map did not

The bundled demo loaded from app files, but the original live-map path expected `/api/world`, a web-server API absent from a static Capacitor bundle. Initially the owner declined external map-area requests, so an offline-only iOS path was deliberately used. It correctly could not show an uncached area.

After explicit approval, 0.2.20 switched iOS to `loadNativeNeighborhood` in `lib/native/maps.ts`: Capacitor native HTTP → public Overpass → local IndexedDB cache. Android uses its native map cache; the website still uses its server API. The old offline helper remains in source but is not the current loader.

Public services receive the queried approximate geographic area and normal network metadata; saved route history is not included in those map requests. Failed downloads should show a recoverable error while GPS remains usable. See [04](04-LOCATION-MAPS-AND-DATA.md).

## 11. Common Xcode failures

| Error/symptom | Check |
|---|---|
| `xcodebuild requires Xcode` | Correct `DEVELOPER_DIR`; CommandLineTools alone is insufficient |
| No matching signing profile/team | App target team, Apple Account, certificate/private key, registered device, online provisioning |
| Developer Mode disabled | Phone toggle, restart and confirmation; keep enabled |
| Device unavailable | Unlock/trust, data cable, same network if wireless, Xcode device preparation |
| Package resolution failure | Network access, Capacitor SPM references, supported Xcode; do not delete source |
| Installed app unchanged | Re-run `ios:sync`, build correct checkout/scheme, verify installed build |
| App stopped opening after days | Expired Personal Team provisioning; re-sign and reinstall |
| Codesign trust error only in restricted automation | Verify in normal Terminal/Xcode with Keychain access; do not disable signing/security |
| Works in simulator, wrong GPS outdoors | Simulator location is synthetic; validate a real precise-location fix on device |

Reference: [Capacitor iOS workflow](https://capacitorjs.com/docs/ios). Check official documentation again when upgrading Xcode/Capacitor; this guide records the working project setup, not a promise about all future toolchains.
