'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { AdminRoleDefinition } from '@sfvga/shared-types';
import { functionsClient } from '@/services/functionsClient';
import { Select } from '@/components/ui/primitives';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const SUPER_ADMIN_OPTION = '__super_admin__';

export function GrantAdminControl({
  uid,
  currentRoleId,
  roles,
  isSuperAdmin,
  superAdminName = 'Super Admin',
  viewerUid,
}: {
  uid: string;
  currentRoleId: string | null;
  roles: AdminRoleDefinition[];
  isSuperAdmin: boolean;
  superAdminName?: string;
  viewerUid?: string;
}) {
  const queryClient = useQueryClient();
  const firstRoleId = roles[0]?.id ?? '';
  const [roleId, setRoleId] = useState(
    isSuperAdmin ? SUPER_ADMIN_OPTION : (currentRoleId ?? firstRoleId),
  );
  const [busy, setBusy] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [confirmSuper, setConfirmSuper] = useState(false);
  const [confirmChangeSuper, setConfirmChangeSuper] = useState(false);
  const [confirmRevokeSuper, setConfirmRevokeSuper] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isOwnSuperAdminAccess = isSuperAdmin && uid === viewerUid;

  useEffect(
    () => setRoleId(isSuperAdmin ? SUPER_ADMIN_OPTION : (currentRoleId ?? firstRoleId)),
    [currentRoleId, firstRoleId, isSuperAdmin],
  );
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'members'] });

  const apply = async () => {
    if (!roleId || roleId === SUPER_ADMIN_OPTION) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await functionsClient.adminRoles.assign({ targetUid: uid, roleId });
      if (isSuperAdmin) {
        await functionsClient.adminRoles.revokeSuperAdmin(uid);
        setConfirmChangeSuper(false);
      }
      setMessage('Access saved');
      await refresh();
    } catch {
      setError('Could not finish changing access. Check the current role and try again.');
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    setBusy(true);
    setError(null);
    try {
      await functionsClient.adminRoles.revoke(uid);
      setConfirmRevoke(false);
      setMessage('Access revoked');
      await refresh();
    } catch {
      setError('Failed to revoke access');
    } finally {
      setBusy(false);
    }
  };

  const grantSuper = async () => {
    setBusy(true);
    setError(null);
    try {
      await functionsClient.adminRoles.grantSuperAdmin(uid);
      if (currentRoleId) await functionsClient.adminRoles.revoke(uid);
      setConfirmSuper(false);
      setMessage('Super Admin access granted');
      await refresh();
    } catch {
      setError('Could not finish changing access. Check the current role and try again.');
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const revokeSuper = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (currentRoleId) await functionsClient.adminRoles.revoke(uid);
      await functionsClient.adminRoles.revokeSuperAdmin(uid);
      setConfirmRevokeSuper(false);
      setMessage('Super Admin access revoked');
      await refresh();
    } catch {
      setError('Failed to revoke Super Admin access');
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-[12rem] flex-1 sm:max-w-56">
          <Select
            aria-label="Admin role"
            value={roleId}
            onChange={(event) => setRoleId(event.target.value)}
            disabled={busy || isOwnSuperAdminAccess}
          >
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
            <option value={SUPER_ADMIN_OPTION}>{superAdminName}</option>
          </Select>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            if (roleId === SUPER_ADMIN_OPTION) setConfirmSuper(true);
            else if (isSuperAdmin) setConfirmChangeSuper(true);
            else void apply();
          }}
          loading={busy}
          disabled={
            !roleId ||
            isOwnSuperAdminAccess ||
            (isSuperAdmin && roleId === SUPER_ADMIN_OPTION) ||
            (!isSuperAdmin && roleId === currentRoleId)
          }
        >
          {currentRoleId || isSuperAdmin ? 'Change' : 'Grant'}
        </Button>
        {currentRoleId || isSuperAdmin ? (
          <Button
            size="sm"
            variant="danger"
            onClick={() => (isSuperAdmin ? setConfirmRevokeSuper(true) : setConfirmRevoke(true))}
            disabled={busy || isOwnSuperAdminAccess}
          >
            Revoke
          </Button>
        ) : null}
      </div>
      {isOwnSuperAdminAccess ? (
        <p className="mt-1 text-sm text-muted">Another Super Admin must change your access.</p>
      ) : null}
      {message ? <p className="mt-1 text-sm text-success">{message}</p> : null}
      {error ? <p className="mt-1 text-sm text-error">{error}</p> : null}
      <ConfirmDialog
        open={confirmRevoke}
        title="Revoke admin access?"
        description="This member will immediately lose organization-wide admin access. Their member account is not affected."
        confirmLabel="Revoke access"
        tone="danger"
        loading={busy}
        onConfirm={() => void revoke()}
        onCancel={() => setConfirmRevoke(false)}
      />
      <ConfirmDialog
        open={confirmSuper}
        title="Grant protected Super Admin access?"
        description="This gives the member every permission, including the ability to create roles and grant admin access to others."
        confirmLabel="Grant Super Admin"
        loading={busy}
        onConfirm={() => void grantSuper()}
        onCancel={() => setConfirmSuper(false)}
      />
      <ConfirmDialog
        open={confirmChangeSuper}
        title="Change Super Admin access?"
        description="This member will lose Super Admin permissions and receive the selected admin role."
        confirmLabel="Change role"
        loading={busy}
        onConfirm={() => void apply()}
        onCancel={() => setConfirmChangeSuper(false)}
      />
      <ConfirmDialog
        open={confirmRevokeSuper}
        title="Revoke Super Admin access?"
        description="This member will immediately lose admin access. Their member account is not affected."
        confirmLabel="Revoke access"
        tone="danger"
        loading={busy}
        onConfirm={() => void revokeSuper()}
        onCancel={() => setConfirmRevokeSuper(false)}
      />
    </div>
  );
}
