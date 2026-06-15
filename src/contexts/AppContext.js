import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getCompetitions } from '../api/services/competitions';
import { trackRawCountsFilterChanged } from '../utils/analytics';

// Create context
const AppContext = createContext();
const DISPLAY_SETTING_DEFAULT = true;

const getDisplayStorageKeys = (competitionId) => ({
  rawCounts: `raw_counts_filter_${competitionId}`,
  showOverallTopsFlashes: `show_overall_tops_flashes_${competitionId}`,
});

const getSavedDisplayBoolean = (storageKey) => {
  try {
    const savedValue = localStorage.getItem(storageKey);
    return savedValue !== null ? savedValue === "true" : DISPLAY_SETTING_DEFAULT;
  } catch (error) {
    console.warn("Unable to access localStorage:", error);
    return DISPLAY_SETTING_DEFAULT;
  }
};

const loadSavedDisplaySettings = (competitionId) => {
  if (!competitionId) {
    return {
      competitionId: "",
      showRawCounts: DISPLAY_SETTING_DEFAULT,
      showOverallTopsFlashes: DISPLAY_SETTING_DEFAULT,
    };
  }

  const storageKeys = getDisplayStorageKeys(competitionId);

  return {
    competitionId,
    showRawCounts: getSavedDisplayBoolean(storageKeys.rawCounts),
    showOverallTopsFlashes: getSavedDisplayBoolean(
      storageKeys.showOverallTopsFlashes
    ),
  };
};

/**
 * Custom hook to use the app context
 * @returns {Object} App context value
 */
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

/**
 * App context provider component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} Provider component
 */
