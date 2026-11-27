import type { AdminRoleDefinition } from '@sfvga/shared-types';

// Follow the board hierarchy, followed by committee and supporting leadership roles.
const leadershipOrder = [
  'President', 'Vice President', 'Secretary', 'Treasurer', 'Youth Champion',
  'Innovation Catalyst', 'Senior Champion', 'Liaison', 'Director',
  'Chair', 'Co-Chair', 'Committee Member', 'Event Treasurer',
  'Webmaster', 'Honorary CPA', 'App Developer',
];

export function compareAdminRoles(a: AdminRoleDefinition, b: AdminRoleDefinition): number {
  if (a.system !== b.system) return a.system ? -1 : 1;
  const rank = (role: AdminRoleDefinition) => {
    const savedTitle = role.id.startsWith('board-') || role.id.startsWith('committee-')
      ? role.id.replace(/^(board|committee)-/, '').replaceAll('-', ' ')
      : role.name.trim();
    const index = leadershipOrder.findIndex(name => name.toLowerCase().replaceAll('-', ' ') === savedTitle.toLowerCase().replaceAll('-', ' '));
    return index < 0 ? leadershipOrder.length : index;
  };
  return rank(a) - rank(b) || a.name.localeCompare(b.name);
}
