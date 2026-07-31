import type { CapacitorConfig } from '@capacitor/cli';

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
};

export default config;