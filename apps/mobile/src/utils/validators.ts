import type { FamilyMember, FamilyRelation } from '@sfvga/shared-types';
import { ageGroupFromYears } from '@sfvga/shared-validation';

export {
  registrationCreateSchema,
  registrationUpdateSchema,
  eventCreateSchema,
  eventUpdateSchema,
  roleDefinitionCreateSchema,
  roleAssignSchema,
} from '@sfvga/shared-validation';

export interface FamilyMemberFormValues {
  name: string;
  relation: FamilyRelation;
  /** Empty string when unknown / not provided. */
  ageYears: string;
}

export interface FamilyMemberFormErrors {
  name?: string;
  ageYears?: string;
}

/**
 * Field-level validation for the add/edit family member form (UI/UX §12: simple inline
 * validation, e.g. "Please enter a name"). Name is required; age is optional.
 */
export function validateFamilyMember(values: FamilyMemberFormValues): FamilyMemberFormErrors {
  const errors: FamilyMemberFormErrors = {};
  if (!values.name.trim()) {
    errors.name = 'Please enter a name';
  }
  const ageRaw = values.ageYears.trim();
  if (ageRaw !== '') {
    const age = Number(ageRaw);
    if (!Number.isInteger(age) || age < 0 || age > 120) {
      errors.ageYears = 'Enter a valid age in years';
    }
  }
  return errors;
}

/** Normalize raw form values into the persisted FamilyMember shape (trimmed). */
export function toFamilyMemberInput(values: FamilyMemberFormValues): Omit<FamilyMember, 'id'> {
  const ageRaw = values.ageYears.trim();
  const ageYears = ageRaw === '' ? undefined : Number(ageRaw);
  return {
    name: values.name.trim(),
    relation: values.relation,
    ageGroup: ageGroupFromYears(ageYears),
    ...(ageYears !== undefined ? { ageYears } : {}),
  };
}
