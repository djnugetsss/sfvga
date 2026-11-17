import React from 'react';
import { View } from 'react-native';
import { NavigationContainer, type NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthContext } from '@/providers/AuthProvider';
import { AuthStack, type AuthStackParamList } from './AuthStack';
import { MainTabs, type MainTabParamList } from './MainTabs';
import { linking } from './linking';
import { StartupHomeSkeleton } from '@/components/ui/StartupHomeSkeleton';
import { useDelayedSkeleton } from '@/hooks/useDelayedSkeleton';
import AdminDashboardScreen from '@/screens/admin/AdminDashboardScreen';
import ScannerScreen from '@/screens/scanner/ScannerScreen';
import AlbumListScreen from '@/screens/gallery/AlbumListScreen';
import AlbumViewScreen from '@/screens/gallery/AlbumViewScreen';
import FeedbackPromptScreen from '@/screens/feedback/FeedbackPromptScreen';
import AnnouncementsListScreen from '@/screens/announcements/AnnouncementsListScreen';
import NotificationsScreen from '@/screens/notifications/NotificationsScreen';
import CompleteProfileScreen from '@/screens/auth/CompleteProfileScreen';
import { useTheme } from '@/providers/ThemeProvider';
import { NavigationBackButton } from '@/components/ui/NavigationBackButton';

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  // NavigatorScreenParams lets sibling root screens (e.g. Notifications) deep-link into a
  // specific tab/stack such as Events → EventDetail.
  Main: NavigatorScreenParams<MainTabParamList>;
  Scanner: { eventId: string; eventName: string };
  AlbumList: undefined;
  AlbumView: { albumId: string; eventName: string };
  FeedbackPrompt: { eventId: string; eventName: string };
  AnnouncementsList: undefined;
  Notifications: undefined;
  /** In-app organizer dashboard (admin-web login + shell). */
  AdminDashboard: undefined;
  CompleteProfile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { isLoading, isProfileLoading, isAuthenticated, userProfile } = useAuthContext();
  const { colors } = useTheme();
  const showStartupSkeleton = useDelayedSkeleton(
    isLoading || (isAuthenticated && isProfileLoading),
    450,
  );

  if (isLoading || (isAuthenticated && isProfileLoading)) {
    // Firebase must resolve the saved sign-in before we know which screen to mimic.
    // Keep the splash color until then rather than showing the wrong layout.
    if (isLoading || !showStartupSkeleton) {
      return <View style={{ flex: 1, backgroundColor: colors.background }} />;
    }
    return <StartupHomeSkeleton />;
  }

  const needsProfileSetup = isAuthenticated && !userProfile?.displayName?.trim();

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
          headerBackTitleVisible: false,
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthStack} />
        ) : needsProfileSetup ? (
          <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="Scanner"
              component={ScannerScreen}
              options={({ navigation }) => ({
                headerShown: true,
                title: 'Scan Tickets',
                presentation: 'modal',
                headerLeft: () => (
                  <NavigationBackButton
                    label="Close scanner"
                    onPress={() => {
                      if (navigation.canGoBack()) navigation.goBack();
                      else navigation.replace('Main', { screen: 'Home' });
                    }}
                  />
                ),
              })}
            />
            <Stack.Screen
              name="AlbumList"
              component={AlbumListScreen}
              options={({ navigation }) => ({
                headerShown: true,
                title: 'Photos',
                headerLeft: () => (
                  <NavigationBackButton
                    onPress={() => {
                      if (navigation.canGoBack()) navigation.goBack();
                      else navigation.replace('Main', { screen: 'Home' });
                    }}
                  />
                ),
              })}
            />
            <Stack.Screen
              name="AlbumView"
              component={AlbumViewScreen}
              options={({ navigation }) => ({
                headerShown: true,
                title: 'Album',
                headerLeft: () => (
                  <NavigationBackButton
                    label="Back to photos"
                    onPress={() => {
                      if (navigation.canGoBack()) navigation.goBack();
                      else navigation.replace('AlbumList');
                    }}
                  />
                ),
              })}
            />
            <Stack.Screen
              name="FeedbackPrompt"
              component={FeedbackPromptScreen}
              options={{ headerShown: false, presentation: 'transparentModal' }}
            />
            <Stack.Screen
              name="AnnouncementsList"
              component={AnnouncementsListScreen}
              options={({ navigation }) => ({
                headerShown: true,
                title: 'Announcements',
                headerLeft: () => (
                  <NavigationBackButton
                    onPress={() => {
                      if (navigation.canGoBack()) navigation.goBack();
                      else navigation.replace('Main', { screen: 'Home' });
                    }}
                  />
                ),
              })}
            />
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={{ headerShown: false, presentation: 'transparentModal', animation: 'fade' }}
            />
            <Stack.Screen
              name="AdminDashboard"
              component={AdminDashboardScreen}
              options={{ headerShown: false, presentation: 'fullScreenModal' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
