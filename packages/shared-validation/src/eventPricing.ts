import { z } from 'zod';

/** Optional per-event child discount / free cutoff. */
export const eventChildRuleSchema = z.object({
  maxAgeInclusive: z.number().int().min(0).max(21),
  price: z.number().min(0),
});

export const eventPricingSchema = z.object({
  member: z.number().min(0),
  guest: z.number().min(0),
  childRule: eventChildRuleSchema.optional(),
});

export type EventPricing = z.infer<typeof eventPricingSchema>;
export type EventChildRule = z.infer<typeof eventChildRuleSchema>;

/** Legacy adult/child/senior shape still present on older Firestore event docs. */
export type LegacyEventPricing = {
  adult?: number;
  child?: number;
  senior?: number;
  member?: number;
  guest?: number;
  childRule?: EventChildRule;
};

/**
 * Normalize stored pricing (new or legacy) into the member/guest + optional childRule shape.
 * Legacy: member/guest ← adult; childRule from child when it differs from adult (maxAge 12).
 */
export function normalizeEventPricing(raw: LegacyEventPricing | null | undefined): EventPricing {
  if (!raw || typeof raw !== 'object') {
    return { member: 0, guest: 0 };
  }

  if (typeof raw.member === 'number' && typeof raw.guest === 'number') {
    const pricing: EventPricing = { member: raw.member, guest: raw.guest };
    if (
      raw.childRule &&
      typeof raw.childRule.maxAgeInclusive === 'number' &&
      typeof raw.childRule.price === 'number'
    ) {
      pricing.childRule = {
        maxAgeInclusive: raw.childRule.maxAgeInclusive,
        price: raw.childRule.price,
      };
    }
    return pricing;
  }

  const adult = typeof raw.adult === 'number' ? raw.adult : 0;
  const child = typeof raw.child === 'number' ? raw.child : adult;
  const pricing: EventPricing = { member: adult, guest: adult };
  if (child !== adult) {
    pricing.childRule = { maxAgeInclusive: 12, price: child };
  }
  return pricing;
}

export function childRuleLabel(maxAgeInclusive: number): string {
  return `child (${maxAgeInclusive} & under)`;
}

export function childRuleLabelPlural(maxAgeInclusive: number, count: number): string {
  const base = childRuleLabel(maxAgeInclusive);
  return count === 1 ? base : `${base}s`;
}

export type PriceTier = 'member' | 'guest' | 'child';

export function resolvePriceTier(
  pricing: EventPricing,
  input: { isGuest: boolean; ageYears?: number | null },
): PriceTier {
  const age = input.ageYears;
  if (
    pricing.childRule &&
    typeof age === 'number' &&
    Number.isFinite(age) &&
    age >= 0 &&
    age <= pricing.childRule.maxAgeInclusive
  ) {
    return 'child';
  }
  return input.isGuest ? 'guest' : 'member';
}

export function priceForAttendee(
  pricing: EventPricing,
  input: { isGuest: boolean; ageYears?: number | null },
): number {
  const tier = resolvePriceTier(pricing, input);
  if (tier === 'child' && pricing.childRule) return pricing.childRule.price;
  return tier === 'guest' ? pricing.guest : pricing.member;
}

/** Derive legacy AgeGroup for tickets from ageYears (compat). */
export function ageGroupFromYears(ageYears?: number | null): 'adult' | 'child' | 'senior' {
  if (typeof ageYears === 'number' && Number.isFinite(ageYears) && ageYears <= 17) {
    return 'child';
  }
  return 'adult';
}
