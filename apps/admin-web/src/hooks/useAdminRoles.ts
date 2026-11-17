import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminRoleCreateInput, AdminRoleUpdateInput } from '@sfvga/shared-validation';
import type { AdminRoleDefinition } from '@sfvga/shared-types';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { functionsClient } from '@/services/functionsClient';
import { getFirestoreDb } from '@/services/firebase';

const queryKey = ['admin', 'organizationRoles'] as const;

export async function fetchAdminRoles(): Promise<AdminRoleDefinition[]> {
  const snap = await getDocs(
    query(collection(getFirestoreDb(), 'adminRoleDefinitions'), orderBy('name')),
  );
  return snap.docs.map((entry) => ({ ...entry.data(), id: entry.id }) as AdminRoleDefinition);
}

export function useAdminRoles() {
  return useQuery({ queryKey, queryFn: fetchAdminRoles, staleTime: 5 * 60_000 });
}

export function useAdminRoleMutations() {
  const queryClient = useQueryClient();
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey });
    void queryClient.invalidateQueries({ queryKey: ['admin', 'members'] });
  };

  return {
    seedDefaults: useMutation({
      mutationFn: functionsClient.adminRoles.seedDefaults,
      onSuccess: refresh,
    }),
    createRole: useMutation({
      mutationFn: (input: AdminRoleCreateInput) => functionsClient.adminRoles.create(input),
      onSuccess: ({ roleId }, input) => {
        queryClient.setQueryData<AdminRoleDefinition[]>(queryKey, (current) =>
          current
            ? [
                ...current,
                { ...input, id: roleId, active: true, system: false } as AdminRoleDefinition,
              ].sort((a, b) => a.name.localeCompare(b.name))
            : current,
        );
        refresh();
      },
    }),
    updateRole: useMutation({
      mutationFn: (input: AdminRoleUpdateInput) => functionsClient.adminRoles.update(input),
      onSuccess: (_result, input) => {
        const { roleId, ...patch } = input;
        queryClient.setQueryData<AdminRoleDefinition[]>(queryKey, (current) =>
          current
            ?.map((role) => (role.id === roleId ? { ...role, ...patch } : role))
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
        refresh();
      },
    }),
    deleteRole: useMutation({
      mutationFn: (roleId: string) => functionsClient.adminRoles.delete(roleId),
      onSuccess: (_result, roleId) => {
        queryClient.setQueryData<AdminRoleDefinition[]>(queryKey, (current) =>
          current?.filter((role) => role.id !== roleId),
        );
        refresh();
      },
    }),
  };
}
