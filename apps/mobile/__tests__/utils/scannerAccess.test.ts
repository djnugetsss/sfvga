import type { AdminAccessSummary } from '@sfvga/shared-types';
import { canShowEventScanAction, hasPermanentScannerAccess } from '@/utils/scannerAccess';

const noAccess: AdminAccessSummary = {
  isSuperAdmin: false,
  organizationRole: null,
  eventAccess: [],
};

describe('hasPermanentScannerAccess', () => {
  it('allows Super Admins to scan organization-wide', () => {
    expect(hasPermanentScannerAccess({ ...noAccess, isSuperAdmin: true })).toBe(true);
  });

  it('allows organization roles with ticket scanning permission', () => {
    expect(
      hasPermanentScannerAccess({
        ...noAccess,
        organizationRole: {
          id: 'operations',
          name: 'Operations',
          permissions: ['tickets.scan'],
        },
      }),
    ).toBe(true);
  });

  it('does not treat event-specific scanning as permanent access', () => {
    expect(
      hasPermanentScannerAccess({
        ...noAccess,
        eventAccess: [
          {
            eventId: 'event-1',
            eventName: 'Navratri',
            roleId: 'scanner',
            roleName: 'Ticket Scanner',
            permissions: ['tickets.scan'],
            activatesAt: { seconds: 1, nanoseconds: 0 },
            expiresAt: { seconds: 2, nanoseconds: 0 },
          },
        ],
      }),
    ).toBe(false);
  });
});

describe('canShowEventScanAction', () => {
  it('shows the shortcut for an active event scanner', () => {
    expect(canShowEventScanAction({ hasScanPermission: true, canScan: true }, false)).toBe(true);
  });

  it('shows the event shortcut for a permanent scanner even before the temporary grant begins', () => {
    expect(canShowEventScanAction({ hasScanPermission: true, canScan: false }, true)).toBe(true);
  });

  it('does not show a scan shortcut on another staff role', () => {
    expect(canShowEventScanAction({ hasScanPermission: false, canScan: false }, true)).toBe(false);
  });

  it('keeps inactive event-only scanner assignments unavailable', () => {
    expect(canShowEventScanAction({ hasScanPermission: true, canScan: false }, false)).toBe(false);
  });
});
