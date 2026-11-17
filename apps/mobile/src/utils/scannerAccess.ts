import type { AdminAccessSummary } from '@sfvga/shared-types';

/** Organization scanner access is permanent until the organization role is revoked or edited. */
export function hasPermanentScannerAccess(access?: AdminAccessSummary | null): boolean {
  return Boolean(
    access?.isSuperAdmin || access?.organizationRole?.permissions.includes('tickets.scan'),
  );
}

/** Keep an event-specific scan shortcut for permanent scanners without adding it to other staff roles. */
export function canShowEventScanAction(
  role: { hasScanPermission: boolean; canScan: boolean },
  permanentScannerAccess: boolean,
): boolean {
  return role.canScan || (permanentScannerAccess && role.hasScanPermission);
}
