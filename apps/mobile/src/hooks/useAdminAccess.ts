import { useQuery } from '@tanstack/react-query';
import { useAuthContext } from '@/providers/AuthProvider';
import { functionsClient } from '@/services/functionsClient';

export function useAdminAccess() {
  const { firebaseUser } = useAuthContext();
  return useQuery({
    queryKey: ['adminAccess', firebaseUser?.uid],
    enabled: Boolean(firebaseUser?.uid),
    queryFn: () => functionsClient.auth.getAdminAccess(),
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: 1,
  });
}
