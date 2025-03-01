import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
    return localStorage.getItem('lastSelectedCompId') || "";
  });
  const [compNotFoundMessage, setCompNotFoundMessage] = useState("");

  // State for UI
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedCategoryCode, setSelectedCategoryCode] = useState("");
  const [focusView, setFocusView] = useState('user');
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

      setSelectedCategory("");
    } catch (err) {
      setError(err.message);
      console.error("Error fetching competitions:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedComp, selectedCompId]);

  // Fetch competitions on mount and when dependencies change
  useEffect(() => {
    console.time("fetchCompetitions");
    fetchCompetitions();
    console.timeEnd("fetchCompetitions");
  }, [fetchCompetitions]);

  // Handle competition selection
  const handleCompetitionChange = (newComp, newCompId) => {
    setSelectedComp(newComp);
    setSelectedCompId(newCompId);
    localStorage.setItem('lastSelectedComp', newComp);
    localStorage.setItem('lastSelectedCompId', newCompId);
    setCompNotFoundMessage("");
    setSelectedCategory("");
    setSelectedCategoryCode("");
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