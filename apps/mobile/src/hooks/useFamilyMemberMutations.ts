import { useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, deleteDoc, deleteField, doc, setDoc, updateDoc } from 'firebase/firestore';
import type { FamilyMember } from '@sfvga/shared-types';
import { getFirestoreDb } from '@/services/firebase';
import { useAuthContext } from '@/providers/AuthProvider';

/** Family member fields the member can set (id is assigned by Firestore). */
export type FamilyMemberInput = Omit<FamilyMember, 'id'>;

/**
 * Create/update/delete the current member's family members. These are owner-writable directly
 * (Firestore rules §familyMembers) and treated as locally-owned data, so no Cloud Function is
 * needed. The useFamilyMembers onSnapshot listener refreshes the list automatically; we also
 * invalidate on success so the UI updates immediately.
 */
export function useFamilyMemberMutations() {
  const { firebaseUser } = useAuthContext();
  const uid = firebaseUser?.uid;
  const queryClient = useQueryClient();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['familyMembers', uid] });

  const familyCollection = () => {
    if (!uid) throw new Error('You must be signed in to manage family members.');
    return collection(getFirestoreDb(), 'users', uid, 'familyMembers');
  };

  const addMember = useMutation({
    mutationFn: async (input: FamilyMemberInput) => {
      const ref = doc(familyCollection());
      await setDoc(ref, { ...input, id: ref.id });
      return ref.id;
    },
    onSuccess: invalidate,
  });

  const updateMember = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: FamilyMemberInput }) => {
      await updateDoc(doc(familyCollection(), id), {
        ...input,
        ageYears: input.ageYears === undefined ? deleteField() : input.ageYears,
      });
    },
    onSuccess: invalidate,
  });

  const removeMember = useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(familyCollection(), id));
    },
    onSuccess: invalidate,
  });

  return { addMember, updateMember, removeMember };
}
