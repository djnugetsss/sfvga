import React, { useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { AuthProvider } from '@/providers/AuthProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { PushNotificationBootstrap } from '@/components/notifications/PushNotificationBootstrap';
import { RootNavigator } from '@/navigation/RootNavigator';
import { getFirebaseApp } from '@/services/firebase';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    'Fraunces-Regular': require('../assets/fonts/Fraunces_400Regular.ttf'),
    'Fraunces-SemiBold': require('../assets/fonts/Fraunces_600SemiBold.ttf'),
  });

  useEffect(() => {
    // Initialize Firebase on app start
    getFirebaseApp();
  }, []);

  // Web must remain usable if a font request is slow, blocked, or cached from an
  // earlier failed deployment. Native keeps the splash visible until fonts load.
  const appReady = Platform.OS === 'web' || fontsLoaded;

  const onLayoutRootView = useCallback(async () => {
    if (appReady) {
      await SplashScreen.hideAsync();
    }
  }, [appReady]);

  if (!appReady) {
    return null;
  }

  const tree = (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              <PushNotificationBootstrap />
              <StatusBar style="dark" />
              <RootNavigator />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );

  return tree;
}
