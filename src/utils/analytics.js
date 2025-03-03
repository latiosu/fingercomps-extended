import posthog from "posthog-js";
import { useEffect, useRef } from "react";

const loadPosthog = () => {
  // Skip posthog for local
  if (process.env.NODE_ENV !== "development") {
    posthog.init("phc_gaex6n8piCE8xkDEq6IPAmvkNBFinGBZkilZXfsuTnG", {
      api_host: "https://us.i.posthog.com",
      person_profiles: "always", // or 'always' to create profiles for anonymous users as well
    });
  }
};

/**
 * Custom hook to track search input usage
 * @param {string} searchTerm - The current search term
 * @param {Object} options - Configuration options
 * @param {string} options.component - The component name where the search is used
 * @param {string} options.field - The field identifier for the search input
 * @param {number|function} options.resultsCount - The number of results or a function that returns the count
 * @param {number} options.debounceTime - Time in ms to wait before tracking search completion (default: 1000ms)
 */
export const useSearchTracking = (searchTerm, options) => {
  const {
    component,
    field,
    resultsCount,
    debounceTime = 1000
  } = options;

  const searchTimeoutRef = useRef(null);
  const hasSearchedRef = useRef(false);

  useEffect(() => {
    // Skip tracking in development environment
    if (process.env.NODE_ENV === "development") {
      return;
    }

    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // If search term is not empty
    if (searchTerm) {
      // Track when user starts typing (only once per search session)
      if (!hasSearchedRef.current) {
        posthog.capture('search_started', {
          component,
          field
        });
        hasSearchedRef.current = true;
      }

      // Set a timeout to track the completed search after user stops typing
      searchTimeoutRef.current = setTimeout(() => {
        const count = typeof resultsCount === 'function' ? resultsCount() : resultsCount;

        posthog.capture('search_completed', {
          component,
          field,
          search_term: searchTerm,
          results_count: count
        });
      }, debounceTime);
    } else {
      // Reset the search session flag when search is cleared
      hasSearchedRef.current = false;
    }

    // Cleanup function
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, component, field, resultsCount, debounceTime]);
};

export default loadPosthog;
