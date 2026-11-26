import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import EventListScreen from '@/screens/events/EventListScreen';
import EventDetailScreen from '@/screens/events/EventDetailScreen';
import SeasonDetail from '@/screens/events/SeasonDetail';
import RegistrationScreen from '@/screens/events/RegistrationScreen';
import { useTheme } from '@/providers/ThemeProvider';
import { NavigationBackButton } from '@/components/ui/NavigationBackButton';

export type EventStackParamList = {
  EventList: undefined;
  EventDetail: { eventId: string };
  SeasonDetail: { eventId: string };
  Registration: { eventId: string };
};

const Stack = createNativeStackNavigator<EventStackParamList>();

export function EventStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        animation: 'slide_from_right',
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="EventList"
        component={EventListScreen}
        options={{ headerShown: false, title: 'Events' }}
      />
      <Stack.Screen
        name="EventDetail"
        component={EventDetailScreen}
        options={({ navigation }) => ({
          title: 'Event',
          headerLeft: () => (
            <NavigationBackButton
              label="Back to events"
              onPress={() => {
                if (navigation.getState().index > 0) navigation.popToTop();
                else navigation.replace('EventList');
              }}
            />
          ),
        })}
      />
      <Stack.Screen name="SeasonDetail" component={SeasonDetail} options={{ title: 'Community event' }} />
      <Stack.Screen
        name="Registration"
        component={RegistrationScreen}
        options={({ navigation, route }) => ({
          title: 'Register',
          headerLeft: () => (
            <NavigationBackButton
              label="Back to event"
              onPress={() => {
                const state = navigation.getState();
                const previousRoute = state.routes[state.index - 1];
                if (previousRoute?.name === 'EventDetail') navigation.goBack();
                else navigation.replace('EventDetail', { eventId: route.params.eventId });
              }}
            />
          ),
        })}
      />
    </Stack.Navigator>
  );
}
