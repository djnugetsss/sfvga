import { z } from 'zod';

export const roleDefinitionCreateSchema = z.object({
  name: z.string().min(1, 'Role name is required'),
  listType: z.enum(['volunteer', 'committee']),
  canScanTickets: z.boolean().default(false),
});

export type RoleDefinitionCreateInput = z.infer<typeof roleDefinitionCreateSchema>;

export const roleDefinitionUpdateSchema = z.object({
  roleDefinitionId: z.string().min(1),
  name: z.string().min(1).optional(),
  canScanTickets: z.boolean().optional(),
  active: z.boolean().optional(),
});

export type RoleDefinitionUpdateInput = z.infer<typeof roleDefinitionUpdateSchema>;

export const roleAssignSchema = z.object({
  eventId: z.string().min(1),
  userId: z.string().min(1),
  roleDefinitionId: z.string().min(1),
  activatesAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

export type RoleAssignInput = z.infer<typeof roleAssignSchema>;

export const roleRevokeSchema = z.object({
  eventId: z.string().min(1),
  roleGrantId: z.string().min(1),
});

export type RoleRevokeInput = z.infer<typeof roleRevokeSchema>;
