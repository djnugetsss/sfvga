import { signOut } from 'firebase/auth';
import { getFirebaseAuth } from './firebase';

export async function signOutAdmin(): Promise<void> {
  await signOut(getFirebaseAuth());
}
