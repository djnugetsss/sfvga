import { z } from 'zod';
import { ADMIN_PERMISSIONS, EVENT_ADMIN_PERMISSIONS } from '@sfvga/shared-types';

export const adminPermissionSchema = z.enum(ADMIN_PERMISSIONS);
export const eventAdminPermissionSchema = z.enum(EVENT_ADMIN_PERMISSIONS);

export const adminRoleCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(240).optional(),
  permissions: z.array(adminPermissionSchema).min(1),
});

export const adminRoleUpdateSchema = adminRoleCreateSchema.partial().extend({
  roleId: z.string().min(1),
  // The protected Super Admin role can keep an empty display list; effective access is always full.
  permissions: z.array(adminPermissionSchema).optional(),
});

export const adminRoleDeleteSchema = z.object({ roleId: z.string().min(1) });

export const adminRoleAssignSchema = z.object({
  targetUid: z.string().min(1),
  roleId: z.string().min(1),
});

export const adminRoleRevokeSchema = z.object({ targetUid: z.string().min(1) });

export const eventAdminRoleCreateSchema = z.object({
  eventId: z.string().min(1),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(240).optional(),
  permissions: z.array(eventAdminPermissionSchema).min(1),
});

export const eventAdminRoleUpdateSchema = eventAdminRoleCreateSchema.partial().extend({
  eventId: z.string().min(1),
  roleId: z.string().min(1),
});

export const eventAdminRoleDeleteSchema = z.object({
  eventId: z.string().min(1),
  roleId: z.string().min(1),
});

export const eventAdminRoleAssignSchema = z.object({
  eventId: z.string().min(1),
  targetUid: z.string().min(1),
  roleId: z.string().min(1),
  activatesAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

export const eventAdminRoleRevokeSchema = z.object({
  eventId: z.string().min(1),
  grantId: z.string().min(1),
});

export type AdminRoleCreateInput = z.infer<typeof adminRoleCreateSchema>;
export type AdminRoleUpdateInput = z.infer<typeof adminRoleUpdateSchema>;
export type AdminRoleAssignInput = z.infer<typeof adminRoleAssignSchema>;
export type EventAdminRoleCreateInput = z.infer<typeof eventAdminRoleCreateSchema>;
export type EventAdminRoleUpdateInput = z.infer<typeof eventAdminRoleUpdateSchema>;
export type EventAdminRoleAssignInput = z.infer<typeof eventAdminRoleAssignSchema>;
