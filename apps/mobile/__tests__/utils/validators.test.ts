import {
  validateFamilyMember,
  toFamilyMemberInput,
  type FamilyMemberFormValues,
} from '@/utils/validators';

const base: FamilyMemberFormValues = {
  name: 'Asha Patel',
  relation: 'child',
  ageYears: '8',
};

describe('validateFamilyMember', () => {
  it('accepts a member with a name', () => {
    expect(validateFamilyMember(base)).toEqual({});
  });

  it('requires a non-empty name', () => {
    expect(validateFamilyMember({ ...base, name: '   ' })).toEqual({
      name: 'Please enter a name',
    });
  });

  it('rejects an invalid age', () => {
    expect(validateFamilyMember({ ...base, ageYears: '200' })).toEqual({
      ageYears: 'Enter a valid age in years',
    });
  });
});

describe('toFamilyMemberInput', () => {
  it('trims the name and derives ageGroup from ageYears', () => {
    expect(toFamilyMemberInput({ ...base, name: '  Asha  ', ageYears: '8' })).toEqual({
      name: 'Asha',
      relation: 'child',
      ageGroup: 'child',
      ageYears: 8,
    });
  });

  it('omits ageYears when blank and treats as adult', () => {
    expect(toFamilyMemberInput({ ...base, ageYears: '' })).toEqual({
      name: 'Asha Patel',
      relation: 'child',
      ageGroup: 'adult',
    });
  });
});
