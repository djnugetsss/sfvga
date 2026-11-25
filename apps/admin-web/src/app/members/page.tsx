'use client';

import { useMemo, useState } from 'react';
import { useMembers } from '@/hooks/useMembers';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { hasCapability } from '@/lib/permissions';
import { useAdminRoles } from '@/hooks/useAdminRoles';
import { RequireCapability } from '@/components/RequireCapability';
import { GrantAdminControl } from '@/components/members/GrantAdminControl';
import {
  PageHeader,
  Input,
  Badge,
  Spinner,
  EmptyState,
  ErrorBanner,
} from '@/components/ui/primitives';

export default function MembersPage() {
  const { data: members, isLoading, isError, refetch } = useMembers();
  const { access, firebaseUser } = useAdminAuth();
  const rolesQuery = useAdminRoles();
  const canGrant = hasCapability(access, 'grantAdmin');
  const roles = (rolesQuery.data ?? []).filter(
    (role) => role.active && !role.deletedAt && !role.system,
  );
  const superAdminName =
    rolesQuery.data?.find((role) => role.system && role.active && !role.deletedAt)?.name ??
    'Super Admin';
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return members ?? [];
    return (members ?? []).filter((member) =>
      [member.displayName, member.phone, member.email].some((field) =>
        (field ?? '').toLowerCase().includes(term),
      ),
    );
  }, [members, search]);

  return (
    <RequireCapability capability="members">
      <PageHeader title="Members" />

      <div className="mb-5 w-full max-w-sm">
        <Input
          placeholder="Search by name, phone, or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isError ? <ErrorBanner message="Couldn't load members." onRetry={() => refetch()} /> : null}

      {isLoading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState message="No members found." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surfaceMuted/55 text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Role</th>
                {canGrant ? <th className="px-4 py-3 font-medium">Admin access</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((member) => (
                <tr key={member.uid} className="hover:bg-brandSoft/20">
                  <td className="px-4 py-4 font-semibold text-ink">{member.displayName}</td>
                  <td className="px-4 py-4 text-muted">
                    <p>{member.phone}</p>
                    {member.email ? <p className="text-sm">{member.email}</p> : null}
                  </td>
                  <td className="px-4 py-4">
                    {member.isSuperAdmin ? (
                      <Badge tone="warning">{superAdminName}</Badge>
                    ) : member.organizationRoleId ? (
                      <Badge tone="info">
                        {roles.find((role) => role.id === member.organizationRoleId)?.name ??
                          'Admin role'}
                      </Badge>
                    ) : (
                      <span className="text-muted">Member</span>
                    )}
                  </td>
                  {canGrant ? (
                    <td className="px-4 py-4">
                      <GrantAdminControl
                        uid={member.uid}
                        currentRoleId={member.organizationRoleId}
                        roles={roles}
                        isSuperAdmin={member.isSuperAdmin}
                        superAdminName={superAdminName}
                        viewerUid={firebaseUser?.uid}
                      />
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </RequireCapability>
  );
}
