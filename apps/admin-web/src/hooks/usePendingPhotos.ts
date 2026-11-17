import { useQuery } from '@tanstack/react-query';

export function usePendingPhotos() {
  return useQuery({
    queryKey: ['admin', 'pendingPhotos'],
    queryFn: async () => [],
  });
}
