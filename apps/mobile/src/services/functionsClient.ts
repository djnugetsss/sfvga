import { httpsCallable, type HttpsCallable } from 'firebase/functions';
import type { RegistrationCreateInput, TicketValidateInput } from '@sfvga/shared-validation';
import type { AdminAccessSummary, PaymentStatus } from '@sfvga/shared-types';
import { getFirebaseAuth, getFirebaseFunctions } from './firebase';

export interface RegistrationCreateResult {
  registrationId: string;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  /** True when an existing unpaid registration was recovered. */
  resumePayment?: boolean;
}

export type TicketValidateOutcome = 'checked_in' | 'already_redeemed' | 'invalid';

export interface TicketValidateResponse {
  outcome: TicketValidateOutcome;
  attendeeName?: string;
  partySize?: number;
  message: string;
}

type CallableName =
  | 'auth_getAdminAccess'
  | 'auth_createAdminSession'
  | 'auth_deleteAccount'
  | 'auth_provisionFamilyMember'
  | 'events_create'
  | 'events_update'
  | 'events_duplicate'
  | 'registrations_create'
  | 'registrations_finish'
  | 'registrations_requestReview'
  | 'registrations_sendMessage'
  | 'registrations_markMessagesRead'
  | 'registrations_update'
  | 'registrations_cancel'
  | 'tickets_validate'
  | 'tickets_revoke'
  | 'roles_assign'
  | 'roles_revoke'
  | 'announcements_send'
  | 'gallery_uploadPhoto'
  | 'gallery_moderatePhoto'
  | 'documents_upload'
  | 'documents_delete';

function getCallable<TRequest, TResponse>(name: CallableName): HttpsCallable<TRequest, TResponse> {
  return httpsCallable<TRequest, TResponse>(getFirebaseFunctions(), name);
}

async function refreshCurrentUserToken(): Promise<void> {
  const currentUser = getFirebaseAuth().currentUser;
  if (currentUser) await currentUser.getIdToken(true);
}

export const functionsClient = {
  call: <TRequest, TResponse>(name: CallableName, data: TRequest) =>
    getCallable<TRequest, TResponse>(name)(data),

  auth: {
    getAdminAccess: async (): Promise<AdminAccessSummary> => {
      // Role and permission changes must apply without requiring sign-out.
      await refreshCurrentUserToken();
      const result = await getCallable<Record<string, never>, AdminAccessSummary>(
        'auth_getAdminAccess',
      )({});
      return result.data;
    },
    createAdminSession: async (): Promise<{
      customToken: string;
      access: AdminAccessSummary;
    }> => {
      await refreshCurrentUserToken();
      const result = await getCallable<
        Record<string, never>,
        { customToken: string; access: AdminAccessSummary }
      >('auth_createAdminSession')({});
      return result.data;
    },
  },

  registrations: {
    create: async (data: RegistrationCreateInput): Promise<RegistrationCreateResult> => {
      const result = await getCallable<RegistrationCreateInput, RegistrationCreateResult>(
        'registrations_create',
      )(data);
      return result.data;
    },
    update: (data: unknown) => functionsClient.call('registrations_update', data),
    cancel: (data: unknown) => functionsClient.call('registrations_cancel', data),
  },

  tickets: {
    validate: async (data: TicketValidateInput): Promise<TicketValidateResponse> => {
      const result = await getCallable<TicketValidateInput, TicketValidateResponse>(
        'tickets_validate',
      )(data);
      return result.data;
    },
    revoke: (data: unknown) => functionsClient.call('tickets_revoke', data),
  },
};
