import type { FirestoreTimestamp } from './user';

export interface Feedback {
  id: string;
  eventId: string;
  userId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  createdAt: FirestoreTimestamp;
}
