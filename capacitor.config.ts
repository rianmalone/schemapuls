import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.klasspuls',
  appName: 'SchemaPuls',
  webDir: 'dist',
  server: {
    url: 'https://73947509-5746-45b1-b61d-70569eecec79.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#488AFF',
    },
  },
};

export default config;
