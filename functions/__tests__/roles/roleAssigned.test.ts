import { roleAssignmentChanged } from '../../src/notifications/roleAssigned';

describe('role assignment notices', () => {
  it('notifies for new and changed organization roles', () => {
    expect(roleAssignmentChanged(undefined, { roleId: 'secretary' })).toBe(true);
    expect(roleAssignmentChanged({ roleId: 'secretary' }, { roleId: 'treasurer' })).toBe(true);
  });
  it('ignores deletion, revocation and unchanged role writes', () => {
    expect(roleAssignmentChanged({ roleId: 'secretary' }, undefined)).toBe(false);
    expect(roleAssignmentChanged({}, { revokedAt: { seconds: 1 } }, true)).toBe(false);
    expect(roleAssignmentChanged({ roleId: 'secretary' }, { roleId: 'secretary', updatedAt: 2 })).toBe(false);
  });
  it('notifies when event access is restored or its assignment window changes', () => {
    expect(roleAssignmentChanged({ revokedAt: 1 }, { roleDefinitionId: 'scanner' }, true)).toBe(true);
    expect(roleAssignmentChanged({ roleDefinitionId: 'scanner', expiresAt: 1 }, { roleDefinitionId: 'scanner', expiresAt: 2 }, true)).toBe(true);
    expect(roleAssignmentChanged({ roleDefinitionId: 'scanner' }, { roleDefinitionId: 'scanner' }, true)).toBe(false);
  });
});
