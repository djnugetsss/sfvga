/**
 * Firebase Functions entry point. Firebase discovers every exported function here.
 * One file per function under src/{domain}/ maps 1:1 to the tech design doc §12 list.
 */
import { initializeApp } from 'firebase-admin/app';

initializeApp();

export { registrations_finish } from './registrations/finish';
export { registrations_expirePending } from './registrations/expirePending';
export { registrations_requestReview } from './registrations/requestReview';
export { registrations_confirmPayments } from './registrations/confirmPayments';
export { registrations_grantCorrection } from './registrations/grantCorrection';
export { registrations_sendMessage } from './registrations/sendMessage';
export { registrations_markMessagesRead } from './registrations/markMessagesRead';
export {
  notifications_deliverMemberNotice,
  notifications_retryMemberNotices,
} from './notifications/deliverMemberNotice';
export { notifications_registrationMessage } from './notifications/registrationMessage';
export { notifications_registrationAttention } from './notifications/registrationAttention';
export { notifications_eventPublished } from './notifications/eventPublished';
export { notifications_deliverAdminNotice } from './notifications/deliverMemberNotice';

// auth
export { auth_onUserCreated } from './auth/onUserCreated';
export {
  auth_deleteAccount,
  auth_onUserDeleted,
  auth_processAccountDeletions,
  auth_purgeRegistrationNames,
} from './auth/deleteAccount';
export { auth_setAdminRole } from './auth/setAdminRole';
export { auth_devBootstrapSuperAdmin } from './auth/devBootstrapSuperAdmin';
export { auth_getAdminAccess, auth_createAdminSession } from './auth/adminSession';
export {
  adminRoles_list,
  adminRoles_seedDefaults,
  adminRoles_create,
  adminRoles_update,
  adminRoles_delete,
  adminRoles_assign,
  adminRoles_revoke,
  adminRoles_grantSuperAdmin,
  adminRoles_revokeSuperAdmin,
  adminRoles_migrateLegacy,
} from './auth/adminRoles';
export { adminMembers_list, adminMembers_count } from './auth/adminMembers';

// events
export { events_create } from './events/create';
export { events_update } from './events/update';
export { events_duplicate } from './events/duplicate';
export { events_delete } from './events/delete';
export { events_endPassedEvents } from './events/endPassedEvents';

// registrations
export { registrations_create } from './registrations/create';
export { registrations_update } from './registrations/update';
export { registrations_cancel } from './registrations/cancel';

// External payment links are verified manually; no provider webhook or payment bypass.

// tickets
export { tickets_onRegistrationConfirmed } from './tickets/onRegistrationConfirmed';
export { tickets_validate } from './tickets/validate';
export { tickets_revoke } from './tickets/revoke';

// roles
export {
  eventAdminRoles_list,
  eventAdminRoles_create,
  eventAdminRoles_ensureTicketScanner,
  eventAdminRoles_update,
  eventAdminRoles_delete,
  eventAdminRoles_assign,
  eventAdminRoles_revoke,
} from './roles/eventAdminRoles';

// notifications
export { announcements_send } from './notifications/sendAnnouncement';
export {
  notifications_onOrgAnnouncementCreated,
  notifications_onEventAnnouncementCreated,
} from './notifications/onAnnouncementCreated';
export { notifications_eventReminder } from './notifications/eventReminder';
export { notifications_photoAlbumReminder } from './notifications/photoAlbumReminder';
export { notifications_galleryApprovedNotify } from './notifications/galleryApprovedNotify';

// gallery
export { gallery_uploadPhoto } from './gallery/uploadPhoto';
export { gallery_moderatePhoto } from './gallery/moderatePhoto';

// documents
export { documents_upload } from './documents/upload';
export { documents_delete } from './documents/delete';

// backups
export { backups_dailyExport } from './backups/dailyExport';

export { notifications_eventRoleAssigned, notifications_organizationRoleAssigned, notifications_presidentAssigned } from './notifications/roleAssigned';
