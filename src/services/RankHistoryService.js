import { computeUserTableData } from '../utils/dataProcessors';

/**
 * Service for managing rank history calculations
 */
class RankHistoryService {
  /**
   * Creates a new RankHistoryService instance
   * @param {Object} categories - Categories data
   * @param {Object} competitors - Competitors data
   * @param {Object} problems - Problems data
   * @param {Object} qualificationScores - Scores data
   * @param {string} competitionId - Competition ID
   */
  constructor(categories, competitors, problems, qualificationScores, competitionId) {
    this.categories = categories;
    this.competitors = competitors;
    this.problems = problems;
    this.qualificationScores = qualificationScores;
    this.competitionId = competitionId;

    // Create a timeline of all score events
    this.timeline = this._buildTimeline();

    // In-memory cache for fastest access during current session only
    this.rankingsCache = new Map();
  }

  /**
   * Builds a timeline of all score events
   * @returns {Array} Sorted array of score events
   * @private
   */
  _buildTimeline() {
    const events = [];

    Object.entries(this.qualificationScores).forEach(([competitorNo, competitorScores]) => {
      competitorScores.forEach(score => {
        events.push({
          timestamp: new Date(score.createdAt),
          competitorNo,
          score
        });
      });
    });

    // Sort by timestamp (oldest first)
    return events.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Gets rankings at a specific point in time
   * @param {Date} timestamp - Target time
   * @param {string} [categoryFilter] - Optional category filter
   * @returns {Promise<Array>} Rankings at that time, with category position if filtered
   */
  async getRankingsAtTime(timestamp, categoryFilter = '') {
    const cacheKey = `${timestamp.toISOString()}_${categoryFilter}`;

    // Check in-memory cache first for fastest access during current session
    if (this.rankingsCache.has(cacheKey)) {
      return this.rankingsCache.get(cacheKey);
    }

    // Calculate rankings on demand
    const filteredScores = {};

    Object.entries(this.qualificationScores).forEach(([competitorNo, competitorScores]) => {
      // Only include competitors in the selected category if a filter is applied
      if (categoryFilter && this.competitors[competitorNo]?.category !== categoryFilter) {
        return;
      }

      filteredScores[competitorNo] = competitorScores.filter(score =>
        new Date(score.createdAt) <= timestamp
      );
    });

    // Compute rankings
    const rankings = computeUserTableData(
      this.categories,
      this.competitors,
      this.problems,
      filteredScores
    );

    // If category filter is applied, add position within category
    if (categoryFilter) {
      // Sort by total score (descending)
      const sortedRankings = [...rankings].sort((a, b) => b.total - a.total);

      // Add position within category
      sortedRankings.forEach((competitor, index) => {
        competitor.categoryPosition = index + 1;
      });

      // Cache the result in memory for current session only
      this.rankingsCache.set(cacheKey, sortedRankings);

      return sortedRankings;
    }

    // Cache the result in memory for current session only
    this.rankingsCache.set(cacheKey, rankings);

    return rankings;
  }

  /**
   * Gets key points in the timeline (e.g., daily)
   * @param {string} interval - 'hourly', 'daily', 'weekly'
   * @returns {Array} Key timestamps
   */
  getKeyTimepoints(interval = 'daily') {
    if (this.timeline.length === 0) return [];

    const startTime = this.timeline[0].timestamp;
    const endTime = new Date(); // Now
    const timepoints = [];

    let current = new Date(startTime);

    while (current <= endTime) {
      timepoints.push(new Date(current));

      // Increment based on interval
      switch (interval) {
        case 'hourly':
          current.setHours(current.getHours() + 1);
          break;
        case 'daily':
          current.setDate(current.getDate() + 1);
          break;
        case 'weekly':
          current.setDate(current.getDate() + 7);
          break;
        default:
          current.setDate(current.getDate() + 1);
      }
    }

    return timepoints;
  }

  /**
   * Gets rank changes between two points in time
   * @param {Date} currentTime - Current time
   * @param {Date} previousTime - Previous time
   * @param {string} [categoryFilter] - Optional category filter
   * @returns {Promise<Array>} Rankings with change information based on category position if filtered
   */
  async getRankChanges(currentTime, previousTime, categoryFilter = '') {
    const currentRankings = await this.getRankingsAtTime(currentTime, categoryFilter);
    const previousRankings = await this.getRankingsAtTime(previousTime, categoryFilter);

    // Calculate the total number of competitors in the category
    const totalCompetitors = categoryFilter
      ? currentRankings.filter(r => r.category === categoryFilter).length
      : currentRankings.length;

    return currentRankings.map(current => {
      const previous = previousRankings.find(p => p.competitorNo === current.competitorNo);

      // If competitor wasn't ranked before, they're new
      if (!previous) {
        return {
          ...current,
          rankChange: 'new',
          previousRank: null,
          scoreChange: current.total
        };
      }

      // Use category position if category filter is applied, otherwise use overall rank
      const currentPosition = categoryFilter ? current.categoryPosition : current.rank;
      const previousPosition = categoryFilter ? previous.categoryPosition : previous.rank;

      // Calculate rank change
      let rankChange = previousPosition - currentPosition;

      // Cap the rank change based on logical possibilities
      if (rankChange > 0) {
        // For positive changes (rising in rank), the maximum possible change
        // is from last place to current position
        const maxPossibleRise = totalCompetitors - currentPosition;
        if (rankChange > maxPossibleRise) {
          rankChange = maxPossibleRise;
        }
      } else if (rankChange < 0) {
        // For negative changes (falling in rank), the maximum possible change
        // is from first place to current position
        const maxPossibleFall = -(currentPosition - 1);
        if (rankChange < maxPossibleFall) {
          rankChange = maxPossibleFall;
        }
      }

      return {
        ...current,
        rankChange,
        previousRank: previousPosition,
        scoreChange: current.total - previous.total
      };
    });
  }

  /**
   * Gets rank history for a specific competitor
   * @param {string} competitorNo - Competitor number
   * @param {string} interval - 'hourly', 'daily', 'weekly'
   * @param {string} [categoryFilter] - Optional category filter
   * @returns {Promise<Array>} Rank history with category position if filtered
   */
  async getCompetitorRankHistory(competitorNo, interval = 'daily', categoryFilter = '') {
    const timepoints = this.getKeyTimepoints(interval);
    const history = [];

    for (const timepoint of timepoints) {
      const rankings = await this.getRankingsAtTime(timepoint, categoryFilter);
      const competitor = rankings.find(r => r.competitorNo === competitorNo);

      if (competitor) {
        // Use category position if category filter is applied, otherwise use overall rank
        const position = categoryFilter ? competitor.categoryPosition : competitor.rank;

        history.push({
          timestamp: timepoint,
          rank: position, // Use the appropriate position
          total: competitor.total
        });
      }
    }

    return history;
  }

  /**
   * Gets significant rank changes
   * @param {Date} currentTime - Current time
   * @param {Date} previousTime - Previous time
   * @param {number} threshold - Minimum change to be considered significant
   * @param {string} [categoryFilter] - Optional category filter
   * @returns {Promise<Object>} Top risers and fallers based on category position if filtered
   */
  async getSignificantChanges(currentTime, previousTime, threshold = 3, categoryFilter = '') {
    const changes = await this.getRankChanges(currentTime, previousTime, categoryFilter);

    const risers = changes
      .filter(c => typeof c.rankChange === 'number' && c.rankChange > threshold)
      .sort((a, b) => b.rankChange - a.rankChange);

    const fallers = changes
      .filter(c => typeof c.rankChange === 'number' && c.rankChange < -threshold)
      .sort((a, b) => a.rankChange - b.rankChange);

    return { risers, fallers };
  }

  /**
   * Clears the in-memory cache for this competition
   */
  async clearCache() {
    // Clear in-memory cache only
    this.rankingsCache.clear();
  }
}

export default RankHistoryService;