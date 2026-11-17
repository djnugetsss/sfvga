import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { getFirestoreDb } from '@/services/firebase';

/** Event ids that still exist in Firestore (parent doc not deleted). */
export async function fetchExistingEventIdSet(eventIds?: string[]): Promise<Set<string>> {
  const ids = eventIds ? [...new Set(eventIds.filter(Boolean))] : undefined;
  if (ids && ids.length <= 8) {
    const db = getFirestoreDb();
    const snapshots = await Promise.all(ids.map((id) => getDoc(doc(db, 'events', id))));
    return new Set(
      snapshots.filter((snapshot) => snapshot.exists()).map((snapshot) => snapshot.id),
    );
  }
  const snap = await getDocs(collection(getFirestoreDb(), 'events'));
  return new Set(snap.docs.map((d) => d.id));
}

export function filterByExistingEvents<T extends { eventId: string }>(
  items: T[],
  existingEventIds: Set<string>,
): T[] {
  return items.filter((item) => item.eventId && existingEventIds.has(item.eventId));
}