export const AppProvider = ({ children }) => {
  // State for competitions
  const [comps, setComps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for selected competition
  const [selectedComp, setSelectedComp] = useState(() => {
    return localStorage.getItem('lastSelectedComp') || "";
  });
  const [selectedCompId, setSelectedCompId] = useState(() => {
    const compId = new URLSearchParams(window.location.search).get('compId');
    if (compId) {
      return compId;
    }
    return localStorage.getItem('lastSelectedCompId') || "";
  });
  const [compNotFoundMessage, setCompNotFoundMessage] = useState("");

  // Helper function to load saved category for a competition
  const loadSavedCategory = useCallback((compId) => {
    if (!compId) return { category: "", categoryCode: "" };

    const savedCategory = localStorage.getItem(`category_${compId}`) || "";
    const savedCategoryCode = localStorage.getItem(`categoryCode_${compId}`) || "";

    return { category: savedCategory, categoryCode: savedCategoryCode };
  }, []);

  // State for UI
  const [selectedCategory, setSelectedCategory] = useState(() => {
    const compId = localStorage.getItem('lastSelectedCompId');
    return loadSavedCategory(compId).category;
  });
  const [selectedCategoryCode, setSelectedCategoryCode] = useState(() => {
    const compId = localStorage.getItem('lastSelectedCompId');
    return loadSavedCategory(compId).categoryCode;
  });

  // Initialize focusView from localStorage if available, otherwise default to 'user'
  const [focusView, setFocusView] = useState(() => {
    const compId = localStorage.getItem('lastSelectedCompId');
    if (!compId) return 'user';
    return localStorage.getItem(`focusView_${compId}`) || 'user';
  });
  const [displaySettings, setDisplaySettings] = useState(() =>
    loadSavedDisplaySettings(selectedCompId)
  );
  const [limitScores, setLimitScores] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [recommendModalUser, setRecommendModalUser] = useState(null);
  const [whatIfModalUser, setWhatIfModalUser] = useState(null);

  useEffect(() => {
    if (focusView !== 'problems') return;

    setDisplaySettings(loadSavedDisplaySettings(selectedCompId));
  }, [focusView, selectedCompId]);

  useEffect(() => {
    if (
      focusView !== 'problems' ||
      !selectedCompId ||
      displaySettings.competitionId !== selectedCompId
    ) {
      return;
    }

    const { rawCounts } = getDisplayStorageKeys(selectedCompId);

    try {
      localStorage.setItem(rawCounts, displaySettings.showRawCounts.toString());
      trackRawCountsFilterChanged(displaySettings.showRawCounts, selectedCompId);
    } catch (error) {
      console.warn(
        "Unable to save raw counts preference to localStorage:",
        error
      );
    }
  }, [
    displaySettings.competitionId,
    displaySettings.showRawCounts,
    focusView,
    selectedCompId,
  ]);

  useEffect(() => {
    if (
      focusView !== 'problems' ||
      !selectedCompId ||
      displaySettings.competitionId !== selectedCompId
    ) {
      return;
    }

    const { showOverallTopsFlashes } = getDisplayStorageKeys(selectedCompId);

    try {
      localStorage.setItem(
        showOverallTopsFlashes,
        displaySettings.showOverallTopsFlashes.toString()
      );
    } catch (error) {
      console.warn(
        "Unable to save overall tops & flashes preference to localStorage:",
        error
      );
    }
  }, [
    displaySettings.competitionId,
    displaySettings.showOverallTopsFlashes,
    focusView,
    selectedCompId,
  ]);

  const setShowRawCounts = useCallback((showRawCounts) => {
    setDisplaySettings((currentSettings) => ({
      ...(selectedCompId && currentSettings.competitionId !== selectedCompId
        ? loadSavedDisplaySettings(selectedCompId)
        : currentSettings),
      showRawCounts,
    }));
  }, [selectedCompId]);

  const setShowOverallTopsFlashes = useCallback((showOverallTopsFlashes) => {
    setDisplaySettings((currentSettings) => ({
      ...(selectedCompId && currentSettings.competitionId !== selectedCompId
        ? loadSavedDisplaySettings(selectedCompId)
        : currentSettings),
      showOverallTopsFlashes,
    }));
  }, [selectedCompId]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Function to fetch competitions
  const fetchCompetitions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const availableComps = await getCompetitions();
      setComps(availableComps);

      // Check if previously selected competition still exists
      if (selectedCompId) {
        const compExists = availableComps.some(comp =>
          comp.document?.name.split('/').pop() === selectedCompId
        );

        if (!compExists) {
          setCompNotFoundMessage(`The competition "${selectedComp}" is no longer available for viewing as it has been archived.`);
          setSelectedComp("");
          setSelectedCompId("");
          localStorage.removeItem('lastSelectedComp');
          localStorage.removeItem('lastSelectedCompId');
        }
      }

      // Load saved category for this competition
      const { category, categoryCode } = loadSavedCategory(selectedCompId);
      setSelectedCategory(category);
      setSelectedCategoryCode(categoryCode);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching competitions:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedComp, selectedCompId, loadSavedCategory]);

  // Fetch competitions on mount and when dependencies change
  useEffect(() => {
    fetchCompetitions();
  }, [fetchCompetitions]);

  // Handle competition selection
  const handleCompetitionChange = (newComp, newCompId) => {
    // Update competition selection
    setSelectedComp(newComp);
    setSelectedCompId(newCompId);
    // Add compId to search params
    const url = new URL(window.location);
    if (newCompId) {
      url.searchParams.set('compId', newCompId);
    } else {
      url.searchParams.delete('compId');
    }
    window.history.replaceState({}, '', url);
    localStorage.setItem('lastSelectedComp', newComp);
    localStorage.setItem('lastSelectedCompId', newCompId);
    setCompNotFoundMessage("");

    // Load saved category for this competition
    const { category, categoryCode } = loadSavedCategory(newCompId);
    setSelectedCategory(category);
    setSelectedCategoryCode(categoryCode);

    // Load saved view preference for this competition
    const savedView = localStorage.getItem(`focusView_${newCompId}`);
    if (savedView) {
      setFocusView(savedView);
    }
  };

  // Context value
  const value = {
    // Competition data
    comps,
    selectedComp,
    selectedCompId,
    compNotFoundMessage,

    // UI state
    selectedCategory,
    selectedCategoryCode,
    focusView,
    showRawCounts: displaySettings.showRawCounts,
    showOverallTopsFlashes: displaySettings.showOverallTopsFlashes,
    limitScores,
    isMobile,
    recommendModalUser,
    whatIfModalUser,
    loading,
    error,

    // Actions
    setSelectedCategory,
    setSelectedCategoryCode,
    setFocusView,
    setShowRawCounts,
    setShowOverallTopsFlashes,
    setLimitScores,
    setRecommendModalUser,
    setWhatIfModalUser,
    handleCompetitionChange,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;
