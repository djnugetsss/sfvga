import type { AgeGroup, FirestoreTimestamp } from './user';

export type PaymentStatus = 'unpaid' | 'paid' | 'free';
export type TicketStatus = 'valid' | 'redeemed' | 'revoked';

export interface RegistrationAttendee {
  familyMemberId: string | 'self';
  name: string;
  ageGroup: AgeGroup;
  /** Age in years — required for child-rule pricing when the event defines one. */
  ageYears?: number;
  /** True for non-member guests (and family relation "guest"); false for household. */
  isGuest?: boolean;
}

export interface Registration {
  id: string;
  userId: string;
  workflowVersion?: 1;
  /** Historical record only: the account was deleted and its tickets are ineligible. */
  accountDeleted?: boolean;
  signupStatus?: 'started' | 'submitted' | 'expired';
  reviewStatus?: 'pending' | 'approved' | 'rejected';
  reviewRevision?: number;
  accountPhone?: string;
  payerName?: string;
  paymentNote?: string;
  submittedAt?: FirestoreTimestamp;
  resubmittedAt?: FirestoreTimestamp;
  reviewedAt?: FirestoreTimestamp;
  reviewedBy?: string;
  correctionExpiresAt?: FirestoreTimestamp;
  memberUnread?: boolean;
  adminUnread?: boolean;
  lastMessageId?: string;
  lastMessageAt?: FirestoreTimestamp;
  ticketsReadyRevision?: number;
  /** Incremented when an approved payment is disputed; older QR generations never reactivate. */
  ticketGeneration?: number;
  attendees: RegistrationAttendee[];
  paymentStatus: PaymentStatus;
  totalAmount: number;
  paymentIntentId?: string;
  /** Set by notifications_eventReminder after the day-before push is sent. */
  eventReminderSent?: boolean;
  /** Set when the registration confirmation push has been delivered. */
  confirmationPushSent?: boolean;
  /** Set when the PDF ticket confirmation email has been sent or intentionally skipped. */
  confirmationEmailSent?: boolean;
  createdAt: FirestoreTimestamp;
}

export interface Ticket {
  id: string;
  /** Denormalized for collection-group check-in counts (scanner UI). */
  eventId?: string;
  /** Denormalized so ticket wallets keep a title if the event doc is deleted. */
  eventTitle?: string;
  eventStartAt?: FirestoreTimestamp;
  attendeeName: string;
  ageGroup: AgeGroup;
  qrPayloadEncrypted: string;
  /** Missing on previously issued tickets, which belong to generation zero. */
  generation?: number;
  status: TicketStatus;
  redeemedAt?: FirestoreTimestamp;
  redeemedBy?: string;
}

export interface RegistrationMessage {
  id: string;
  body: string;
  senderId: string;
  senderRole: 'member' | 'organizer' | 'system';
  createdAt: FirestoreTimestamp;
}

export interface MemberNotification {
  id: string;
  title: string;
  body: string;
  eventId: string;
  registrationId?: string;
  eventTitle?: string;
  type:
    | 'payment'
    | 'registration_message'
    | 'registration_confirmed'
    | 'admin_registration_message'
    | 'event_published';
  createdAt: FirestoreTimestamp;
}

/** Operational inbox, separate from member announcements and ticket notices. */
export interface AdminRegistrationNotification {
  id: string;
  type:
    'admin_registration_message' | 'admin_registration_attention' | 'admin_photo_album_reminder';
  title: string;
  body: string;
  eventId: string;
  eventTitle: string;
  registrationId?: string;
  createdAt: FirestoreTimestamp;
  readAt?: FirestoreTimestamp;
  dismissedAt?: FirestoreTimestamp;
}

export function ticketsEligible(
  registration: Pick<
    Registration,
    'workflowVersion' | 'signupStatus' | 'reviewStatus' | 'totalAmount' | 'accountDeleted'
  >,
): boolean {
  return (
    !registration.accountDeleted &&
    (registration.workflowVersion !== 1 ||
      (registration.signupStatus === 'submitted' &&
        (registration.totalAmount === 0 || registration.reviewStatus === 'approved')))
  );
}
