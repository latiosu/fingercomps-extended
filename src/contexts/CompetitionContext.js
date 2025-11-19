import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getCategories, getCompetitors, getProblems, getQualificationScores, getFinalsScores } from '../api/services/competitions';
import { getAllProblemPhotos, uploadProblemPhoto as uploadPhoto } from '../api/services/photos';
import {
  computeCategoryTops,
  computeFinalsScoreboardData,
  computeProblemStats,
  computeUserTableData
} from '../utils/dataProcessors';
import { useApp } from './AppContext';

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
  // Get selectedCategoryCode from AppContext
  const { selectedCategoryCode } = useApp();

  // State for competition data
  const [categories, setCategories] = useState({});
  const [competitors, setCompetitors] = useState({});
  const [qualificationScores, setQualificationScores] = useState({});
  const [finalsScores, setFinalsScores] = useState({});
  const [problems, setProblems] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // State for problem photos
  const [problemPhotos, setProblemPhotos] = useState({});
  const [photoOperationState, setPhotoOperationState] = useState({
    loading: false,
    operation: null, // 'fetch', 'upload', 'delete'
    progress: 0,
    error: null
  });

  // New loading state with progress tracking
  const [loadingState, setLoadingState] = useState({
    categories: { loading: false, progress: 0, complete: false, error: null },
    competitors: { loading: false, progress: 0, complete: false, error: null },
    qualificationScores: { loading: false, progress: 0, complete: false, error: null },
    finalsScores: { loading: false, progress: 0, complete: false, error: null },
    problems: { loading: false, progress: 0, complete: false, error: null },
    photos: { loading: false, progress: 0, complete: false, error: null }
  });

  // TODO: Separate finals scores loading from general scoreboard loading
  // Calculate overall loading progress (0-100)
  const loadingProgress = useMemo(() => {
    const { categories, competitors, qualificationScores, finalsScores, problems } = loadingState;
    const totalProgress = categories.progress + competitors.progress + qualificationScores.progress + finalsScores.progress + problems.progress;
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
    setQualificationScores({});
    setFinalsScores({});
    setProblems({});

    setLoading(true);
    setError(null);

    // Initialize loading state for all data types
    setLoadingState({
      categories: { loading: true, progress: 0, complete: false, error: null },
      competitors: { loading: true, progress: 0, complete: false, error: null },
      qualificationScores: { loading: true, progress: 0, complete: false, error: null },
      finalsScores: { loading: true, progress: 0, complete: false, error: null },
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

      // Fetch qualification scores
      try {
        setLoadingState(prev => ({
          ...prev,
          qualificationScores: { ...prev.qualificationScores, progress: 10 }
        }));

        const scoresData = await getQualificationScores(competitionId);

        setLoadingState(prev => ({
          ...prev,
          qualificationScores: { loading: false, progress: 100, complete: true, error: null }
        }));

        setQualificationScores(scoresData);
      } catch (err) {
        setLoadingState(prev => ({
          ...prev,
          qualificationScores: { loading: false, progress: 0, complete: false, error: err.message }
        }));
        console.error("Error fetching scores:", err);
      }

      // Fetch finals scores
      try {
        setLoadingState(prev => ({
          ...prev,
          finalsScores: { ...prev.finalsScores, progress: 10 }
        }));

        const scoresData = await getFinalsScores(competitionId);

        setLoadingState(prev => ({
          ...prev,
          finalsScores: { loading: false, progress: 100, complete: true, error: null }
        }));

        setFinalsScores(scoresData);
      } catch (err) {
        setLoadingState(prev => ({
          ...prev,
          finalsScores: { loading: false, progress: 0, complete: false, error: err.message }
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

  // Function to fetch problem photos
  const fetchCompetitionPhotos = useCallback(async () => {
    if (!competitionId) return;

    setLoadingState(prev => ({
      ...prev,
      photos: { loading: true, progress: 10, complete: false, error: null }
    }));

    setPhotoOperationState({
      loading: true,
      operation: 'fetch',
      progress: 10,
      error: null
    });

    try {
      setLoadingState(prev => ({
        ...prev,
        photos: { ...prev.photos, progress: 50 }
      }));

      setPhotoOperationState(prev => ({
        ...prev,
        progress: 50
      }));

      const photosData = await getAllProblemPhotos(competitionId);
      setProblemPhotos(photosData);

      setLoadingState(prev => ({
        ...prev,
        photos: { loading: false, progress: 100, complete: true, error: null }
      }));

      setPhotoOperationState({
        loading: false,
        operation: 'fetch',
        progress: 100,
        error: null
      });
    } catch (error) {
      console.error("Error fetching problem photos:", error);

      setLoadingState(prev => ({
        ...prev,
        photos: { loading: false, progress: 0, complete: false, error: error.message }
      }));

      setPhotoOperationState({
        loading: false,
        operation: 'fetch',
        progress: 0,
        error: error.message
      });
    }
  }, [competitionId]);

  // Function to upload a problem photo
  const handleUploadPhoto = async (climbNo, file) => {
    try {
      setPhotoOperationState({
        loading: true,
        operation: 'upload',
        progress: 10,
        error: null
      });

      // Get current user's competitor number or use a default
      const currentCompetitorNo = Object.keys(competitors)[0] || 'anonymous';

      setPhotoOperationState(prev => ({
        ...prev,
        progress: 30
      }));

      // Upload the photo
      const photoData = await uploadPhoto(
        competitionId,
        climbNo,
        file,
        currentCompetitorNo
      );

      setPhotoOperationState(prev => ({
        ...prev,
        progress: 70
      }));

      // Update state with new photo
      setProblemPhotos(prev => {
        const newPhotos = { ...prev };
        if (!newPhotos[climbNo]) {
          newPhotos[climbNo] = [];
        }
        newPhotos[climbNo] = [photoData, ...(newPhotos[climbNo] || [])];
        return newPhotos;
      });

      setPhotoOperationState({
        loading: false,
        operation: 'upload',
        progress: 100,
        error: null
      });

      return photoData;
    } catch (error) {
      console.error("Error uploading photo:", error);

      setPhotoOperationState({
        loading: false,
        operation: 'upload',
        progress: 0,
        error: error.message
      });

      throw error; // Re-throw to be handled by the component
    }
  };

  // Fetch competition data when competitionId changes
  useEffect(() => {
    fetchCompetitionData();
  }, [fetchCompetitionData]);

  // Fetch photos when competition ID changes
  useEffect(() => {
    fetchCompetitionPhotos();
  }, [fetchCompetitionPhotos]);

  // Calculate processed data when raw data changes
  const processedData = useMemo(() => {
    if (Object.keys(categories).length && Object.keys(competitors).length) {
      const userData = computeUserTableData(categories, competitors, problems, qualificationScores);
      computeProblemStats(qualificationScores, problems, categories, competitors);
      return userData;
    }
    return [];
  }, [categories, competitors, problems, qualificationScores]);

  // TODO: Consider splitting this to reduce load
  const finalsScoreboardData = useMemo(() => {
    return computeFinalsScoreboardData(categories, competitors, finalsScores);
  }, [categories, competitors, finalsScores]);

  // No need for an effect to update derived state

  // Calculate category tops
  const categoryTops = useMemo(() =>
    computeCategoryTops(categories, qualificationScores),
    [categories, qualificationScores]
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

  // Compute last score based on selected category
  const lastSubmittedScore = useMemo(() => {
    const filteredScores = Object.values(qualificationScores).flat()
      .filter(score => selectedCategoryCode ? (competitors[score.competitorNo]?.category === selectedCategoryCode) : true)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Sort in descending order

    return filteredScores.length > 0 ? filteredScores[0] : null;
  }, [selectedCategoryCode, qualificationScores, competitors]);

  // Context value
  const value = {
    competitionId, // Expose competitionId in the context
    categories,
    competitors,
    qualificationScores,
    finalsScores,
    problems,
    userTableData: processedData, // Use computed value directly
    finalsScoreboardData,
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
    // Photo related values
    problemPhotos,
    photoOperationState,
    uploadProblemPhoto: handleUploadPhoto,
    refreshPhotos: fetchCompetitionPhotos
  };

  return (
    <CompetitionContext.Provider value={value}>
      {children}
    </CompetitionContext.Provider>
  );
};

export default CompetitionContext;