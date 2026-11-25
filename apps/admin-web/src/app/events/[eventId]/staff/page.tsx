'use client';
import { EventNavigation } from '@/components/events/EventNavigation';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  AdminPermission,
  EventAdminPermission,
  EventAdminRoleDefinition,
} from '@sfvga/shared-types';
import { EVENT_ADMIN_PERMISSIONS } from '@sfvga/shared-types';
import type { EventAdminRoleCreateInput } from '@sfvga/shared-validation';
import { useEvent } from '@/hooks/useEvent';
import { useMembers } from '@/hooks/useMembers';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useEventAdminRoles, useEventAdminRoleMutations } from '@/hooks/useEventAdminRoles';
import { hasEventPermission, hasOrganizationPermission } from '@/lib/permissions';
import { PermissionPicker } from '@/components/roles/RoleListEditor';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  PageHeader,
  Card,
  Badge,
  Spinner,
  EmptyState,
  ErrorBanner,
  Field,
  Input,
  Select,
  Textarea,
} from '@/components/ui/primitives';
import { Button } from '@/components/ui/Button';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { toDate, toDateTimeLocalValue, formatDateTime } from '@/lib/formatters';

const TWO_HOURS = 2 * 60 * 60 * 1000;

function EventRoleForm({
  eventId,
  role,
  onDone,
}: {
  eventId: string;
  role?: EventAdminRoleDefinition;
  onDone: () => void;
}) {
  const mutations = useEventAdminRoleMutations(eventId);
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [permissions, setPermissions] = useState<AdminPermission[]>(
    role?.permissions ?? ['dashboard.view', 'events.view'],
  );
  const [error, setError] = useState<string | null>(null);
  const busy = mutations.createRole.isPending || mutations.updateRole.isPending;

  const save = async () => {
    if (!name.trim() || permissions.length === 0)
      return setError('Enter a role name and select at least one permission.');
    try {
      const eventPermissions = permissions.filter(
        (permission): permission is EventAdminPermission =>
          EVENT_ADMIN_PERMISSIONS.some((allowed) => allowed === permission),
      );
      const values: EventAdminRoleCreateInput = {
        eventId,
        name: name.trim(),
        permissions: eventPermissions,
        ...(description.trim() ? { description: description.trim() } : {}),
      };
      if (role) await mutations.updateRole.mutateAsync({ ...values, roleId: role.id });
      else await mutations.createRole.mutateAsync(values);
      onDone();
    } catch {
      setError("Couldn't save this event role.");
    }
  };

  return (
    <Card className="mb-6">
      <h2 className="mb-4 text-lg font-semibold text-deepBlue">
        {role ? 'Edit event role' : 'Create event role'}
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
      <div className="mt-5">
        <PermissionPicker
          value={permissions}
          onChange={setPermissions}
          allowed={EVENT_ADMIN_PERMISSIONS}
        />
      </div>
      <div className="mt-5 flex gap-3">
        <Button loading={busy} onClick={() => void save()}>
          Save role
        </Button>
        <Button variant="secondary" disabled={busy} onClick={onDone}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}

export default function EventStaffPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { access, firebaseUser } = useAdminAuth();
  const { data: event } = useEvent(eventId);
  const membersQuery = useMembers(eventId);
  const rolesQuery = useEventAdminRoles(eventId);
  const mutations = useEventAdminRoleMutations(eventId);
  const [editing, setEditing] = useState<EventAdminRoleDefinition | 'new' | null>(null);
  const [deleting, setDeleting] = useState<EventAdminRoleDefinition | null>(null);
  const [selectedUid, setSelectedUid] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [activatesAt, setActivatesAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const defaultRoleRequested = useRef(false);

  const isEventCreator = event?.createdBy === firebaseUser?.uid;
  const canView = isEventCreator || hasEventPermission(access, eventId, 'staff.view');
  const canAssign = isEventCreator || hasEventPermission(access, eventId, 'staff.assign');
  const canRevoke = isEventCreator || hasEventPermission(access, eventId, 'staff.revoke');
  const canManageDefinitions = hasOrganizationPermission(access, 'staff.assign') || isEventCreator;
  const roles = (rolesQuery.data?.roles ?? []).filter((role) => role.active && !role.deletedAt);
  const ownEventPermissions =
    access?.eventAccess.find((entry) => entry.eventId === eventId)?.permissions ?? [];
  const assignableRoles = canManageDefinitions
    ? roles
    : roles.filter((role) =>
        role.permissions.every((permission) => ownEventPermissions.includes(permission)),
      );
  const grants = (rolesQuery.data?.grants ?? []).filter((grant) => !grant.revokedAt);
  const members = membersQuery.data ?? [];
  const memberOptions = useMemo(
    () =>
      (membersQuery.data ?? []).map((member) => ({
        value: member.uid,
        label: member.displayName,
        description: member.phone,
        searchText: member.email,
      })),
    [membersQuery.data],
  );
  const hasTicketScannerRole = roles.some(
    (role) =>
      role.name.trim().toLocaleLowerCase() === 'ticket scanner' &&
      role.permissions.length === 1 &&
      role.permissions[0] === 'tickets.scan',
  );

  useEffect(() => {
    if (
      !canManageDefinitions ||
      rolesQuery.isLoading ||
      rolesQuery.isError ||
      hasTicketScannerRole ||
      defaultRoleRequested.current
    )
      return;
    defaultRoleRequested.current = true;
    mutations.ensureTicketScanner.mutate(undefined, {
      onError: () => setError("Couldn't add the default Ticket Scanner role."),
    });
  }, [
    canManageDefinitions,
    hasTicketScannerRole,
    mutations.ensureTicketScanner,
    rolesQuery.isError,
    rolesQuery.isLoading,
  ]);

  const ensureDefaults = () => {
    if (activatesAt || expiresAt || !event) return;
    const start = toDate(event.startAt);
    const end = toDate(event.endAt);
    if (start) setActivatesAt(toDateTimeLocalValue(new Date(start.getTime() - TWO_HOURS)));
    if (end) setExpiresAt(toDateTimeLocalValue(new Date(end.getTime() + TWO_HOURS)));
  };

  if (!canView)
    return <ErrorBanner message="You don't have permission to manage staff for this event." />;
  const assign = async () => {
    if (
      !selectedUid ||
      !selectedRoleId ||
      !activatesAt ||
      !expiresAt ||
      new Date(expiresAt) <= new Date(activatesAt)
    ) {
      setError('Choose a member, role, and a valid activation window.');
      return;
    }
    try {
      await mutations.assignRole.mutateAsync({
        eventId,
        targetUid: selectedUid,
        roleId: selectedRoleId,
        activatesAt: new Date(activatesAt).toISOString(),
        expiresAt: new Date(expiresAt).toISOString(),
      });
      setSelectedUid('');
      setSelectedRoleId('');
      setError(null);
    } catch {
      setError("Couldn't assign this role.");
    }
  };

  const deleteDefinition = async () => {
    if (!deleting) return;
    try {
      await mutations.deleteRole.mutateAsync(deleting.id);
      setDeleting(null);
    } catch {
      setError("Couldn't delete this role.");
    }
  };

  return (
    <>
      <PageHeader
        title="Event Roles"
        description={event?.title ?? 'Loading event…'}
        actions={
          <Link href={`/events/${eventId}`} className="text-sm font-medium text-accentStrong">
            Back to event
          </Link>
        }
      />
      <EventNavigation eventId={eventId} />
      {error || rolesQuery.isError ? (
        <ErrorBanner
          message={error ?? "Couldn't load event roles."}
          onRetry={() => void rolesQuery.refetch()}
        />
      ) : null}
      {canManageDefinitions ? (
        <div className="mb-5">
          <Button onClick={() => setEditing('new')}>Create event role</Button>
        </div>
      ) : null}
      {editing ? (
        <EventRoleForm
          eventId={eventId}
          role={editing === 'new' ? undefined : editing}
          onDone={() => setEditing(null)}
        />
      ) : null}
      {rolesQuery.isLoading ||
      (roles.length === 0 && (rolesQuery.isFetching || mutations.ensureTicketScanner.isPending)) ? (
        <Spinner label="Loading event roles…" />
      ) : (
        <Card className="mb-6">
          <h2 className="mb-4 font-semibold text-deepBlue">Role definitions</h2>
          {roles.length === 0 ? (
            <EmptyState message="No event roles have been created yet." />
          ) : (
            <div className="divide-y divide-warmGray400/15">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div>
                    <p className="font-medium text-deepBlue">{role.name}</p>
                    <p className="text-sm text-warmGray400">
                      {role.permissions.length} event permissions
                    </p>
                  </div>
                  {canManageDefinitions ? (
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setEditing(role)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => setDeleting(role)}>
                        Delete
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {canAssign ? (
        <Card className="mb-6">
          <h2 className="mb-4 font-semibold text-deepBlue">Assign event access</h2>
          <div className="grid gap-4 md:grid-cols-2" onFocus={ensureDefaults}>
            <SearchableSelect
              label="Member"
              value={selectedUid}
              options={memberOptions}
              onChange={setSelectedUid}
              placeholder={membersQuery.isLoading ? 'Loading members…' : 'Select a member…'}
              searchPlaceholder="Search members by name or phone…"
              emptyMessage="No members match that search."
              disabled={membersQuery.isLoading}
            />
            <Field label="Event role">
              <Select
                value={selectedRoleId}
                onChange={(event) => setSelectedRoleId(event.target.value)}
                disabled={rolesQuery.isLoading || mutations.ensureTicketScanner.isPending}
              >
                <option value="">
                  {rolesQuery.isLoading || mutations.ensureTicketScanner.isPending
                    ? 'Loading roles…'
                    : 'Select a role…'}
                </option>
                {assignableRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Access begins">
              <Input
                type="datetime-local"
                value={activatesAt}
                onChange={(event) => setActivatesAt(event.target.value)}
              />
            </Field>
            <Field label="Access expires">
              <Input
                type="datetime-local"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
              />
            </Field>
          </div>
          <div className="mt-4">
            <Button
              loading={mutations.assignRole.isPending}
              onClick={() => void assign()}
              disabled={membersQuery.isLoading || assignableRoles.length === 0}
            >
              Assign role
            </Button>
          </div>
        </Card>
      ) : null}

      <Card>
        <h2 className="mb-4 font-semibold text-deepBlue">Assigned event admins and staff</h2>
        {grants.length === 0 ? (
          <EmptyState message="No active or scheduled event-role assignments." />
        ) : (
          <div className="divide-y divide-warmGray400/15">
            {grants.map((grant) => {
              const member = members.find((item) => item.uid === grant.userId);
              const role = rolesQuery.data?.roles.find(
                (item) => item.id === grant.roleDefinitionId,
              );
              const start = toDate(grant.activatesAt);
              const end = toDate(grant.expiresAt);
              const now = Date.now();
              const active = Boolean(
                start && end && start.getTime() <= now && end.getTime() >= now,
              );
              return (
                <div
                  key={grant.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div>
                    <p className="font-medium text-deepBlue">
                      {member?.displayName ?? grant.userId}{' '}
                      <span className="font-normal text-warmGray400">
                        — {role?.name ?? 'Deleted role'}
                      </span>
                    </p>
                    <p className="text-sm text-warmGray400">
                      {start && end
                        ? `${formatDateTime(start)} – ${formatDateTime(end)}`
                        : 'Assignment dates unavailable. Reassign this role to set a schedule.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone={active ? 'success' : 'neutral'}>
                      {!start || !end
                        ? 'Schedule missing'
                        : active
                          ? 'Active'
                          : end.getTime() < now
                            ? 'Ended'
                            : 'Scheduled'}
                    </Badge>
                    {canRevoke ? (
                      <Button
                        size="sm"
                        variant="danger"
                        loading={mutations.revokeRole.isPending}
                        onClick={() => mutations.revokeRole.mutate(grant.id)}
                      >
                        Revoke
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete event role?"
        description={
          <>
            Deleting <strong>{deleting?.name}</strong> immediately revokes every assignment using it
            for this event.
          </>
        }
        confirmLabel="Delete and revoke access"
        tone="danger"
        loading={mutations.deleteRole.isPending}
        onConfirm={() => void deleteDefinition()}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
