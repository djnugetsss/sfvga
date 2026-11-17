import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Timestamp } from 'firebase/firestore';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import type {
  EventAdminRoleAssignInput,
  EventAdminRoleCreateInput,
  EventAdminRoleUpdateInput,
} from '@sfvga/shared-validation';
import type { EventAdminRoleDefinition, EventAdminRoleGrant } from '@sfvga/shared-types';
import { functionsClient } from '@/services/functionsClient';
import { getFirebaseAuth, getFirestoreDb } from '@/services/firebase';

export interface EventRolesResult {
  roles: EventAdminRoleDefinition[];
  grants: EventAdminRoleGrant[];
}

export async function fetchEventAdminRoles(eventId: string): Promise<EventRolesResult> {
  const db = getFirestoreDb();
  const [roles, grants] = await Promise.all([
    getDocs(query(collection(db, 'events', eventId, 'roleDefinitions'), orderBy('name'))),
    getDocs(collection(db, 'events', eventId, 'roles')),
  ]);
  return {
    roles: roles.docs.map(
      (entry) => ({ ...entry.data(), id: entry.id, eventId }) as EventAdminRoleDefinition,
    ),
    grants: grants.docs.map(
      (entry) => ({ ...entry.data(), id: entry.id, eventId }) as EventAdminRoleGrant,
    ),
  };
}

export function useEventAdminRoles(eventId: string) {
  return useQuery({
    queryKey: ['admin', 'eventRoles', eventId],
    enabled: Boolean(eventId),
    staleTime: 5 * 60_000,
    queryFn: () => fetchEventAdminRoles(eventId),
  });
}

export function useEventAdminRoleMutations(eventId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['admin', 'eventRoles', eventId] as const;
  const refresh = () => void queryClient.invalidateQueries({ queryKey });
  return {
    createRole: useMutation({
      mutationFn: (input: EventAdminRoleCreateInput) => functionsClient.eventRoles.create(input),
      onSuccess: refresh,
    }),
    ensureTicketScanner: useMutation({
      mutationFn: () => functionsClient.eventRoles.ensureTicketScanner(eventId),
      onSuccess: refresh,
    }),
    updateRole: useMutation({
      mutationFn: (input: EventAdminRoleUpdateInput) => functionsClient.eventRoles.update(input),
      onSuccess: refresh,
    }),
    deleteRole: useMutation({
      mutationFn: (roleId: string) => functionsClient.eventRoles.delete(eventId, roleId),
      onSuccess: refresh,
    }),
    assignRole: useMutation({
      mutationFn: (input: EventAdminRoleAssignInput) => functionsClient.eventRoles.assign(input),
      onSuccess: ({ grantId }, input) => {
        queryClient.setQueryData<EventRolesResult>(queryKey, (current) =>
          current
            ? {
                ...current,
                grants: [
                  ...current.grants.filter((grant) => grant.userId !== input.targetUid),
                  {
                    id: grantId,
                    eventId,
                    userId: input.targetUid,
                    roleDefinitionId: input.roleId,
                    activatesAt: Timestamp.fromDate(new Date(input.activatesAt)),
                    expiresAt: Timestamp.fromDate(new Date(input.expiresAt)),
                    grantedBy: getFirebaseAuth().currentUser?.uid ?? '',
                    createdAt: Timestamp.now(),
                  },
                ],
              }
            : current,
        );
        refresh();
      },
    }),
    revokeRole: useMutation({
      mutationFn: (grantId: string) => functionsClient.eventRoles.revoke(eventId, grantId),
      onSuccess: (_result, grantId) => {
        queryClient.setQueryData<EventRolesResult>(queryKey, (current) =>
          current
            ? { ...current, grants: current.grants.filter((grant) => grant.id !== grantId) }
            : current,
        );
        refresh();
      },
    }),
  };
}
