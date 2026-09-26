import { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Impact Capture',
  slug: 'impact-capture',
  version: '0.1.0',
  orientation: 'portrait',
  scheme: 'impact-capture',
  userInterfaceStyle: 'dark',
  plugins: [
    'expo-router',
    [
      'expo-camera',
      {
        cameraPermission: 'Allow Impact Capture to take photos and record videos for evidence collection.',
        recordAudioAndroid: true,
      },
    ],
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission: 'Allow Impact Capture to access your location for geo-tagging evidence.',
        locationWhenInUsePermission: 'Allow Impact Capture to access your location for geo-tagging evidence.',
      },
    ],
    'expo-background-fetch',
  ],
  ios: {
    bundleIdentifier: 'com.impact.capture',
    supportsTablet: false,
    infoPlist: {
      NSCameraUsageDescription: 'Impact Capture needs camera access to capture evidence photos and videos.',
      NSLocationWhenInUseUsageDescription: 'Impact Capture needs your location to geo-tag captured evidence.',
      NSLocationAlwaysAndWhenInUseUsageDescription: 'Impact Capture needs background location for accurate geo-tagging.',
      UIBackgroundModes: ['fetch', 'location'],
    },
  },
  android: {
    package: 'com.impact.capture',
    permissions: [
      'CAMERA',
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
      'ACCESS_BACKGROUND_LOCATION',
    ],
  },
};

export default config;
