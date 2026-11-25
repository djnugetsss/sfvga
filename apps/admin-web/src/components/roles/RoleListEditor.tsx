'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { AdminPermission, AdminRoleDefinition } from '@sfvga/shared-types';
import { useAdminRoles, useAdminRoleMutations } from '@/hooks/useAdminRoles';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  Card,
  EmptyState,
  ErrorBanner,
  Field,
  Input,
  Spinner,
  Textarea,
} from '@/components/ui/primitives';

export const PERMISSION_GROUPS: Array<{
  label: string;
  permissions: Array<{ value: AdminPermission; label: string }>;
}> = [
  { label: 'Dashboard', permissions: [{ value: 'dashboard.view', label: 'View dashboard' }] },
  {
    label: 'Events',
    permissions: [
      { value: 'events.view', label: 'View' },
      { value: 'events.create', label: 'Create' },
      { value: 'events.edit', label: 'Edit' },
      { value: 'events.publish', label: 'Publish' },
      { value: 'events.delete', label: 'Delete' },
    ],
  },
  {
    label: 'Registrations',
    permissions: [
      { value: 'registrations.view', label: 'View' },
      { value: 'registrations.manage', label: 'Manage' },
    ],
  },
  {
    label: 'Tickets',
    permissions: [
      { value: 'tickets.scan', label: 'Scan' },
      { value: 'tickets.revoke', label: 'Revoke' },
    ],
  },
  {
    label: 'Staff',
    permissions: [
      { value: 'staff.view', label: 'View' },
      { value: 'staff.assign', label: 'Assign' },
      { value: 'staff.revoke', label: 'Revoke' },
    ],
  },
  {
    label: 'Announcements',
    permissions: [
      { value: 'announcements.view', label: 'View' },
      { value: 'announcements.create', label: 'Create' },
      { value: 'announcements.edit', label: 'Edit' },
      { value: 'announcements.delete', label: 'Delete' },
    ],
  },
  {
    label: 'Gallery',
    permissions: [
      { value: 'gallery.view', label: 'View' },
      { value: 'gallery.manage', label: 'Manage' },
    ],
  },
  { label: 'Members', permissions: [{ value: 'members.view', label: 'View member directory' }] },
  {
    label: 'Payments',
    permissions: [
      { value: 'payments.view', label: 'View' },
      { value: 'payments.refund', label: 'Refund' },
    ],
  },
];

