/**
 * Utilities for the what-if sandbox: theoretical tops are kept as a separate
 * overlay and merged with real scores only when computing sandbox rankings.
 */

/**
 * Creates a theoretical (what-if) score entry for a competitor on a problem.
 * Shaped like a real qualification score entry so it flows through
 * computeUserTableData unchanged, plus a `theoretical` flag for display.
 * @param {Object} competitor - Competitor object
 * @param {Object} problem - Problem object
 * @param {boolean} flashed - Whether the theoretical top is a flash
 * @returns {Object} Theoretical score entry
 */
export const createTheoreticalScore = (competitor, problem, flashed = false) => ({
  climbNo: problem.climbNo,
  category: competitor.category,
  competitorNo: competitor.competitorNo,
  flashed,
  topped: true,
  theoretical: true,
  createdAt: new Date().toISOString(),
});

/**
 * Merges theoretical scores over real qualification scores without mutating
 * either input. Theoretical entries are appended after real entries so that,
 * on equal totals, the real send wins deduplication in computeUserTableData.
 * @param {Object} qualificationScores - Real scores keyed by competitorNo
 * @param {Object} theoreticalScores - Theoretical scores keyed by competitorNo
 * @returns {Object} Merged scores keyed by competitorNo
 */
export const mergeScoresWithTheoretical = (qualificationScores, theoreticalScores) => {
  if (!theoreticalScores || Object.keys(theoreticalScores).length === 0) {
    return qualificationScores;
  }

  const merged = { ...qualificationScores };
  Object.entries(theoreticalScores).forEach(([competitorNo, scores]) => {
    if (!scores?.length) return;
    merged[competitorNo] = [...(merged[competitorNo] || []), ...scores];
  });
  return merged;
};

/**
 * Shallow-clones each competitor object. computeUserTableData writes ranks
 * back onto the competitors it is given, so sandbox recalculations must run
 * against clones to leave the real competitor data untouched.
 * @param {Object} competitors - Competitors keyed by competitorNo
 * @returns {Object} Cloned competitors keyed by competitorNo
 */
export const cloneCompetitors = (competitors) =>
  Object.fromEntries(
    Object.entries(competitors).map(([key, competitor]) => [key, { ...competitor }])
  );

/**
 * Computes each competitor's position within their own category.
 * Expects data sorted by total descending (as computeUserTableData returns),
 * matching the order used for the # column in the user table.
 * @param {Array} tableData - User table data sorted by total descending
 * @returns {Object} Map of competitorNo to 1-based position within category
 */
export const computeCategoryPositions = (tableData) => {
  const counters = {};
  const positions = {};
  tableData.forEach((item) => {
    counters[item.category] = (counters[item.category] || 0) + 1;
    positions[item.competitorNo] = counters[item.category];
  });
  return positions;
};
