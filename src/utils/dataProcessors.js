/**
 * Computes score based on sorted scores, flash points, and limit
 * @param {Array} sortedScores - Array of scores sorted by value
 * @param {number} flashPoints - Points awarded for flashing a problem
 * @param {number} limit - Maximum number of scores to count
 * @returns {Object} Object containing tops, flashes, and total score
 */
export const computeScore = (sortedScores, flashPoints, limit) => {
  let tops = 0, flashes = 0;
  const total = sortedScores.slice(0, limit).reduce((sum, s) => {
    if (!s) return sum;
    tops += 1;
    if (s.flashed) flashes += 1;
    return sum + (s.score + (s.flashed ? flashPoints : 0));
  }, 0);
  return { tops, flashes, total };
};

/**
 * Computes user table data from raw competition data
 * @param {Object} categories - Categories data
 * @param {Object} competitors - Competitors data
 * @param {Object} problems - Problems data
 * @param {Object} scores - Scores data
 * @returns {Array} Array of processed user data for display
 */
export const computeUserTableData = (categories, competitors, problems, scores) => {
  const table = Object.entries(competitors).map(([uid, user]) => {
    const cat = categories[user.category];
    const flashExtraPoints = cat?.flashExtraPoints || 0;

    // Map scores and add problem details
    const mappedScores = (scores[uid] || [])
      .map(s => ({ ...problems[s?.climbNo], ...s }));

    // Filter out duplicate sends of the same problem, keeping only the best attempt
    const uniqueScores = [];
    const seenProblems = new Set();

    // Sort by score (highest first) to ensure we keep the best attempt for each problem
    mappedScores.sort((a, b) => {
      const aTotal = a.score + (a.flashed ? flashExtraPoints : 0);
      const bTotal = b.score + (b.flashed ? flashExtraPoints : 0);
      return bTotal - aTotal;
    });

    // Keep only the first (best) occurrence of each problem
    mappedScores.forEach(score => {
      if (!score.climbNo) return;

      if (!seenProblems.has(score.climbNo)) {
        seenProblems.add(score.climbNo);
        uniqueScores.push(score);
      }
    });

    const row = {
      ...user,
      scores: uniqueScores
    };

    const { tops, flashes, total } = computeScore(
      row.scores,
      flashExtraPoints,
      cat?.pumpfestTopScores || 0
    );
    return {
      ...row,
      tops,
      flashes,
      total,
      bonus: flashExtraPoints * flashes,
      flashExtraPoints: flashExtraPoints,
      categoryFullName: cat?.name
    };
  });

  // Rank Assignment in descending order by default
  let currentRank = 0;
  let lastScore = null;
  table.sort((a, b) => b.total - a.total).forEach((item, index) => {
    if (lastScore === null || item.total !== lastScore) {
      currentRank = index + 1;
      lastScore = item.total;
    }
    item.rank = currentRank;
    competitors[item.competitorNo].rank = currentRank;
  });

  return table;
};

/**
 * Computes problem statistics from scores data
 * @param {Object} scores - Scores data
 * @param {Object} problems - Problems data
 * @param {Object} categories - Categories data
 * @param {Object} competitors - Competitors data
 */
export const computeProblemStats = (scores, problems, categories, competitors) => {
  const seen = new Set();
  Object.entries(scores).forEach(([cptNo, cptScores]) => {
    cptScores.forEach((score) => {
      const tmpId = `${cptNo},${score.climbNo}`;
      // Skip duplicates
      if (seen.has(tmpId)) {
        console.debug(`Duplicate climb detected: ${tmpId}`);
        return;
      } else {
        seen.add(tmpId);
      }
      const climb = problems[score.climbNo];
      if (!climb) {
        // Skip processing if data is missing
        return;
      }
      if (!climb.stats) {
        climb['stats'] = {};
        Object.keys(categories).forEach((category) => {
          climb.stats[category] = {
            'tops': 0,
            'flashes': 0,
          }
        });
      }
      if (!climb.sends) {
        climb['sends'] = [];
      }
      if (score.flashed) {
        if (!climb.stats.hasOwnProperty(score.category)) {
          console.warn(`Unrecognised category (${score.category}) in categories set (${Object.keys(categories)})`);
          return;
        }
        climb.stats[score.category].flashes += 1;
      }
      if (score.topped) {
        if (!climb.stats.hasOwnProperty(score.category)) {
          console.warn(`Unrecognised category (${score.category}) in categories set (${Object.keys(categories)})`);
          return;
        }
        climb.stats[score.category].tops += 1;
        climb.sends.push({
          competitorNo: score.competitorNo,
          rank: competitors[score.competitorNo]?.rank,
          category: categories[score.category]?.name,
          categoryCode: score.category,
          name: competitors[score.competitorNo]?.name,
          flashed: score.flashed,
          createdAt: score.createdAt,
        });
      }
    });
  });
};

/**
 * Computes category tops from scores data
 * @param {Object} categories - Categories data
 * @param {Object} scores - Scores data
 * @returns {Object} Object containing category tops data
 */
export const computeCategoryTops = (categories, scores) => {
  const categoryTops = {};
  Object.keys(categories).forEach((category) => {
    categoryTops[category] = [];
  });
  Object.values(scores).forEach((competitorScores) => {
    // Assume competitor is just in one category and add their score
    if (competitorScores.length > 0) {
      categoryTops[competitorScores[0].category]?.push(competitorScores.length);
    }
  });
  return categoryTops;
};