export function PermissionPicker({
  value,
  onChange,
  allowed,
}: {
  value: AdminPermission[];
  onChange: (permissions: AdminPermission[]) => void;
  allowed?: readonly AdminPermission[];
}) {
  const allowedSet = new Set(
    allowed ?? PERMISSION_GROUPS.flatMap((group) => group.permissions.map((item) => item.value)),
  );
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {PERMISSION_GROUPS.map((group) => {
        const items = group.permissions.filter((permission) => allowedSet.has(permission.value));
        if (!items.length) return null;
        return (
          <fieldset key={group.label} className="rounded-xl border border-warmGray400/15 p-4">
            <legend className="px-1 text-sm font-semibold text-deepBlue">{group.label}</legend>
            <div className="space-y-2">
              {items.map((permission) => (
                <label
                  key={permission.value}
                  className="flex min-h-11 items-center gap-3 text-sm text-deepBlue"
                >
                  <input
                    type="checkbox"
                    checked={value.includes(permission.value)}
                    onChange={(event) =>
                      onChange(
                        event.target.checked
                          ? [...value, permission.value]
                          : value.filter((item) => item !== permission.value),
                      )
                    }
                  />
                  {permission.label}
                </label>
              ))}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}

function RoleForm({ role, onDone }: { role?: AdminRoleDefinition; onDone: () => void }) {
  const { createRole, updateRole } = useAdminRoleMutations();
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [permissions, setPermissions] = useState<AdminPermission[]>(
    role?.permissions ?? ['dashboard.view'],
  );
  const [error, setError] = useState<string | null>(null);
  const [confirmSave, setConfirmSave] = useState(false);
  const busy = createRole.isPending || updateRole.isPending;

  const save = async () => {
    setConfirmSave(false);
    setError(null);
    try {
      if (role) {
        await updateRole.mutateAsync({
          roleId: role.id,
          name: name.trim(),
          description: description.trim(),
          permissions,
        });
      } else {
        await createRole.mutateAsync({
          name: name.trim(),
          description: description.trim(),
          permissions,
        });
      }
      onDone();
    } catch {
      setError("Couldn't save this role. Try again.");
    }
  };

  const prepareSave = () => {
    if (!name.trim() || (!role?.system && permissions.length === 0)) {
      setError(
        role?.system
          ? 'Enter a role name.'
          : 'Enter a role name and select at least one permission.',
      );
      return;
    }
    setError(null);
    if (role?.system) setConfirmSave(true);
    else void save();
  };

  return (
    <Card className="mb-6">
      <h2 className="mb-4 text-lg font-semibold text-deepBlue">
        {role ? 'Edit organization role' : 'Create organization role'}
      </h2>
      {error ? <ErrorBanner message={error} /> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Role name">
          <Input value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Description (optional)">
          <Textarea
            rows={2}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>
      </div>
      {role?.system ? (
        <p className="mt-5 rounded-xl border border-accent/25 bg-accentSoft p-4 text-sm leading-6 text-ink">
          Super Admin always has full access. This editable list describes the role but never limits
          what a Super Admin can do.
        </p>
      ) : null}
      <div className="mt-5">
        <PermissionPicker value={permissions} onChange={setPermissions} />
      </div>
      {role?.system ? (
        <div className="mt-5 rounded-xl border border-border bg-surfaceMuted/50 p-4">
          <h3 className="font-semibold text-ink">Who has Super Admin access?</h3>
          <p className="mt-1 text-sm leading-6 text-muted">
            Add or revoke another member&apos;s Super Admin access from the Members page.
          </p>
          <Link
            href="/members"
            className="mt-3 inline-block text-sm font-semibold text-brand underline"
          >
            Manage Super Admins
          </Link>
        </div>
      ) : null}
      <div className="mt-5 flex gap-3">
        <Button onClick={prepareSave} loading={busy}>
          Save role
        </Button>
        <Button variant="secondary" onClick={onDone} disabled={busy}>
          Cancel
        </Button>
      </div>
      <ConfirmDialog
        open={confirmSave}
        title="Save Super Admin role changes?"
        description="The name, description, and displayed permission list will change. Every Super Admin will still have full access, including permissions you unchecked."
        confirmLabel="Confirm changes"
        loading={busy}
        onConfirm={() => void save()}
        onCancel={() => setConfirmSave(false)}
      />
    </Card>
  );
}

export function RoleListEditor() {
  const rolesQuery = useAdminRoles();
  const { seedDefaults, deleteRole } = useAdminRoleMutations();
  const [editing, setEditing] = useState<AdminRoleDefinition | 'new' | null>(null);
  const [deleting, setDeleting] = useState<AdminRoleDefinition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeRoles = (rolesQuery.data ?? []).filter((role) => role.active && !role.deletedAt);

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteRole.mutateAsync(deleting.id);
      setDeleting(null);
    } catch {
      setError("Couldn't delete this role.");
    }
  };

  if (rolesQuery.isLoading) return <Spinner label="Loading organization roles…" />;
  return (
    <div>
      {rolesQuery.isError || error ? (
        <ErrorBanner
          message={error ?? "Couldn't load organization roles."}
          onRetry={() => void rolesQuery.refetch()}
        />
      ) : null}
      <div className="mb-5 flex flex-wrap gap-3">
        <Button onClick={() => setEditing('new')}>Create role</Button>
        {activeRoles.length === 0 ? (
          <Button
            variant="secondary"
            loading={seedDefaults.isPending}
            onClick={() => seedDefaults.mutate()}
          >
            Add temporary defaults
          </Button>
        ) : null}
      </div>
      {editing ? (
        <RoleForm
          key={editing === 'new' ? 'new' : editing.id}
          role={editing === 'new' ? undefined : editing}
          onDone={() => setEditing(null)}
        />
      ) : null}
      {activeRoles.length === 0 ? (
        <EmptyState message="No organization roles have been created yet." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {activeRoles.map((role) => (
            <Card key={role.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-deepBlue">{role.name}</h2>
                  <p className="mt-1 text-sm text-warmGray400">
                    {role.description || 'No description'}
                  </p>
                </div>
                {role.system ? (
                  <span className="text-sm font-semibold text-accentStrong">Protected</span>
                ) : null}
              </div>
              <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-warmGray400">
                {role.system
                  ? `Full access · ${role.permissions.length} listed permissions`
                  : `${role.permissions.length} permissions`}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => setEditing(role)}>
                  Edit
                </Button>
                <Link
                  href="/members"
                  className="inline-flex min-h-12 items-center rounded-[14px] border border-brand/45 px-4 py-2 text-sm font-semibold text-brand hover:bg-brandSoft"
                >
                  Manage access
                </Link>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={role.system}
                  onClick={() => setDeleting(role)}
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete organization role?"
        description={
          <>
            Deleting <strong>{deleting?.name}</strong> immediately removes admin access from every
            member assigned to it. The role is retained only in the audit history.
          </>
        }
        confirmLabel="Delete and revoke access"
        tone="danger"
        loading={deleteRole.isPending}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
