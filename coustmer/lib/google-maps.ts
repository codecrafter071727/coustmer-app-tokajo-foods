import Constants from 'expo-constants';

/**
 * Resolve Google Maps / Places key from Expo public env or app.config extra.
 * Restart Expo with `-c` after changing `.env`.
 */
function resolveGoogleMapsApiKey(): string {
  const fromEnv = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? '';
  if (fromEnv) return fromEnv;

  const extra = Constants.expoConfig?.extra as
    | { googleMapsApiKey?: string }
    | undefined;
  return extra?.googleMapsApiKey?.trim() ?? '';
}

export const GOOGLE_MAPS_API_KEY = resolveGoogleMapsApiKey();

export function isGoogleMapsConfigured(): boolean {
  return Boolean(GOOGLE_MAPS_API_KEY);
}

export function assertGoogleMapsApiKey(): void {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error(
      'Google Maps API key is missing. Add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY to .env and restart Expo with npx expo start -c.'
    );
  }
}
