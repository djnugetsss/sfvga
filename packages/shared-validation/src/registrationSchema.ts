import { z } from 'zod';

export const ageGroupSchema = z.enum(['adult', 'child', 'senior']);

export const registrationAttendeeSchema = z.object({
  familyMemberId: z.union([z.string().min(1), z.literal('self')]),
  name: z.string().min(1, 'Name is required'),
  ageGroup: ageGroupSchema,
  ageYears: z.number().int().min(0).max(120).optional(),
  isGuest: z.boolean().optional(),
});

export const registrationCreateSchema = z.object({
  eventId: z.string().min(1),
  attendees: z.array(registrationAttendeeSchema).min(1, 'Select at least one attendee').max(100),
});

export type RegistrationCreateInput = z.infer<typeof registrationCreateSchema>;

export const registrationUpdateSchema = registrationCreateSchema.omit({ eventId: true });

export type RegistrationUpdateInput = z.infer<typeof registrationUpdateSchema>;

const pathId = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[^/]+$/);
export const registrationActionSchema = z.object({
  eventId: pathId,
  registrationId: pathId,
  requestId: pathId,
});
export const registrationFinishSchema = registrationActionSchema.extend({
  payerName: z.string().trim().min(1, 'Enter the name on the payment').max(150),
  paymentNote: z.string().trim().max(1000).default(''),
});
export const paymentDecisionsSchema = z.object({
  eventId: pathId,
  requestId: pathId,
  decisions: z
    .array(
      z.object({
        registrationId: pathId,
        approved: z.boolean(),
        expectedRevision: z.number().int().nonnegative(),
      }),
    )
    .min(1)
    .max(25),
});
export const correctionExceptionSchema = registrationActionSchema.extend({
  expiresAt: z.string().datetime(),
  explanation: z.string().trim().min(1).max(2000),
});
export const registrationMessageSchema = registrationActionSchema.extend({
  senderRole: z.enum(['member', 'organizer']).optional(),
  body: z.string().trim().min(1).max(2000),
});
