import { computeUserTableData } from '../utils/dataProcessors';

/**
 * Service for managing rank history calculations and caching
 */
class RankHistoryService {
  /**
   * Creates a new RankHistoryService instance
   * @param {Object} categories - Categories data
   * @param {Object} competitors - Competitors data
   * @param {Object} problems - Problems data
   * @param {Object} scores - Scores data
   * @param {string} competitionId - Competition ID
   */
  constructor(categories, competitors, problems, scores, competitionId) {
    this.categories = categories;
    this.competitors = competitors;
    this.problems = problems;
    this.scores = scores;
    this.competitionId = competitionId;
    
    // Create a timeline of all score events
    this.timeline = this._buildTimeline();
    
    // In-memory cache for fastest access during current session
    this.rankingsCache = new Map();
    
    // Initialize IndexedDB
    this._initDatabase();
  }
  
  /**
   * Builds a timeline of all score events
   * @returns {Array} Sorted array of score events
   * @private
   */
  _buildTimeline() {
    const events = [];
    
    Object.entries(this.scores).forEach(([competitorNo, competitorScores]) => {
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
   * Initializes the IndexedDB database
   * @returns {Promise} Promise that resolves when the database is initialized
   * @private
   */
  async _initDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('RankHistoryDB', 1);
      
      // Handle database upgrade (first time or version change)
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object store for rankings if it doesn't exist
        if (!db.objectStoreNames.contains('rankings')) {
          const rankingsStore = db.createObjectStore('rankings', { keyPath: 'id' });
          // Create indexes for efficient queries
          rankingsStore.createIndex('competitionId', 'competitionId', { unique: false });
          rankingsStore.createIndex('timestamp', 'timestamp', { unique: false });
          rankingsStore.createIndex('compTimestamp', ['competitionId', 'timestamp'], { unique: true });
        }
      };
      
      request.onsuccess = (event) => {
        this.db = event.target.result;
        console.log('IndexedDB initialized successfully');
        this._loadCacheFromIndexedDB();
        resolve();
      };
      
      request.onerror = (event) => {
        console.error('Error initializing IndexedDB:', event.target.error);
        reject(event.target.error);
      };
    });
  }
  
  /**
   * Loads cached rankings from IndexedDB
   * @private
   */
  async _loadCacheFromIndexedDB() {
    if (!this.db) return;
    
    try {
      const transaction = this.db.transaction(['rankings'], 'readonly');
      const store = transaction.objectStore('rankings');
      const index = store.index('competitionId');
      
      // Get all rankings for this competition
      const request = index.getAll(this.competitionId);
      
      request.onsuccess = (event) => {
        const rankings = event.target.result;
        
        // Populate in-memory cache
        rankings.forEach(entry => {
          this.rankingsCache.set(entry.timestamp, entry.data);
        });
        
        console.log(`Loaded ${this.rankingsCache.size} cached rankings from IndexedDB`);
      };
      
      request.onerror = (event) => {
        console.error('Error loading rankings from IndexedDB:', event.target.error);
      };
    } catch (error) {
      console.error('Error accessing IndexedDB:', error);
    }
  }
  
  /**
   * Saves rankings to IndexedDB
   * @param {string} timestamp - ISO string timestamp
   * @param {Array} rankings - Rankings data to save
   * @private
   */
  async _saveRankingsToIndexedDB(timestamp, rankings) {
    if (!this.db) return;
    
    try {
      const transaction = this.db.transaction(['rankings'], 'readwrite');
      const store = transaction.objectStore('rankings');
      
      // Create a unique ID for this entry
      const id = `${this.competitionId}_${timestamp}`;
      
      // Store the rankings
      const request = store.put({
        id,
        competitionId: this.competitionId,
        timestamp,
        data: rankings,
        createdAt: new Date().toISOString()
      });
      
      request.onsuccess = () => {
        console.log(`Saved rankings for ${timestamp} to IndexedDB`);
      };
      
      request.onerror = (event) => {
        console.error('Error saving rankings to IndexedDB:', event.target.error);
      };
      
      // Cleanup old entries to manage database size
      this._cleanupOldEntries();
    } catch (error) {
      console.error('Error accessing IndexedDB for saving:', error);
    }
  }
  
  /**
   * Cleans up old entries to manage database size
   * Keeps only the 100 most recent entries per competition
   * @private
   */
  async _cleanupOldEntries() {
    if (!this.db) return;
    
    try {
      const transaction = this.db.transaction(['rankings'], 'readwrite');
      const store = transaction.objectStore('rankings');
      const index = store.index('compTimestamp');
      
      // Get all entries for this competition, sorted by timestamp
      const request = index.openCursor([this.competitionId, ''], 'prev');
      
      let count = 0;
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          count++;
          
          // Delete entries beyond the limit (keep 100 most recent)
          if (count > 100) {
            cursor.delete();
          }
          
          cursor.continue();
        }
      };
      
      request.onerror = (event) => {
        console.error('Error cleaning up old entries:', event.target.error);
      };
    } catch (error) {
      console.error('Error accessing IndexedDB for cleanup:', error);
    }
  }
  
  /**
   * Gets rankings at a specific point in time
   * @param {Date} timestamp - Target time
   * @param {string} [categoryFilter] - Optional category filter
   * @returns {Promise<Array>} Rankings at that time
   */
  async getRankingsAtTime(timestamp, categoryFilter = '') {
    const cacheKey = `${timestamp.toISOString()}_${categoryFilter}`;
    
    // Check in-memory cache first for fastest access
    if (this.rankingsCache.has(cacheKey)) {
      return this.rankingsCache.get(cacheKey);
    }
    
    // If not in memory, try to get from IndexedDB
    if (this.db) {
      try {
        const rankings = await this._getRankingsFromIndexedDB(cacheKey);
        if (rankings) {
          // Add to in-memory cache and return
          this.rankingsCache.set(cacheKey, rankings);
          return rankings;
        }
      } catch (error) {
        console.error('Error retrieving from IndexedDB:', error);
        // Continue to calculate if there's an error
      }
    }
    
    // If not in IndexedDB, calculate rankings
    const filteredScores = {};
    
    Object.entries(this.scores).forEach(([competitorNo, competitorScores]) => {
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
    
    // Cache the result in memory
    this.rankingsCache.set(cacheKey, rankings);
    
    // Save to IndexedDB asynchronously
    this._saveRankingsToIndexedDB(cacheKey, rankings);
    
    return rankings;
  }
  
  /**
   * Gets rankings from IndexedDB
   * @param {string} timestamp - ISO string timestamp
   * @returns {Promise<Array|null>} Rankings or null if not found
   * @private
   */
  async _getRankingsFromIndexedDB(timestamp) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve(null);
        return;
      }
      
      try {
        const transaction = this.db.transaction(['rankings'], 'readonly');
        const store = transaction.objectStore('rankings');
        const index = store.index('compTimestamp');
        
        const request = index.get([this.competitionId, timestamp]);
        
        request.onsuccess = (event) => {
          const result = event.target.result;
          if (result) {
            resolve(result.data);
          } else {
            resolve(null);
          }
        };
        
        request.onerror = (event) => {
          reject(event.target.error);
        };
      } catch (error) {
        reject(error);
      }
    });
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
   * @returns {Promise<Array>} Rankings with change information
   */
  async getRankChanges(currentTime, previousTime, categoryFilter = '') {
    const currentRankings = await this.getRankingsAtTime(currentTime, categoryFilter);
    const previousRankings = await this.getRankingsAtTime(previousTime, categoryFilter);
    
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
      
      const rankChange = previous.rank - current.rank;
      
      return {
        ...current,
        rankChange,
        previousRank: previous.rank,
        scoreChange: current.total - previous.total
      };
    });
  }
  
  /**
   * Gets rank history for a specific competitor
   * @param {string} competitorNo - Competitor number
   * @param {string} interval - 'hourly', 'daily', 'weekly'
   * @param {string} [categoryFilter] - Optional category filter
   * @returns {Promise<Array>} Rank history
   */
  async getCompetitorRankHistory(competitorNo, interval = 'daily', categoryFilter = '') {
    const timepoints = this.getKeyTimepoints(interval);
    const history = [];
    
    for (const timepoint of timepoints) {
      const rankings = await this.getRankingsAtTime(timepoint, categoryFilter);
      const competitor = rankings.find(r => r.competitorNo === competitorNo);
      
      if (competitor) {
        history.push({
          timestamp: timepoint,
          rank: competitor.rank,
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
   * @returns {Promise<Object>} Top risers and fallers
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
   * Clears the cache for this competition
   */
  async clearCache() {
    // Clear in-memory cache
    this.rankingsCache.clear();
    
    // Clear IndexedDB entries for this competition
    if (this.db) {
      try {
        const transaction = this.db.transaction(['rankings'], 'readwrite');
        const store = transaction.objectStore('rankings');
        const index = store.index('competitionId');
        
        const request = index.openCursor(this.competitionId);
        
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          }
        };
        
        console.log('Rankings cache cleared from IndexedDB');
      } catch (error) {
        console.error('Error clearing IndexedDB cache:', error);
      }
    }
  }
}

export default RankHistoryService;