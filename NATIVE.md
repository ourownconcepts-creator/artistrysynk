# ArtistrySynk — native (iOS / Android) build guide

App ID: `app.lovable.cd44e32346394b89b1bc3fc2b2e640de`
App name: `artistrysynk`
Public origin used for OAuth/deep links: `https://artistrysynk.app`

## 1. First-time setup (on your machine)

```bash
git pull
npm install
npx cap add ios      # macOS + Xcode
npx cap add android  # Android Studio
npm run build
npx cap sync
```

Run it for development with hot-reload:

```bash
npx cap run ios --config capacitor.config.dev.ts
npx cap run android --config capacitor.config.dev.ts
```

Re-run `git pull && npm install && npm run build && npx cap sync` after every Lovable change.

**For store builds:** make sure `capacitor.config.ts` is the active config (it has **no** `server.url`). The `capacitor.config.dev.ts` file is only for sandbox testing and must not be used for App Store or Play Store submissions.


## 2. App icons & splash screens

Source art lives in `resources/`:

- `icon.png` (1024×1024) — app icon
- `icon-foreground.png` / `icon-background.png` — Android adaptive icon layers
- `splash.png` / `splash-dark.png` (2732×2732) — splash screens

Generate every platform size:

```bash
npm i -D @capacitor/assets
npx capacitor-assets generate --iconBackgroundColor '#0a0a0f' --splashBackgroundColor '#0a0a0f'
npx cap sync
```

## 3. Universal Links (iOS)

`public/.well-known/apple-app-site-association` is served from
`https://artistrysynk.app/.well-known/apple-app-site-association`.

1. Replace `TEAMID` in that file with your Apple Developer Team ID, then republish.
2. In Xcode → target → **Signing & Capabilities** → add **Associated Domains** →
   `applinks:artistrysynk.app` and `webcredentials:artistrysynk.app`.
3. The entitlement files `Entitlements-Debug.plist` and `Entitlements-Release.plist`
   are already in the project; point the Xcode build settings to them.

## 4. App Links (Android)

`public/.well-known/assetlinks.json` is served from
`https://artistrysynk.app/.well-known/assetlinks.json`.

1. Generate or use your upload keystore and get its SHA-256 fingerprint:
   ```bash
   keytool -list -v -keystore <your.keystore> -alias <alias> -storepass <pass> | grep SHA256
   ```
   (For Play App Signing, copy the SHA-256 from Play Console → Setup → App signing.)
2. Paste the fingerprint into `sha256_cert_fingerprints` in `public/.well-known/assetlinks.json`, then republish.
3. The `AndroidManifest.xml` intent filter is already configured; verify it is present after `npx cap sync`.

## 5. Required accounts and certificates before submission

- Apple Developer Program membership (paid).
- Apple Developer Team ID for deep links and signing.
- macOS + Xcode for the iOS build and upload.
- Android Studio + a release keystore for the Android bundle (AAB).
- Google Play Console account for the Android release.
- App Store Connect listing with screenshots, description, keywords, and privacy details.

## 6. Before submitting to the stores

Use the production config (the default `capacitor.config.ts` has **no** live-reload server):

```bash
npm run build
npx cap sync
npx cap open ios      # build and archive in Xcode
npx cap open android  # build signed release AAB in Android Studio
```

Read more: https://lovable.dev/blog/2024-11-27-mobile-app-development-with-capacitor
