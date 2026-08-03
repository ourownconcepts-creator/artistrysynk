import type { CapacitorConfig } from '@capacitor/cli';

// Development config: hot-reload from the Lovable sandbox preview.
// Use this for local emulator/dev testing only. NEVER use it for store builds.
const config: CapacitorConfig = {
  appId: 'app.lovable.cd44e32346394b89b1bc3fc2b2e640de',
  appName: 'artistrysynk',
  webDir: 'dist',
  server: {
    url: 'https://cd44e323-4639-4b89-b1bc-3fc2b2e640de.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  ios: {
    contentInset: 'always',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#0a0a0f',
      showSpinner: false,
    },
  },
};

export default config;
