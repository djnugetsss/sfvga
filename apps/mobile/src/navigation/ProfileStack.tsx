import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProfileScreen from '@/screens/profile/ProfileScreen';
import FamilyMembersScreen from '@/screens/profile/FamilyMembersScreen';
import CommunityHubScreen, { CommunityDetailScreen } from '@/screens/community/CommunityScreen';
import { useTheme } from '@/providers/ThemeProvider';
import { NavigationBackButton } from '@/components/ui/NavigationBackButton';

export type ProfileStackParamList = {
  ProfileMain: undefined;
  FamilyMembers: undefined;
  CommunityHub: undefined;
  CommunityDetail: { topic: 'about' | 'board' | 'membership' | 'youth' | 'resources' | 'gallery' };
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{ headerShown: false, title: 'Profile' }}
      />
      <Stack.Screen
        name="FamilyMembers"
        component={FamilyMembersScreen}
        options={({ navigation }) => ({
          title: 'Family Members',
          headerLeft: () => (
            <NavigationBackButton
              label="Back to profile"
              onPress={() => {
                if (navigation.canGoBack()) navigation.popToTop();
                else navigation.replace('ProfileMain');
              }}
            />
          ),
        })}
      />
      <Stack.Screen name="CommunityHub" component={CommunityHubScreen} options={{ title: 'SFVGA' }} />
      <Stack.Screen
        name="CommunityDetail"
        component={CommunityDetailScreen}
        options={{ title: 'SFVGA' }}
      />
    </Stack.Navigator>
  );
}
