import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getCategories, getCompetitors, getProblems, getQualificationScores, getFinalsScores } from '../api/services/competitions';
import { getAllProblemPhotos, uploadProblemPhoto as uploadPhoto } from '../api/services/photos';
import {
  computeCategoryTops,
  computeFinalsScoreboardData,
  computeProblemsWithStats,
  computeUserTableData
} from '../utils/dataProcessors';
import { useApp } from './AppContext';

// Create context
const CompetitionContext = createContext();

const DATA_LOADING_KEYS = [
  'categories',
  'competitors',
  'qualificationScores',
  'finalsScores',
  'problems',
];

const createLoadingEntry = (overrides = {}) => ({
  loading: false,
  progress: 0,
  complete: false,
  error: null,
  ...overrides,
});

const createLoadingState = (overrides = {}) => ({
  categories: createLoadingEntry(overrides.categories),
  competitors: createLoadingEntry(overrides.competitors),
  qualificationScores: createLoadingEntry(overrides.qualificationScores),
  finalsScores: createLoadingEntry(overrides.finalsScores),
  problems: createLoadingEntry(overrides.problems),
  photos: createLoadingEntry(overrides.photos),
});

const getErrorMessage = (error) => error?.message || String(error);

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
 * @param {string} [props.priorityCategoryCode] - Optional category code to load first
 * @returns {JSX.Element} Provider component
 */
