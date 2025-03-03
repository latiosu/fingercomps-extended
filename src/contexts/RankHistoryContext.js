import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import RankHistoryService from '../services/RankHistoryService';
import { useApp } from './AppContext';
import { useCompetition } from './CompetitionContext';

// Create context
const RankHistoryContext = createContext();

/**
 * Custom hook to use the rank history context
 * @returns {Object} Rank history context value
 */
export const useRankHistory = () => {
  const context = useContext(RankHistoryContext);
  if (!context) {
    throw new Error('useRankHistory must be used within a RankHistoryProvider');
  }
  return context;
};

/**
 * Rank history context provider component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} Provider component
 */
export const RankHistoryProvider = ({ children }) => {
  const { categories, competitors, problems, scores } = useCompetition();
  const { selectedCompId, selectedCategory, loading: appLoading } = useApp();
  
  // Initialize with a default value
  const [timeframe, setTimeframeState] = useState('daily');
  
  // Track the last competition ID we've loaded a timeframe for
  const lastCompIdRef = React.useRef(null);

  // Custom setter that also updates localStorage
  const setTimeframe = useCallback((newTimeframe) => {
    setTimeframeState(newTimeframe);
    if (selectedCompId) {
      localStorage.setItem(`timeframe_${selectedCompId}`, newTimeframe);
    }
  }, [selectedCompId]);

  const [rankChanges, setRankChanges] = useState([]);
  const [significantChanges, setSignificantChanges] = useState({ risers: [], fallers: [] });
  const [loading, setLoading] = useState(false);

  // Load timeframe from localStorage when competition changes or app loading completes
  useEffect(() => {
    // Only proceed if we have a competition ID, app loading is complete, and it's a different competition
    if (selectedCompId && !appLoading && lastCompIdRef.current !== selectedCompId) {
      const savedTimeframe = localStorage.getItem(`timeframe_${selectedCompId}`);
      if (savedTimeframe) {
        setTimeframeState(savedTimeframe);
      }
      // Update the ref to track the current competition ID
      lastCompIdRef.current = selectedCompId;
    }
  }, [selectedCompId, appLoading]);

  // Create the rank history service
  const rankHistoryService = useMemo(() => {
    if (Object.keys(categories).length && Object.keys(competitors).length && selectedCompId) {
      return new RankHistoryService(
        categories,
        competitors,
        problems,
        scores,
        selectedCompId
      );
    }
    return null;
  }, [categories, competitors, problems, scores, selectedCompId]);

  // Calculate current and previous timepoints based on selected timeframe
  const timepoints = useMemo(() => {
    const now = new Date();
    let previous;

    switch (timeframe) {
      case 'hourly':
        previous = new Date(now);
        previous.setHours(previous.getHours() - 1);
        break;
      case 'halfday':
        previous = new Date(now);
        previous.setHours(previous.getHours() - 12);
        break;
      case 'daily':
        previous = new Date(now);
        previous.setDate(previous.getDate() - 1);
        break;
      case 'threedays':
        previous = new Date(now);
        previous.setDate(previous.getDate() - 3);
        break;
      case 'weekly':
        previous = new Date(now);
        previous.setDate(previous.getDate() - 7);
        break;
      default:
        previous = new Date(now);
        previous.setDate(previous.getDate() - 1);
    }

    return { current: now, previous };
  }, [timeframe]);

  // Update rank changes when timeframe, service, or selected category changes
  useEffect(() => {
    const updateRankChanges = async () => {
      if (!rankHistoryService) return;

      setLoading(true);

      try {
        // Get rank changes
        const changes = await rankHistoryService.getRankChanges(
          timepoints.current,
          timepoints.previous,
          selectedCategory
        );

        setRankChanges(changes);

        // Get significant changes
        const significant = await rankHistoryService.getSignificantChanges(
          timepoints.current,
          timepoints.previous,
          3, // Threshold
          selectedCategory
        );

        setSignificantChanges(significant);
      } catch (error) {
        console.error('Error updating rank changes:', error);
      } finally {
        setLoading(false);
      }
    };

    updateRankChanges();
  }, [rankHistoryService, timepoints, timeframe, selectedCategory]);

  // Clear cache when competition changes
  useEffect(() => {
    return () => {
      // Cleanup when unmounting or when competition changes
      rankHistoryService?.clearCache();
    };
  }, [selectedCompId, rankHistoryService]);

  // Function to get competitor rank history
  const getCompetitorRankHistory = async (competitorNo) => {
    if (!rankHistoryService) return [];

    try {
      return await rankHistoryService.getCompetitorRankHistory(
        competitorNo,
        timeframe,
        selectedCategory
      );
    } catch (error) {
      console.error('Error getting competitor rank history:', error);
      return [];
    }
  };

  // Context value
  const value = {
    rankChanges,
    significantChanges,
    timeframe,
    setTimeframe,
    loading,
    getCompetitorRankHistory
  };

  return (
    <RankHistoryContext.Provider value={value}>
      {children}
    </RankHistoryContext.Provider>
  );
};

export default RankHistoryContext;