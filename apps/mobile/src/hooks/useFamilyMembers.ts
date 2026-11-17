import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import type { FamilyMember } from '@sfvga/shared-types';
import { getFirestoreDb } from '@/services/firebase';
import { useAuthContext } from '@/providers/AuthProvider';

/**
 * The current member's family members (users/{uid}/familyMembers subcollection,
 * tech design §3). Real-time via an onSnapshot listener that invalidates the cache.
 */
export function useFamilyMembers() {
  const { firebaseUser } = useAuthContext();
  const uid = firebaseUser?.uid;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!uid) return;
    const db = getFirestoreDb();
    const unsub = onSnapshot(
      collection(db, 'users', uid, 'familyMembers'),
      () => queryClient.invalidateQueries({ queryKey: ['familyMembers', uid] }),
      () => {
        /* keep last cached data on listener error */
      },
    );
    return unsub;
  }, [uid, queryClient]);

  return useQuery({
    queryKey: ['familyMembers', uid],
    enabled: !!uid,
    queryFn: async () => {
      if (!uid) return [];
      const db = getFirestoreDb();
      const snap = await getDocs(collection(db, 'users', uid, 'familyMembers'));
      return snap.docs
        .map((d) => ({ ...(d.data() as FamilyMember), id: d.id }))
        .sort((a, b) => a.name.localeCompare(b.name));
    },
  });
}
