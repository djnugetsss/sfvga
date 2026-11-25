import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { StackActions } from '@react-navigation/native';
import { Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import HomeScreen from '@/screens/home/HomeScreen';
import { EventStack, type EventStackParamList } from './EventStack';
import TicketWalletScreen from '@/screens/tickets/TicketWalletScreen';
import MessagesScreen from '@/screens/messages/MessagesScreen';
import { ProfileStack, type ProfileStackParamList } from './ProfileStack';
import { useTheme } from '@/providers/ThemeProvider';
import { AppIcon, type AppIconName } from '@/components/ui/AppIcon';
import { MotionPressable } from '@/components/ui/MotionPressable';

export type MainTabParamList = {
  Home: undefined;
  // NavigatorScreenParams lets other tabs deep-link into a stack
  // (e.g. Home's "What's Next" card → EventDetail, or Registration → FamilyMembers).
  Events: NavigatorScreenParams<EventStackParamList>;
  Messages: { eventId?: string } | undefined;
  // Optional focusEventId pins that event's tickets to the top (still shows all others).
  // Cleared when leaving the Tickets tab so a later visit uses normal date order.
  Tickets: { focusEventId?: string } | undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

function TabButton({ children, style, ...props }: BottomTabBarButtonProps) {
  return (
    <MotionPressable {...props} pressedScale={0.92} style={[style, styles.tabButton]}>
      {children}
    </MotionPressable>
  );
}

function AnimatedTabIcon({
  focused,
  active,
  inactive,
  color,
}: {
  focused: boolean;
  active: AppIconName;
  inactive: AppIconName;
  color: string;
}) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    progress.value = withTiming(focused ? 1 : 0, { duration: reduceMotion ? 0 : 180 });
  }, [focused, progress, reduceMotion]);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 1,
    transform: [{ scale: 0.96 + progress.value * 0.04 }],
  }));

  return (
    <Animated.View
      style={[
        styles.iconBubble,
        { backgroundColor: focused ? colors.accentSoft : 'transparent' },
        animatedStyle,
      ]}
    >
      <AppIcon name={focused ? active : inactive} color={color} size={21} />
    </Animated.View>
  );
}

export function MainTabs() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const tabIcons: Record<keyof MainTabParamList, { active: AppIconName; inactive: AppIconName }> = {
    Home: { active: 'home', inactive: 'home-outline' },
    Events: { active: 'calendar', inactive: 'calendar-outline' },
    Messages: { active: 'chatbubbles', inactive: 'chatbubbles-outline' },
    Tickets: { active: 'ticket', inactive: 'ticket-outline' },
    Profile: { active: 'person', inactive: 'person-outline' },
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: colors.accentStrong,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelPosition: 'below-icon',
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: '600',
          marginBottom: 4,
        },
        tabBarIcon: ({ focused, color }) => (
          <AnimatedTabIcon
            focused={focused}
            active={tabIcons[route.name].active}
            inactive={tabIcons[route.name].inactive}
            color={color}
          />
        ),
        tabBarButton: (props) => <TabButton {...props} />,
        tabBarItemStyle: { marginVertical: 0 },
        tabBarStyle: {
          position: 'relative',
          height: 76 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingHorizontal: 4,
          paddingTop: 7,
          backgroundColor: colors.surface,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderWidth: 0,
          borderColor: colors.border,
          borderRadius: 0,
          ...Platform.select({
            web: { boxShadow: 'none' },
            default: {
              elevation: 0,
            },
          }),
        },
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { fontWeight: '700' },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false, title: 'Home' }}
      />
      <Tab.Screen
        name="Events"
        component={EventStack}
        options={{ headerShown: false, title: 'Events' }}
        listeners={({ navigation }) => ({
          blur: () => {
            const eventStack = navigation
              .getState()
              .routes.find((route: { name: string }) => route.name === 'Events')?.state;
            if (eventStack?.key && eventStack.index && eventStack.index > 0) {
              // Reset behind the next tab so returning to Events shows its list
              // immediately, without a visible stack-pop transition.
              navigation.dispatch({ ...StackActions.popToTop(), target: eventStack.key });
            }
          },
        })}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{ headerShown: false, title: 'Messages' }}
      />
      <Tab.Screen
        name="Tickets"
        component={TicketWalletScreen}
        options={{ headerShown: false, title: 'Tickets' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{ headerShown: false, title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabButton: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconBubble: {
    width: 52,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
