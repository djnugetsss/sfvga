import type { FirestoreTimestamp } from './user';

export type RoleListType = 'volunteer' | 'committee';

export interface RoleDefinition {
  id: string;
  name: string;
  listType: RoleListType;
  canScanTickets: boolean;
  active: boolean;
  createdBy: string;
  createdAt: FirestoreTimestamp;
}

export interface EventRoleGrant {
  id: string;
  userId: string;
  roleDefinitionId: string;
  listType: RoleListType;
  activatesAt: FirestoreTimestamp;
  expiresAt: FirestoreTimestamp;
  active: boolean;
}
