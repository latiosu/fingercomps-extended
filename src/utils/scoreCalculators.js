/**
 * Calculates the new total score with a new problem
 * @param {Array} sortedUserScores - Array of user scores sorted by value
 * @param {number} newProblemScore - Score of the new problem
 * @param {number} flashPoints - Points awarded for flashing a problem
 * @param {number} pumpfestTopScores - Maximum number of scores to count
 * @returns {number} New total score
 */
export const calculateNewTotal = (sortedUserScores, newProblemScore, flashPoints, pumpfestTopScores) => {
  const newScores = [...sortedUserScores];
  newScores.push({ score: newProblemScore, flashed: false });
  return newScores
    .sort((a, b) => (b.score + (b.flashed ? flashPoints : 0)) - (a.score + (a.flashed ? flashPoints : 0)))
    .slice(0, pumpfestTopScores)
    .reduce((sum, s) => sum + s.score + (s.flashed ? flashPoints : 0), 0);
};

/**
 * Calculates the rank change with a new total score
 * @param {Array} categoryUsers - Array of users in the category
 * @param {Object} currentUser - Current user object
 * @param {number} newTotal - New total score
 * @returns {number} Rank change (positive for improvement)
 */
export const calculateRankChange = (categoryUsers, currentUser, newTotal) => {
  const currentUserIndex = categoryUsers.findIndex(u => u.competitorNo === currentUser.competitorNo);

  const updatedCategoryUsers = categoryUsers.map(user => {
    if (user.competitorNo === currentUser.competitorNo) {
      return { ...user, total: newTotal };
    }
    return user;
  });

  updatedCategoryUsers.sort((a, b) => b.total - a.total);
  const newRank = updatedCategoryUsers.findIndex(u => u.competitorNo === currentUser.competitorNo) + 1;

  return currentUserIndex + 1 - newRank;
};

/**
 * Helper function to extract the main location from a location string
 * @param {string} location - Location string
 * @returns {string} Main location in title case
 */
export const getMainLocation = (location) => {
  if (!location) return '';
  // Extract the first part before any delimiter
  const mainPart = location.split(/[-/,\s]/)[0].trim();
  // Normalize to title case for grouping
  return mainPart.charAt(0).toUpperCase() + mainPart.slice(1).toLowerCase();
};

/**
 * Gets recommended problems for a user
 * @param {Object} problems - All problems data
 * @param {Array} userScores - User's scores
 * @param {Object} currentUser - Current user object
 * @param {Array} categoryUsers - Array of users in the category
 * @param {Object} category - Category data
 * @param {boolean} sortByOverallTops - Whether to sort by overall tops
 * @param {boolean} showNonRankingProblems - Whether to show problems that don't change rank
 * @param {string} location - Filter by problem location
 * @returns {Array} Array of recommended problems
 */
export const getRecommendedProblems = (
  problems,
  userScores,
  currentUser,
  categoryUsers,
  category,
  sortByOverallTops = false,
  showNonRankingProblems = false,
  location = ''
) => {
  const flashPoints = category?.flashExtraPoints || 0;
  const pumpfestTopScores = category?.pumpfestTopScores || 0;

  // Get user's sorted scores
  const sortedUserScores = [...(userScores || [])]
    .map(s => ({ ...problems[s?.climbNo], ...s }))
    .sort((a, b) => {
      const aTotal = a.score + (a.flashed ? flashPoints : 0);
      const bTotal = b.score + (b.flashed ? flashPoints : 0);
      return bTotal - aTotal;
    });

  // Get user's lowest counting score
  const lowestCountingScore = sortedUserScores[pumpfestTopScores - 1]?.score || 0;

  // Calculate current total
  const currentTotal = sortedUserScores
    .slice(0, pumpfestTopScores)
    .reduce((sum, s) => sum + s.score + (s.flashed ? flashPoints : 0), 0);

  // Calculate points needed for next rank
  const currentUserIndex = categoryUsers.findIndex(u => u.competitorNo === currentUser.competitorNo);
  const pointsNeededForNextRank = currentUserIndex > 0
    ? categoryUsers[currentUserIndex - 1].total - currentUser.total
    : 0;

  // Helper function to get tops count based on sort mode
  const getTopCount = (problem) => {
    if (sortByOverallTops) {
      return Object.values(problem.stats || {}).reduce((sum, stat) => sum + (stat.tops || 0), 0);
    }
    return problem.stats?.[category.code]?.tops || 0;
  };

  // Filter and process problems
  const recommendedProblems = Object.values(problems)
    .filter(problem => {
      // Check if user hasn't topped it
      const hasTopped = userScores?.some(s => s.climbNo === problem.climbNo && s.topped);
      if (hasTopped) return false;

      // Check if worth more points than user's lowest counting top
      if (problem.score <= lowestCountingScore) return false;

      // If not at rank 1, check if problem provides at least 50% of points needed
      if (currentUserIndex > 0) {
        const newTotal = calculateNewTotal(sortedUserScores, problem.score, flashPoints, pumpfestTopScores);
        const additionalPoints = newTotal - currentTotal;
        if (additionalPoints < pointsNeededForNextRank * 0.5) return false;
      }

      // Filter by location if selected
      if (location && getMainLocation(problem.station) !== location) return false;

      return true;
    })
    .map(problem => {
      const newTotal = calculateNewTotal(sortedUserScores, problem.score, flashPoints, pumpfestTopScores);
      return {
        ...problem,
        additionalPoints: newTotal - currentTotal,
        rankImprovement: calculateRankChange(categoryUsers, currentUser, newTotal)
      };
    })
    .sort((a, b) => {
      const aTops = getTopCount(a);
      const bTops = getTopCount(b);
      if (bTops !== aTops) {
        return bTops - aTops;
      }
      return b.score - a.score;
    });

  // Filter based on rank improvement and checkbox state
  return recommendedProblems.filter(problem =>
    showNonRankingProblems || problem.rankImprovement > 0
  );
};