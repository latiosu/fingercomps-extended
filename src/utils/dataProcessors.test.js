import { computeProblemsWithStats } from './dataProcessors';

describe('computeProblemsWithStats', () => {
  const categories = {
    MO: { code: 'MO', name: 'Male Open' },
    FO: { code: 'FO', name: 'Female Open' },
  };

  const competitors = {
    1: { competitorNo: 1, name: 'Alice', category: 'MO', rank: 1 },
    2: { competitorNo: 2, name: 'Bea', category: 'FO', rank: 1 },
  };

  const problems = {
    101: { climbNo: 101, score: 100, marking: 'red', station: 'A' },
  };

  test('returns fresh stats without mutating raw problems', () => {
    const partialScores = {
      1: [
        {
          climbNo: 101,
          category: 'MO',
          competitorNo: 1,
          flashed: true,
          topped: true,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    };

    const fullScores = {
      ...partialScores,
      2: [
        {
          climbNo: 101,
          category: 'FO',
          competitorNo: 2,
          flashed: false,
          topped: true,
          createdAt: '2026-01-02T00:00:00.000Z',
        },
      ],
    };

    const partialProblems = computeProblemsWithStats(
      partialScores,
      problems,
      categories,
      competitors
    );
    const fullProblems = computeProblemsWithStats(
      fullScores,
      problems,
      categories,
      competitors
    );

    expect(problems[101].stats).toBeUndefined();
    expect(problems[101].sends).toBeUndefined();
    expect(partialProblems[101]).not.toBe(problems[101]);

    expect(partialProblems[101].stats).toEqual({
      MO: { tops: 1, flashes: 1 },
      FO: { tops: 0, flashes: 0 },
    });
    expect(partialProblems[101].sends).toHaveLength(1);

    expect(fullProblems[101].stats).toEqual({
      MO: { tops: 1, flashes: 1 },
      FO: { tops: 1, flashes: 0 },
    });
    expect(fullProblems[101].sends).toHaveLength(2);
  });
});
