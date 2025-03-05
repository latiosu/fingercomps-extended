import React, { createContext, useCallback, useContext, useState } from 'react';

// Create the context
const HighlightedProblemsContext = createContext();

/**
 * Custom hook for accessing the highlighted problems context
 * @returns {Object} Context with registerProblems and shouldHighlight functions
 */
export function useHighlightedProblems() {
  return useContext(HighlightedProblemsContext);
}

/**
 * Provider component for tracking highlighted problems
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} Provider component
 */
export function HighlightedProblemsProvider({ children }) {
  // Track problem numbers and their occurrence count
  const [problemCountMap, setProblemCountMap] = useState({});

  // Track the number of open tables
  const [openTableCount, setOpenTableCount] = useState(0);

  /**
   * Register problem numbers from a table
   * @param {Array<number|string>} problems - Array of problem numbers to register
   * @returns {Function} Cleanup function to unregister problems
   */
  const registerProblems = useCallback((problems) => {
    // Increment the open table count
    setOpenTableCount(prevCount => prevCount + 1);

    setProblemCountMap(prev => {
      const newMap = {...prev};

      // Increment count for each problem
      problems.forEach(problem => {
        newMap[problem] = (newMap[problem] || 0) + 1;
      });

      return newMap;
    });

    // Return cleanup function
    return () => {
      // Decrement the open table count
      setOpenTableCount(prevCount => prevCount - 1);

      setProblemCountMap(prev => {
        const newMap = {...prev};

        // Decrement count for each problem
        problems.forEach(problem => {
          if (newMap[problem] > 1) {
            newMap[problem] -= 1;
          } else {
            delete newMap[problem]; // Remove if this was the last instance
          }
        });

        return newMap;
      });
    };
  }, []);

  /**
   * Check if a problem should be highlighted (appears in all open tables)
   * @param {number|string} problemNo - Problem number to check
   * @returns {boolean} True if problem should be highlighted
   */
  const shouldHighlight = useCallback((problemNo) => {
    // Only highlight if there are at least 2 open tables
    if (openTableCount < 2) return false;

    // Only highlight if the problem appears in all open tables
    return problemCountMap[problemNo] === openTableCount;
  }, [problemCountMap, openTableCount]);

  // Memoize the context value to prevent unnecessary re-renders
  const value = React.useMemo(() => ({
    registerProblems,
    shouldHighlight
  }), [registerProblems, shouldHighlight]);

  return (
    <HighlightedProblemsContext.Provider value={value}>
      {children}
    </HighlightedProblemsContext.Provider>
  );
}