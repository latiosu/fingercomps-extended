import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getCompetitionData } from '../api/services/competitions';
import { 
  computeUserTableData, 
  computeProblemStats, 
  computeCategoryTops 
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

  // Function to fetch competition data
  const fetchCompetitionData = useCallback(async () => {
    if (!competitionId) return;

    // Clear state to avoid mixing data between competitions
    setCategories({});
    setCompetitors({});
    setScores({});
    setProblems({});

    setLoading(true);
    setError(null);
    
    try {
      const data = await getCompetitionData(competitionId);
      setCategories(data.categories);
      setCompetitors(data.competitors);
      setScores(data.scores);
      setProblems(data.problems);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching competition data:", err);
    } finally {
      setLoading(false);
    }
  }, [competitionId]);

  // Fetch competition data when competitionId changes
  useEffect(() => {
    console.time("fetchCompetitionData");
    fetchCompetitionData();
    console.timeEnd("fetchCompetitionData");
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