import type { FirestoreTimestamp } from './user';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  eventId?: string;
  createdBy: string;
  createdAt: FirestoreTimestamp;
}

export interface LibraryDocument {
  id: string;
  title: string;
  fileUrl: string;
  uploadedBy: string;
  createdAt: FirestoreTimestamp;
}
