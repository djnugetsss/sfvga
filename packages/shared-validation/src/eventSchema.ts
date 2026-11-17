import { z } from 'zod';
import { eventPricingSchema } from './eventPricing';

export const eventLocationSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
});

export const eventFaqSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});

export { eventPricingSchema, eventChildRuleSchema } from './eventPricing';
export type { EventPricing, EventChildRule } from './eventPricing';

export const eventCreateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  paymentUrl: z.string().url().refine((url) => url.startsWith('https://'), 'Use an HTTPS payment link').optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  location: eventLocationSchema,
  parkingNote: z.string().optional(),
  whatToBring: z.string().optional(),
  schedule: z.string().optional(),
  faqs: z.array(eventFaqSchema).default([]),
  capacity: z.number().int().positive().optional(),
  registrationDeadline: z.string().datetime().optional(),
  pricing: eventPricingSchema,
  bannerUrl: z.string().url().optional(),
  flyerUrl: z.string().url().optional(),
  photoAlbumUrl: z.string().url().optional(),
});

export type EventCreateInput = z.infer<typeof eventCreateSchema>;

export const eventUpdateSchema = eventCreateSchema.partial().extend({
  eventId: z.string().min(1),
  status: z.enum(['draft', 'published', 'ended']).optional(),
});

export type EventUpdateInput = z.infer<typeof eventUpdateSchema>;

export const eventDuplicateSchema = z.object({
  sourceEventId: z.string().min(1),
});

export type EventDuplicateInput = z.infer<typeof eventDuplicateSchema>;