export const CompetitionProvider = ({ children, competitionId, priorityCategoryCode }) => {
  // Get selectedCategoryCode from AppContext
  const { selectedCategoryCode, loading: appLoading } = useApp();

  const savedCategoryCode = useMemo(() => {
    if (!competitionId || priorityCategoryCode !== undefined) return "";

    try {
      return localStorage.getItem(`categoryCode_${competitionId}`) || "";
    } catch (error) {
      console.warn("Unable to access localStorage:", error);
      return "";
    }
  }, [competitionId, priorityCategoryCode]);

  const activeCategoryCode = priorityCategoryCode !== undefined
    ? (priorityCategoryCode || "")
    : ((!selectedCategoryCode && appLoading) ? savedCategoryCode : (selectedCategoryCode || ""));

  // State for competition data
  const [categories, setCategories] = useState({});
  const [competitors, setCompetitors] = useState({});
  const [qualificationScores, setQualificationScores] = useState({});
  const [finalsScores, setFinalsScores] = useState({});
  const [problems, setProblems] = useState({});
  const [loading, setLoading] = useState(false);
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const [baseDataLoaded, setBaseDataLoaded] = useState(false);
  const [fullDataLoaded, setFullDataLoaded] = useState(false);
  const [loadedCategoryCodes, setLoadedCategoryCodes] = useState(() => new Set());
  const [error, setError] = useState(null);

  const loadRequestRef = useRef(0);
  const currentCompetitionRef = useRef(null);
  const activeCategoryCodeRef = useRef(activeCategoryCode);
  const baseDataLoadedRef = useRef(false);
  const fullDataLoadedRef = useRef(false);
  const fullLoadStartedRef = useRef(false);
  const loadedCategoryCodesRef = useRef(new Set());

  // State for problem photos
  const [problemPhotos, setProblemPhotos] = useState({});
  const [photoOperationState, setPhotoOperationState] = useState({
    loading: false,
    operation: null, // 'fetch', 'upload', 'delete'
    progress: 0,
    error: null
  });

  // New loading state with progress tracking
  const [loadingState, setLoadingState] = useState(() => createLoadingState());

  // TODO: Separate finals scores loading from general scoreboard loading
  // Calculate overall loading progress (0-100)
  const loadingProgress = useMemo(() => {
    const totalProgress = DATA_LOADING_KEYS.reduce(
      (sum, key) => sum + (loadingState[key]?.progress || 0),
      0
    );
    return Math.round(totalProgress / DATA_LOADING_KEYS.length);
  }, [loadingState]);

  // Determine if any data is available for display
  const partialDataAvailable = useMemo(() => {
    if (!Object.keys(categories).length || !Object.keys(problems).length) {
      return false;
    }

    if (!activeCategoryCode) {
      return fullDataLoaded;
    }

    return fullDataLoaded || loadedCategoryCodes.has(activeCategoryCode);
  }, [
    activeCategoryCode,
    categories,
    fullDataLoaded,
    loadedCategoryCodes,
    problems,
  ]);

  const isCurrentRequest = useCallback((requestId) => (
    loadRequestRef.current === requestId &&
    currentCompetitionRef.current === competitionId
  ), [competitionId]);

  const updateLoadingEntry = useCallback((key, patch) => {
    setLoadingState(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        ...patch,
      },
    }));
  }, []);

  const addLoadedCategoryCode = useCallback((categoryCode) => {
    loadedCategoryCodesRef.current = new Set([
      ...loadedCategoryCodesRef.current,
      categoryCode,
    ]);
    setLoadedCategoryCodes(new Set(loadedCategoryCodesRef.current));
  }, []);

  const loadCategorySlice = useCallback(async (requestId, categoryCode) => {
    if (!competitionId || !categoryCode || loadedCategoryCodesRef.current.has(categoryCode)) {
      if (
        categoryCode &&
        loadedCategoryCodesRef.current.has(categoryCode) &&
        baseDataLoadedRef.current &&
        activeCategoryCodeRef.current === categoryCode
      ) {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setError(null);
    ['competitors', 'qualificationScores', 'finalsScores'].forEach((key) => {
      updateLoadingEntry(key, {
        loading: true,
        progress: 10,
        complete: false,
        error: null,
      });
    });

    try {
      const [competitorsData, scoresData, finalsScoresData] = await Promise.all([
        getCompetitors(competitionId, categoryCode),
        getQualificationScores(competitionId, categoryCode),
        getFinalsScores(competitionId, categoryCode),
      ]);

      if (!isCurrentRequest(requestId)) return;

      setCompetitors(prev => ({
        ...prev,
        ...competitorsData,
      }));
      setQualificationScores(prev => ({
        ...prev,
        ...scoresData,
      }));
      setFinalsScores(prev => ({
        ...prev,
        ...finalsScoresData,
      }));

      addLoadedCategoryCode(categoryCode);

      const stillHydrating = fullLoadStartedRef.current && !fullDataLoadedRef.current;
      ['competitors', 'qualificationScores', 'finalsScores'].forEach((key) => {
        updateLoadingEntry(key, {
          loading: stillHydrating,
          progress: stillHydrating ? 50 : 100,
          complete: !stillHydrating,
          error: null,
        });
      });

      if (baseDataLoadedRef.current && activeCategoryCodeRef.current === categoryCode) {
        setLoading(false);
      }
    } catch (err) {
      if (!isCurrentRequest(requestId)) return;

      const message = getErrorMessage(err);
      ['competitors', 'qualificationScores', 'finalsScores'].forEach((key) => {
        updateLoadingEntry(key, {
          loading: false,
          progress: 0,
          complete: false,
          error: message,
        });
      });
      setError(message);
      setLoading(false);
      console.error(`Error fetching category data for ${categoryCode}:`, err);
    }
  }, [
    addLoadedCategoryCode,
    competitionId,
    isCurrentRequest,
    updateLoadingEntry,
  ]);

  const startFullHydration = useCallback(async (requestId) => {
    if (!competitionId || fullLoadStartedRef.current) return;

    fullLoadStartedRef.current = true;
    setBackgroundLoading(true);
    ['competitors', 'qualificationScores', 'finalsScores'].forEach((key) => {
      updateLoadingEntry(key, {
        loading: true,
        progress: 10,
        complete: false,
        error: null,
      });
    });

    try {
      const [competitorsData, scoresData, finalsScoresData] = await Promise.all([
        getCompetitors(competitionId),
        getQualificationScores(competitionId),
        getFinalsScores(competitionId),
      ]);

      if (!isCurrentRequest(requestId)) return;

      setCompetitors(competitorsData);
      setQualificationScores(scoresData);
      setFinalsScores(finalsScoresData);
      setFullDataLoaded(true);
      fullDataLoadedRef.current = true;
      setBackgroundLoading(false);

      ['competitors', 'qualificationScores', 'finalsScores'].forEach((key) => {
        updateLoadingEntry(key, {
          loading: false,
          progress: 100,
          complete: true,
          error: null,
        });
      });

      if (baseDataLoadedRef.current) {
        setLoading(false);
      }
    } catch (err) {
      if (!isCurrentRequest(requestId)) return;

      const message = getErrorMessage(err);
      setBackgroundLoading(false);
      setError(message);
      ['competitors', 'qualificationScores', 'finalsScores'].forEach((key) => {
        updateLoadingEntry(key, {
          loading: false,
          progress: 0,
          complete: false,
          error: message,
        });
      });
      setLoading(false);
      console.error("Error hydrating full competition data:", err);
    }
  }, [
    competitionId,
    isCurrentRequest,
    updateLoadingEntry,
  ]);

  // Function to refresh finals scores only
  const refreshFinalsScores = useCallback(async () => {
    if (!competitionId) return;

    try {
      const categoryCode = priorityCategoryCode !== undefined ? activeCategoryCode : "";

      setLoadingState(prev => ({
        ...prev,
        finalsScores: { ...prev.finalsScores, loading: true, progress: 10 }
      }));

      const scoresData = await getFinalsScores(competitionId, categoryCode);

      setLoadingState(prev => ({
        ...prev,
        finalsScores: { loading: false, progress: 100, complete: true, error: null }
      }));

      setFinalsScores(prev => (
        categoryCode
          ? { ...prev, ...scoresData }
          : scoresData
      ));
    } catch (err) {
      setLoadingState(prev => ({
        ...prev,
        finalsScores: { loading: false, progress: 0, complete: false, error: getErrorMessage(err) }
      }));
      console.error("Error refreshing finals scores:", err);
    }
  }, [activeCategoryCode, competitionId, priorityCategoryCode]);

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

  useEffect(() => {
    activeCategoryCodeRef.current = activeCategoryCode;
  }, [activeCategoryCode]);

  useEffect(() => {
    baseDataLoadedRef.current = baseDataLoaded;
  }, [baseDataLoaded]);

  useEffect(() => {
    fullDataLoadedRef.current = fullDataLoaded;
  }, [fullDataLoaded]);

  // Fetch base competition data when competitionId changes.
  useEffect(() => {
    if (!competitionId) return;

    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    currentCompetitionRef.current = competitionId;
    baseDataLoadedRef.current = false;
    fullDataLoadedRef.current = false;
    fullLoadStartedRef.current = false;
    loadedCategoryCodesRef.current = new Set();

    setCategories({});
    setCompetitors({});
    setQualificationScores({});
    setFinalsScores({});
    setProblems({});
    setLoadedCategoryCodes(new Set());
    setBaseDataLoaded(false);
    setFullDataLoaded(false);
    setBackgroundLoading(false);
    setLoading(true);
    setError(null);
    setLoadingState(createLoadingState({
      categories: { loading: true, progress: 10, complete: false, error: null },
      problems: { loading: true, progress: 10, complete: false, error: null },
    }));

    const loadBaseData = async () => {
      try {
        const [categoriesData, problemsData] = await Promise.all([
          getCategories(competitionId),
          getProblems(competitionId),
        ]);

        if (!isCurrentRequest(requestId)) return;

        setCategories(categoriesData);
        setProblems(problemsData);
        setBaseDataLoaded(true);
        baseDataLoadedRef.current = true;
        setLoadingState(prev => ({
          ...prev,
          categories: { loading: false, progress: 100, complete: true, error: null },
          problems: { loading: false, progress: 100, complete: true, error: null },
        }));

        const currentCategoryCode = activeCategoryCodeRef.current;
        const categoryReady = currentCategoryCode
          ? loadedCategoryCodesRef.current.has(currentCategoryCode)
          : fullDataLoadedRef.current;

        if (categoryReady) {
          setLoading(false);
        }
      } catch (err) {
        if (!isCurrentRequest(requestId)) return;

        const message = getErrorMessage(err);
        setError(message);
        setLoading(false);
        setLoadingState(prev => ({
          ...prev,
          categories: {
            ...prev.categories,
            loading: false,
            progress: 0,
            complete: false,
            error: message,
          },
          problems: {
            ...prev.problems,
            loading: false,
            progress: 0,
            complete: false,
            error: message,
          },
        }));
        console.error("Error fetching base competition data:", err);
      }
    };

    loadBaseData();
  }, [competitionId, isCurrentRequest]);

  // Fetch the visible category first, then hydrate the full competition data.
  useEffect(() => {
    if (!competitionId || currentCompetitionRef.current !== competitionId) return;

    const requestId = loadRequestRef.current;
    activeCategoryCodeRef.current = activeCategoryCode;

    if (fullDataLoadedRef.current) {
      setLoading(false);
      return;
    }

    if (activeCategoryCode) {
      if (loadedCategoryCodesRef.current.has(activeCategoryCode)) {
        if (baseDataLoadedRef.current) {
          setLoading(false);
        }
      } else {
        loadCategorySlice(requestId, activeCategoryCode);
      }

      startFullHydration(requestId);
      return;
    }

    setLoading(true);
    startFullHydration(requestId);
  }, [
    activeCategoryCode,
    competitionId,
    loadCategorySlice,
    startFullHydration,
  ]);

  // Fetch photos when competition ID changes
  useEffect(() => {
    fetchCompetitionPhotos();
  }, [fetchCompetitionPhotos]);

  // Calculate processed data when raw data changes
  const processedData = useMemo(() => {
    if (Object.keys(categories).length && Object.keys(competitors).length) {
      const userData = computeUserTableData(categories, competitors, problems, qualificationScores);
      return userData;
    }
    return [];
  }, [categories, competitors, problems, qualificationScores]);

  const problemsWithStats = useMemo(() => {
    if (
      Object.keys(categories).length &&
      Object.keys(problems).length
    ) {
      return computeProblemsWithStats(
        qualificationScores,
        problems,
        categories,
        competitors
      );
    }

    return problems;
  }, [
    categories,
    competitors,
    problems,
    qualificationScores,
  ]);

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
    problems: problemsWithStats,
    userTableData: processedData, // Use computed value directly
    finalsScoreboardData,
    categoryTops,
    loading,
    backgroundLoading,
    fullDataLoaded,
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
    refreshPhotos: fetchCompetitionPhotos,
    // Finals scores refresh
    refreshFinalsScores
  };

  return (
    <CompetitionContext.Provider value={value}>
      {children}
    </CompetitionContext.Provider>
  );
};

export default CompetitionContext;
