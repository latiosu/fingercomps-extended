import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getCategories, getCompetitors, getProblems, getScores } from '../api/services/competitions';
import {
  computeCategoryTops,
  computeProblemStats,
  computeUserTableData
} from '../utils/dataProcessors';

// Create context
const CompetitionContext = createContext();

/**
 * Custom hook to use the competition context
 * @returns {Object} Competition context value
 */
export const useCompetition = () => {
  const context = useContext(CompetitionContext);
  if (!context) {
    throw new Error('useCompetition must be used within a CompetitionProvider');
  }
  return context;
};

/**
 * Competition context provider component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @param {string} props.competitionId - Competition ID
 * @returns {JSX.Element} Provider component
 */
export const CompetitionProvider = ({ children, competitionId }) => {
  // State for competition data
  const [categories, setCategories] = useState({});
  const [competitors, setCompetitors] = useState({});
  const [scores, setScores] = useState({});
  const [problems, setProblems] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCategoryCode, setSelectedCategoryCode] = useState("");

  // New loading state with progress tracking
  const [loadingState, setLoadingState] = useState({
    categories: { loading: false, progress: 0, complete: false, error: null },
    competitors: { loading: false, progress: 0, complete: false, error: null },
    scores: { loading: false, progress: 0, complete: false, error: null },
    problems: { loading: false, progress: 0, complete: false, error: null }
  });

  // Calculate overall loading progress (0-100)
  const loadingProgress = useMemo(() => {
    const { categories, competitors, scores, problems } = loadingState;
    const totalProgress = categories.progress + competitors.progress + scores.progress + problems.progress;
    const progress = Math.round(totalProgress / 4);

    // Set loading to false when progress reaches 100%
    if (progress >= 100 && loading) {
      // Use setTimeout to avoid state update during render
      setTimeout(() => setLoading(false), 0);
    }

    return progress;
  }, [loadingState, loading]);

  // Determine if any data is available for display
  const partialDataAvailable = useMemo(() => {
    return Object.keys(categories).length > 0 || Object.keys(competitors).length > 0;
  }, [categories, competitors]);

  // Function to fetch competition data with progress tracking
  const fetchCompetitionData = useCallback(async () => {
    if (!competitionId) return;

    // Clear state to avoid mixing data between competitions
    setCategories({});
    setCompetitors({});
    setScores({});
    setProblems({});

    setLoading(true);
    setError(null);

    // Initialize loading state for all data types
    setLoadingState({
      categories: { loading: true, progress: 0, complete: false, error: null },
      competitors: { loading: true, progress: 0, complete: false, error: null },
      scores: { loading: true, progress: 0, complete: false, error: null },
      problems: { loading: true, progress: 0, complete: false, error: null }
    });

    try {
      // Fetch categories
      try {
        setLoadingState(prev => ({
          ...prev,
          categories: { ...prev.categories, progress: 10 }
        }));

        const categoriesData = await getCategories(competitionId);

        setLoadingState(prev => ({
          ...prev,
          categories: { loading: false, progress: 100, complete: true, error: null }
        }));

        setCategories(categoriesData);
      } catch (err) {
        setLoadingState(prev => ({
          ...prev,
          categories: { loading: false, progress: 0, complete: false, error: err.message }
        }));
        console.error("Error fetching categories:", err);
      }

      // Fetch competitors
      try {
        setLoadingState(prev => ({
          ...prev,
          competitors: { ...prev.competitors, progress: 10 }
        }));

        const competitorsData = await getCompetitors(competitionId);

        setLoadingState(prev => ({
          ...prev,
          competitors: { loading: false, progress: 100, complete: true, error: null }
        }));

        setCompetitors(competitorsData);
      } catch (err) {
        setLoadingState(prev => ({
          ...prev,
          competitors: { loading: false, progress: 0, complete: false, error: err.message }
        }));
        console.error("Error fetching competitors:", err);
      }

      // Fetch scores
      try {
        setLoadingState(prev => ({
          ...prev,
          scores: { ...prev.scores, progress: 10 }
        }));

        const scoresData = await getScores(competitionId);

        setLoadingState(prev => ({
          ...prev,
          scores: { loading: false, progress: 100, complete: true, error: null }
        }));

        setScores(scoresData);
      } catch (err) {
        setLoadingState(prev => ({
          ...prev,
          scores: { loading: false, progress: 0, complete: false, error: err.message }
        }));
        console.error("Error fetching scores:", err);
      }

      // Fetch problems
      try {
        setLoadingState(prev => ({
          ...prev,
          problems: { ...prev.problems, progress: 10 }
        }));

        const problemsData = await getProblems(competitionId);

        setLoadingState(prev => ({
          ...prev,
          problems: { loading: false, progress: 100, complete: true, error: null }
        }));

        setProblems(problemsData);
      } catch (err) {
        setLoadingState(prev => ({
          ...prev,
          problems: { loading: false, progress: 0, complete: false, error: err.message }
        }));
        console.error("Error fetching problems:", err);
      }

    } catch (err) {
      setError(err.message);
      console.error("Error fetching competition data:", err);
    } finally {
      // Set loading to false when all data types are complete or have errors
      setLoadingState(prevState => {
        const allComplete = Object.values(prevState).every(
          state => state.complete || state.error
        );

        if (allComplete) {
          // Use setTimeout to avoid state update during render
          setTimeout(() => setLoading(false), 0);
        }

        return prevState;
      });
    }
  }, [competitionId]);

  // Fetch competition data when competitionId changes
  useEffect(() => {
    fetchCompetitionData();
  }, [fetchCompetitionData]);

  // Calculate processed data when raw data changes
  const processedData = useMemo(() => {
    if (Object.keys(categories).length && Object.keys(competitors).length) {
      const userData = computeUserTableData(categories, competitors, problems, scores);
      computeProblemStats(scores, problems, categories, competitors);
      return userData;
    }
    return [];
  }, [categories, competitors, problems, scores]);

  // No need for an effect to update derived state

  // Calculate category tops
  const categoryTops = useMemo(() =>
    computeCategoryTops(categories, scores),
    [categories, scores]
  );

  // Function to count competitors in a category
  const countCompetitors = useCallback((category) => {
    const minScoresToCount = 1; // TODO: initialize to 50% pumpfestTopScores
    const count = categoryTops[category]?.reduce(
      (acc, curr) => (curr >= minScoresToCount) ? acc + 1 : acc, 0
    ) || 0;
    return count/100;
  }, [categoryTops]);

  // Function to get sorted user table data
  const getSortedUserTableData = useCallback((data, direction) => {
    return [...data].sort((a, b) =>
      direction === 'asc' ? a.total - b.total : b.total - a.total
    );
  }, []);

  // Compute last score date for a selected category
  const lastSubmittedScore = useMemo(() => {
    const filteredScores = Object.values(scores).flat()
      .filter(score => selectedCategoryCode ? score.category === selectedCategoryCode : true)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Sort in descending order
    return filteredScores.length > 0 ? filteredScores[0] : null;
  }, [scores, selectedCategoryCode]);

  // Set selected category code
  const updateSelectedCategoryCode = useCallback((code) => {
    setSelectedCategoryCode(code);
  }, []);

  // Context value
  const value = {
    categories,
    competitors,
    scores,
    problems,
    userTableData: processedData, // Use computed value directly
    categoryTops,
    loading,
    loadingProgress,
    loadingState,
    partialDataAvailable,
    error,
    lastSubmittedScore, // Already using computed value
    selectedCategoryCode,
    countCompetitors,
    sortUserTableData: (direction) => getSortedUserTableData(processedData, direction),
    updateSelectedCategoryCode
  };

  return (
    <CompetitionContext.Provider value={value}>
      {children}
    </CompetitionContext.Provider>
  );
};

export default CompetitionContext;