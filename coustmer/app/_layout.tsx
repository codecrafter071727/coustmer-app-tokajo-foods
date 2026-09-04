import 'react-native-gesture-handler';

import '../global.css';

import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { authTheme } from '@/constants/auth-theme';
import { ScreenTopOffsetProvider } from '@/components/common/ScreenTopOffsetProvider';
import { useAppFonts } from '@/lib/fonts';
import { queryClient, asyncStoragePersister, shouldPersistQuery } from '@/lib/query-client';
import { useAuthStore } from '@/store/auth-store';
import { CrashBoundary } from '@/components/common/CrashBoundary';
import { SocketProvider } from '@/lib/socket/SocketProvider';

// Keep the native splash visible while we initialise.
// Web has no native splash — calling this there leaves a blank white page.
if (Platform.OS !== 'web') {
  void SplashScreen.preventAutoHideAsync();
}

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const [fontsLoaded, fontError] = useAppFonts();
  const [appReady, setAppReady] = useState(false);

  // Kick off auth hydration once on mount.
  useEffect(() => {
    hydrate().catch(() => {
      // hydrate already sets isHydrated in its own catch; this is a safety net
    });
  }, [hydrate]);

  // Once fonts (or font failure) and auth store are ready, mark the app ready.
  // Font errors must not leave the app stuck on a blank splash that looks like a crash.
  useEffect(() => {
    if ((fontsLoaded || fontError) && isHydrated) {
      setAppReady(true);
    }
  }, [fontsLoaded, fontError, isHydrated]);

  // Hard timeout so a hung hydrate/font load never freezes the process forever.
  useEffect(() => {
    const timer = setTimeout(() => setAppReady(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  // Hide the native splash screen only after the first frame has painted,
  // so there is zero white-flash between splash and real UI.
  const onLayoutRootView = useCallback(async () => {
    if (appReady) {
      await SplashScreen.hideAsync();
    }
  }, [appReady]);

  // Native: render nothing so the splash stays on top.
  // Web: show a loader — `return null` is a blank white tab.
  if (!appReady) {
    if (Platform.OS === 'web') {
      return (
        <View
          style={{
            flex: 1,
            height: '100vh',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: authTheme.bg,
            gap: 12,
          }}
        >
          <ActivityIndicator color={authTheme.brand} size="large" />
          <Text style={{ color: authTheme.textMuted, fontWeight: '700' }}>
            Loading Tokajo…
          </Text>
        </View>
      );
    }
    return null;
  }

  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister: asyncStoragePersister,
            dehydrateOptions: {
              shouldDehydrateQuery: (query) =>
                query.state.status === 'success' && shouldPersistQuery(query),
            },
          }}
        >
          <ScreenTopOffsetProvider>
            <CrashBoundary>
            <SocketProvider>
              <View
                style={{ flex: 1, backgroundColor: authTheme.bg }}
                onLayout={onLayoutRootView}
              >
                <StatusBar style="dark" />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    animation: 'fade',
                    contentStyle: { backgroundColor: authTheme.bg },
                  }}
                />
              </View>
            </SocketProvider>
            </CrashBoundary>
          </ScreenTopOffsetProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
