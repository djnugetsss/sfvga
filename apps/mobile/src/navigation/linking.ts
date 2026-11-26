import {
  getPathFromState as defaultGetPathFromState,
  getStateFromPath as defaultGetStateFromPath,
  type LinkingOptions,
} from '@react-navigation/native';
import type { RootStackParamList } from './RootNavigator';

export function scannerPath(eventId: string, eventName: string): string {
  return `/scan/${encodeURIComponent(eventId)}?eventName=${encodeURIComponent(eventName)}`;
}

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['sfvga-combined://', 'https://sfvga.org', 'https://sfvga-cabe6.web.app'],
  config: {
    screens: {
      Auth: {
        path: 'auth',
        screens: {
          PhoneSignIn: '',
          OtpVerify: 'verify',
        },
      },
      Main: {
        screens: {
          Home: 'home',
          Events: {
            screens: {
              EventList: 'events',
              SeasonDetail: 'events/program/:eventId',
              EventDetail: 'events/:eventId',
              Registration: 'events/:eventId/register',
            },
          },
          Tickets: 'tickets',
          Messages: 'messages',
          Profile: {
            path: 'profile',
            screens: {
              ProfileMain: '',
              FamilyMembers: 'family',
              CommunityHub: 'community',
              CommunityDetail: 'community/:topic',
            },
          },
        },
      },
      Notifications: 'notifications',
      Scanner: 'scan/:eventId',
      AdminDashboard: 'admin',
    },
  },
  getPathFromState(state, options) {
    const rootRoute = state.routes[state.index ?? 0];
    const nestedState = rootRoute?.state;
    const nestedRoute = nestedState?.routes[nestedState.index ?? 0];

    if (rootRoute?.name === 'Auth' && (!nestedRoute || nestedRoute.name === 'PhoneSignIn')) {
      return '/';
    }

    return defaultGetPathFromState(state, options);
  },
  getStateFromPath(path, options) {
    const normalized = path.replace(/^\//, '').split('?')[0];
    // The root URL is the single entry point. The currently mounted auth/member
    // navigator chooses its own initial screen after Firebase Auth resolves.
    if (!normalized) return undefined;
    // Admin dashboard sign-out → member Home (closes the admin modal stack).
    if (normalized === 'admin-closed') {
      return {
        routes: [
          {
            name: 'Main',
            state: {
              index: 0,
              routes: [{ name: 'Home' }],
            },
          },
        ],
      };
    }
    return defaultGetStateFromPath(path, options);
  },
};
