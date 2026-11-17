/** Firestore Timestamp — use firebase/firestore Timestamp at runtime; this is the serializable shape. */
export interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
}

export type UserRole = 'member' | 'admin';
export type AdminLevel = 'super' | 'org' | 'finance' | 'content';

export interface User {
  uid: string;
  displayName: string;
  phone: string;
  email?: string;
  photoUrl?: string;
  role: UserRole;
  adminLevel?: AdminLevel;
  membership: {
    id: string;
    status: 'active' | 'expired';
    expiresAt: FirestoreTimestamp;
  };
  notificationPrefs: {
    announcements: boolean;
    eventReminders: boolean;
    pushEnabled?: boolean;
  };
  /** Cross-platform Expo push tokens; Expo routes through FCM on Android and APNs on iOS. */
  expoPushTokens?: string[];
  /** Legacy native FCM tokens retained during migration. */
  fcmTokens?: string[];
  /** Captured once when a new member finishes account setup. Older accounts may not have this. */
  legalAcceptance?: {
    termsVersion: string;
    privacyVersion: string;
    acceptedAt: FirestoreTimestamp;
  };
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export type FamilyRelation = 'spouse' | 'child' | 'parent' | 'guest';
export type AgeGroup = 'adult' | 'child' | 'senior';

export interface FamilyMember {
  id: string;
  name: string;
  relation: FamilyRelation;
  /** Kept for ticket/registration compat; derived from ageYears when saving from the app. */
  ageGroup: AgeGroup;
  /** Approximate age in years — used for per-event child pricing rules. */
  ageYears?: number;
  dietaryNotes?: string;
}
