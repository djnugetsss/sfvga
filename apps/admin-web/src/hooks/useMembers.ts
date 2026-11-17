import { useQuery } from '@tanstack/react-query';
import { functionsClient, type AdminMemberSummary } from '@/services/functionsClient';

export type Member = AdminMemberSummary;

/** The full member/user directory, sorted by display name. Admin-only read. */
export function useMembers(eventId?: string, enabled = true) {
  return useQuery({
    queryKey: ['admin', 'members', eventId ?? 'organization'],
    queryFn: () => functionsClient.members.list(eventId),
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useMemberCount(enabled = true) {
  return useQuery({
    queryKey: ['admin', 'memberCount'],
    queryFn: () => functionsClient.members.count(),
    enabled,
    staleTime: 5 * 60_000,
  });
}
