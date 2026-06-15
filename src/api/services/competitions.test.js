import { where } from 'firebase/firestore';
import { fetchAllData, timestampToISOString } from '../client';
import {
  getCompetitors,
  getFinalsScores,
  getQualificationScores,
} from './competitions';

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
  orderBy: jest.fn(),
  query: jest.fn(),
  Timestamp: class Timestamp {},
  where: jest.fn((field, operator, value) => ({ field, operator, value })),
}));

jest.mock('../client', () => ({
  db: {},
  fetchAllData: jest.fn(),
  isoStringToTimestamp: jest.fn(),
  timestampToISOString: jest.fn((timestamp) => `iso:${timestamp}`),
}));

describe('competition service category filters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    where.mockImplementation((field, operator, value) => ({
      field,
      operator,
      value,
    }));
    timestampToISOString.mockImplementation((timestamp) => `iso:${timestamp}`);
  });

  test('getCompetitors applies an optional category filter and preserves shape', async () => {
    fetchAllData.mockResolvedValue([
      {
        competitorNo: 7,
        firstName: ' Alex ',
        lastName: ' Stone ',
        category: 'MO',
      },
    ]);

    const competitors = await getCompetitors('comp-1', 'MO');

    expect(where).toHaveBeenCalledWith('category', '==', 'MO');
    expect(fetchAllData).toHaveBeenCalledWith(
      'competitions/comp-1/competitors',
      [{ field: 'category', operator: '==', value: 'MO' }]
    );
    expect(competitors).toEqual({
      7: {
        name: 'Alex Stone',
        category: 'MO',
        competitorNo: 7,
      },
    });
  });

  test('getQualificationScores applies an optional category filter and preserves grouped scores', async () => {
    fetchAllData.mockResolvedValue([
      {
        competitorNo: 7,
        climbNo: 101,
        category: 'MO',
        flash: true,
        topped: true,
        created: 'created-at',
      },
    ]);

    const scores = await getQualificationScores('comp-1', 'MO');

    expect(where).toHaveBeenCalledWith('category', '==', 'MO');
    expect(fetchAllData).toHaveBeenCalledWith(
      'competitions/comp-1/qualificationScores',
      [{ field: 'category', operator: '==', value: 'MO' }]
    );
    expect(timestampToISOString).toHaveBeenCalledWith('created-at');
    expect(scores).toEqual({
      7: [
        {
          competitorNo: 7,
          climbNo: 101,
          category: 'MO',
          flashed: true,
          topped: true,
          flash: true,
          created: 'created-at',
          createdAt: 'iso:created-at',
        },
      ],
    });
  });

  test('getFinalsScores fetches all categories when no category filter is provided', async () => {
    fetchAllData.mockResolvedValue([]);

    await getFinalsScores('comp-1');

    expect(where).not.toHaveBeenCalled();
    expect(fetchAllData).toHaveBeenCalledWith(
      'competitions/comp-1/finalScores',
      []
    );
  });
});
