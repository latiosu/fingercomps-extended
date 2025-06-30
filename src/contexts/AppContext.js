import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getCompetitions } from '../api/services/competitions';

// Create context
const AppContext = createContext();

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
  const [limitScores, setLimitScores] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [recommendModalUser, setRecommendModalUser] = useState(null);

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
    limitScores,
    isMobile,
    recommendModalUser,
    loading,
    error,

    // Actions
    setSelectedCategory,
    setSelectedCategoryCode,
    setFocusView,
    setLimitScores,
    setRecommendModalUser,
    handleCompetitionChange,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;