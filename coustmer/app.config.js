const mapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || '';
const apiUrl =
  process.env.EXPO_PUBLIC_API_URL?.trim() || 'http://api.viharfood.in';

/** @type {import('expo/config').ExpoConfig} */
const config = {
  name: 'TOKAJO FOODS',
  slug: 'Food-Delivery-App',
  version: '1.0.1',
  scheme: 'fooddeliveryapp',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#FFFFFF',
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Allow Food Delivery to access your location to set your delivery address and find restaurants near you.',
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          minSdkVersion: 24,
          usesCleartextTraffic: true,
        },
      },
    ],
    '@react-native-community/datetimepicker',
    './withMinSdkVersion.js',
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.fooddeliveryapp.customer',
    config: {
      googleMapsApiKey: mapsKey,
    },
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'Allow Food Delivery to access your location to set your delivery address and find restaurants near you.',
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: true,
      },
    },
  },
  android: {
    package: 'com.fooddeliveryapp.customer',
    versionCode: 2,
    softwareKeyboardLayoutMode: 'resize',
    adaptiveIcon: {
      foregroundImage: './assets/android-icon-foreground.png',
      monochromeImage: './assets/android-icon-monochrome.png',
      backgroundColor: '#FFFFFF',
    },
    predictiveBackGestureEnabled: false,
    permissions: [
      'android.permission.INTERNET',
      'android.permission.ACCESS_NETWORK_STATE',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
    ],
    config: {
      googleMaps: {
        apiKey: mapsKey,
      },
    },
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: 'f7fa7a0f-c673-4c5c-9180-d80fd28e41c0',
    },
    apiUrl,
    googleMapsApiKey: mapsKey,
  },
};

module.exports = config;
