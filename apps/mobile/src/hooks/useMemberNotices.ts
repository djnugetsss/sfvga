import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import type { MemberNotification } from '@sfvga/shared-types';
import { getFirestoreDb } from '@/services/firebase';

export function useMemberNotices(uid?: string) {
  const client = useQueryClient();
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      collection(getFirestoreDb(), 'users', uid, 'notifications'),
      () => void client.invalidateQueries({ queryKey: ['memberNotices', uid] }),
      () => {},
    );
  }, [uid, client]);
  return useQuery({
    queryKey: ['memberNotices', uid],
    enabled: Boolean(uid),
    queryFn: async () => {
      const snap = await getDocs(collection(getFirestoreDb(), 'users', uid!, 'notifications'));
      return snap.docs.map((d) => ({ ...d.data(), id: d.id }) as MemberNotification);
    },
  });
}
