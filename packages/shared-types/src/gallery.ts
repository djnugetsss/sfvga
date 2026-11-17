import type { FirestoreTimestamp } from './user';

export interface GalleryAlbum {
  id: string;
  eventId: string;
  title: string;
  coverPhotoUrl?: string;
}

export type GalleryPhotoStatus = 'pending' | 'approved' | 'rejected';

export interface GalleryPhoto {
  id: string;
  uploadedBy: string;
  url: string;
  status: GalleryPhotoStatus;
  createdAt: FirestoreTimestamp;
}
