import { z } from 'zod';

export const adminLevelSchema = z.enum(['super', 'org', 'finance', 'content']);

/**
 * Input for auth_setAdminRole. A Super Admin grants another user an admin level.
 * Never client-writable directly — enforced server-side (tech design doc §3, §4).
 */
export const setAdminRoleSchema = z.object({
  targetUid: z.string().min(1, 'Target user is required'),
  adminLevel: adminLevelSchema,
});

export type SetAdminRoleInput = z.infer<typeof setAdminRoleSchema>;
