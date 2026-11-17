import type { FirestoreTimestamp } from './user';

export type EventStatus = 'draft' | 'published' | 'ended';

export interface Event {
  id: string;
  title: string;
  description: string;
  paymentUrl?: string;
  /** Card / detail header image (thumbnail). */
  bannerUrl?: string;
  /** Full event flyer (image or PDF) for members to open from Event Detail. */
  flyerUrl?: string;
  /**
   * External photo album after the event (Google Photos, OneDrive, etc.).
   * Members open this from Event Detail; setting it notifies registrants.
   */
  photoAlbumUrl?: string;
  startAt: FirestoreTimestamp;
  endAt: FirestoreTimestamp;
  location: {
    name: string;
    address: string;
    lat: number;
    lng: number;
  };
  parkingNote?: string;
  whatToBring?: string;
  schedule?: string;
  faqs: { question: string; answer: string }[];
  capacity?: number;
  registrationDeadline?: FirestoreTimestamp;
  pricing: {
    member: number;
    guest: number;
    childRule?: {
      /** Inclusive: 5 means "ages 5 and under"; use 4 for "under 5". */
      maxAgeInclusive: number;
      price: number;
    };
  };
  status: EventStatus;
  duplicatedFromEventId?: string;
  createdBy: string;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}
