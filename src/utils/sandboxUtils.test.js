import { computeUserTableData } from './dataProcessors';
import {
  cloneCompetitors,
  computeCategoryPositions,
  createTheoreticalScore,
  mergeScoresWithTheoretical,
} from './sandboxUtils';

// Minimal competition fixture: two competitors in one category where
// competitor 2 trails competitor 1 until given a theoretical top.
const makeFixture = () => {
  const categories = {
    MO: { code: 'MO', name: 'Male Open', flashExtraPoints: 10, pumpfestTopScores: 2 },
  };
  const competitors = {
    1: { competitorNo: 1, name: 'Alice', category: 'MO' },
    2: { competitorNo: 2, name: 'Bob', category: 'MO' },
  };
  const problems = {
    101: { climbNo: 101, score: 100, marking: 'red', station: 'A' },
    102: { climbNo: 102, score: 200, marking: 'blue', station: 'B' },
    103: { climbNo: 103, score: 300, marking: 'black', station: 'C' },
  };
  const qualificationScores = {
    1: [
      { climbNo: 101, category: 'MO', competitorNo: 1, flashed: false, topped: true, createdAt: '2026-01-01T00:00:00.000Z' },
      { climbNo: 102, category: 'MO', competitorNo: 1, flashed: false, topped: true, createdAt: '2026-01-02T00:00:00.000Z' },
    ],
    2: [
      { climbNo: 101, category: 'MO', competitorNo: 2, flashed: false, topped: true, createdAt: '2026-01-01T00:00:00.000Z' },
    ],
  };
  return { categories, competitors, problems, qualificationScores };
};

const rankingByName = (tableData) =>
  [...tableData].sort((a, b) => b.total - a.total).map(u => u.name);

describe('sandbox ranking overlay', () => {
  test('theoretical top changes sandbox ranking using real scoring logic', () => {
    const { categories, competitors, problems, qualificationScores } = makeFixture();

    const realTable = computeUserTableData(categories, competitors, problems, qualificationScores);
    expect(rankingByName(realTable)).toEqual(['Alice', 'Bob']);

    // Bob theoretically tops the 300-point problem: 100 + 300 = 400 vs Alice's 300
    const theoreticalScores = {
      2: [createTheoreticalScore(competitors[2], problems[103])],
    };
    const merged = mergeScoresWithTheoretical(qualificationScores, theoreticalScores);
    const sandboxTable = computeUserTableData(categories, cloneCompetitors(competitors), problems, merged);

    expect(rankingByName(sandboxTable)).toEqual(['Bob', 'Alice']);
    const bob = sandboxTable.find(u => u.name === 'Bob');
    expect(bob.total).toBe(400);
    expect(bob.tops).toBe(2);
  });

  test('real data is not mutated by a sandbox recalculation', () => {
    const { categories, competitors, problems, qualificationScores } = makeFixture();

    const realTable = computeUserTableData(categories, competitors, problems, qualificationScores);
    const realRanks = { alice: competitors[1].rank, bob: competitors[2].rank };
    const realScoreCounts = { 1: qualificationScores[1].length, 2: qualificationScores[2].length };

    const theoreticalScores = {
      2: [createTheoreticalScore(competitors[2], problems[103])],
    };
    const merged = mergeScoresWithTheoretical(qualificationScores, theoreticalScores);
    computeUserTableData(categories, cloneCompetitors(competitors), problems, merged);

    // Cloning shields the real competitors from rank writes
    expect(competitors[1].rank).toBe(realRanks.alice);
    expect(competitors[2].rank).toBe(realRanks.bob);
    // Merging never appends to the real score arrays
    expect(qualificationScores[1]).toHaveLength(realScoreCounts[1]);
    expect(qualificationScores[2]).toHaveLength(realScoreCounts[2]);
    expect(qualificationScores[2].some(s => s.theoretical)).toBe(false);

    // Recomputing from the untouched real data restores the original ranking exactly
    const restoredTable = computeUserTableData(categories, competitors, problems, qualificationScores);
    expect(restoredTable.map(u => ({ name: u.name, total: u.total, rank: u.rank })))
      .toEqual(realTable.map(u => ({ name: u.name, total: u.total, rank: u.rank })));
  });

  test('merge returns real scores unchanged when overlay is empty', () => {
    const { qualificationScores } = makeFixture();
    expect(mergeScoresWithTheoretical(qualificationScores, {})).toBe(qualificationScores);
    expect(mergeScoresWithTheoretical(qualificationScores, null)).toBe(qualificationScores);
  });

  test('theoretical entries stay flagged through score processing', () => {
    const { categories, competitors, problems, qualificationScores } = makeFixture();

    const theoreticalScores = {
      2: [createTheoreticalScore(competitors[2], problems[103], true)],
    };
    const merged = mergeScoresWithTheoretical(qualificationScores, theoreticalScores);
    const sandboxTable = computeUserTableData(categories, cloneCompetitors(competitors), problems, merged);

    const bob = sandboxTable.find(u => u.name === 'Bob');
    const theoretical = bob.scores.filter(s => s.theoretical);
    expect(theoretical).toHaveLength(1);
    expect(theoretical[0].climbNo).toBe(103);
    expect(theoretical[0].flashed).toBe(true);
    // Real sends remain unflagged
    expect(bob.scores.filter(s => !s.theoretical)).toHaveLength(1);
  });

  test('real send wins deduplication over a theoretical duplicate of the same problem', () => {
    const { categories, competitors, problems, qualificationScores } = makeFixture();

    // Bob theoretically re-tops problem 101 which he already topped for real
    const theoreticalScores = {
      2: [createTheoreticalScore(competitors[2], problems[101])],
    };
    const merged = mergeScoresWithTheoretical(qualificationScores, theoreticalScores);
    const sandboxTable = computeUserTableData(categories, cloneCompetitors(competitors), problems, merged);

    const bob = sandboxTable.find(u => u.name === 'Bob');
    expect(bob.tops).toBe(1);
    expect(bob.total).toBe(100);
    expect(bob.scores.filter(s => s.climbNo === 101)).toHaveLength(1);
    expect(bob.scores[0].theoretical).toBeUndefined();
  });

  test('computeCategoryPositions assigns positions within each category', () => {
    const tableData = [
      { competitorNo: 1, category: 'MO', total: 400 },
      { competitorNo: 3, category: 'FO', total: 350 },
      { competitorNo: 2, category: 'MO', total: 300 },
      { competitorNo: 4, category: 'FO', total: 250 },
    ];
    expect(computeCategoryPositions(tableData)).toEqual({ 1: 1, 3: 1, 2: 2, 4: 2 });
  });
});
