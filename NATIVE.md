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

## 4. App Links (Android)

`public/.well-known/assetlinks.json` is served from
`https://artistrysynk.app/.well-known/assetlinks.json`.

1. Get your signing fingerprint:
   ```bash
   keytool -list -v -keystore <your.keystore> -alias <alias> | grep SHA256
   ```
   (For Play App Signing, copy the SHA-256 from Play Console → Setup → App signing.)
2. Paste it into `sha256_cert_fingerprints`, then republish.
3. Add the verified intent filter to `android/app/src/main/AndroidManifest.xml`
   inside the main `<activity>`:
   ```xml
   <intent-filter android:autoVerify="true">
     <action android:name="android.intent.action.VIEW" />
     <category android:name="android.intent.category.DEFAULT" />
     <category android:name="android.intent.category.BROWSABLE" />
     <data android:scheme="https" android:host="artistrysynk.app" />
   </intent-filter>
   ```

## 5. Before submitting to the stores

Remove the live-reload block from `capacitor.config.ts` so the app ships the
bundled build instead of the Lovable sandbox URL:

```ts
// delete this for store builds
server: { url: '...', cleartext: true },
```

Then `npm run build && npx cap sync`.

Read more: https://lovable.dev/blog/2024-11-27-mobile-app-development-with-capacitor