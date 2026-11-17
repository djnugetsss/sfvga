import { getDoc, getDocs } from 'firebase/firestore';
import { fetchExistingEventIdSet } from '@/utils/existingEvents';

jest.mock('@/services/firebase', () => ({ getFirestoreDb: jest.fn(() => ({})) }));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn((_db, _collection, id) => id),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
}));

const readOne = getDoc as jest.Mock;
const readAll = getDocs as jest.Mock;

beforeEach(() => jest.clearAllMocks());

it('does not download every event for a member with no event-linked records', async () => {
  expect(await fetchExistingEventIdSet([])).toEqual(new Set());
  expect(readOne).not.toHaveBeenCalled();
  expect(readAll).not.toHaveBeenCalled();
});

it('reads only the distinct event IDs needed by a member', async () => {
  readOne.mockImplementation(async (id: string) => ({
    id,
    exists: () => id === 'current',
  }));
  expect(await fetchExistingEventIdSet(['current', 'current', 'deleted'])).toEqual(
    new Set(['current']),
  );
  expect(readOne).toHaveBeenCalledTimes(2);
  expect(readAll).not.toHaveBeenCalled();
});
