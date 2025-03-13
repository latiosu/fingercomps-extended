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
 * Track when a user initiates a photo report
 * @param {number} climbNo - The problem number
 * @param {string} photoId - The ID of the photo being reported
 * @param {string} competitionId - ID of the current competition
 */
export const trackPhotoReportInitiated = (climbNo, photoId, competitionId) => {
  if (process.env.NODE_ENV === "development") return;

  posthog.capture('photo_report_initiated', {
    climb_no: climbNo,
    photo_id: photoId,
    competition_id: competitionId
  });
};

/**
 * Track when a user confirms a photo report
 * @param {number} climbNo - The problem number
 * @param {string} photoId - The ID of the photo being reported
 * @param {string} competitionId - ID of the current competition
 */
export const trackPhotoReportConfirmed = (climbNo, photoId, competitionId) => {
  if (process.env.NODE_ENV === "development") return;

  posthog.capture('photo_report_confirmed', {
    climb_no: climbNo,
    photo_id: photoId,
    competition_id: competitionId
  });
};

/**
 * Track when a user clicks to upload a photo
 * @param {number} climbNo - The problem number
 * @param {string} competitionId - ID of the current competition
 */
export const trackPhotoUploadClick = (climbNo, competitionId) => {
  if (process.env.NODE_ENV === "development") return;

  posthog.capture('photo_upload_click', {
    climb_no: climbNo,
    competition_id: competitionId
  });
};

/**
 * Track when a user submits a photo upload
 * @param {number} climbNo - The problem number
 * @param {string} fileType - The MIME type of the uploaded file
 * @param {number} fileSize - The size of the uploaded file in bytes
 * @param {string} competitionId - ID of the current competition
 */
export const trackPhotoUploaded = (climbNo, fileType, fileSize, competitionId) => {
  if (process.env.NODE_ENV === "development") return;

  posthog.capture('photo_uploaded', {
    climb_no: climbNo,
    file_type: fileType,
    file_size: fileSize,
    competition_id: competitionId
  });
};

/**
 * Track when a user views a photo
 * @param {number} climbNo - The problem number
 * @param {string} photoId - The ID of the photo being viewed
 * @param {string} competitionId - ID of the current competition
 */
export const trackPhotoViewed = (climbNo, photoId, competitionId) => {
  if (process.env.NODE_ENV === "development") return;

  posthog.capture('photo_viewed', {
    climb_no: climbNo,
    photo_id: photoId,
    competition_id: competitionId
  });
};

/**
 * Track when a user switches to Competitor View
 * @param {string} competitionId - ID of the current competition
 */
export const trackCompetitorViewClicked = (competitionId) => {
  if (process.env.NODE_ENV === "development") return;

  posthog.capture('competitor_view_clicked', {
    competition_id: competitionId
  });
};

/**
 * Track when a user switches to Routesetter View
 * @param {string} competitionId - ID of the current competition
 */
export const trackRoutesetterViewClicked = (competitionId) => {
  if (process.env.NODE_ENV === "development") return;

  posthog.capture('routesetter_view_clicked', {
    competition_id: competitionId
  });
};

/**
 * Track when a user changes the raw counts filter
 * @param {boolean} showRawCounts - The new filter state
 * @param {string} competitionId - ID of the current competition
 */
export const trackRawCountsFilterChanged = (showRawCounts, competitionId) => {
  if (process.env.NODE_ENV === "development") return;

  posthog.capture('raw_counts_filter_changed', {
    show_raw_counts: showRawCounts,
    competition_id: competitionId
  });
};

/**
 * Track when a user changes the hide zero tops filter
 * @param {boolean} hideZeroTops - The new filter state
 * @param {string} competitionId - ID of the current competition
 */
export const trackHideZeroTopsFilterChanged = (hideZeroTops, competitionId) => {
  if (process.env.NODE_ENV === "development") return;

  posthog.capture('hide_zero_tops_filter_changed', {
    hide_zero_tops: hideZeroTops,
    competition_id: competitionId
  });
};

/**
 * Custom hook to track search input usage
 * @param {string} searchTerm - The current search term
 * @param {Object} options - Configuration options
 * @param {string} options.component - The component name where the search is used
 * @param {string} options.field - The field identifier for the search input
 * @param {number|function} options.resultsCount - The number of results or a function that returns the count
 * @param {number} options.debounceTime - Time in ms to wait before tracking search completion (default: 1000ms)
 * @param {string} options.view - The view context (e.g., 'competitor', 'routesetter')
 * @param {string} options.competitionId - The ID of the current competition
 */
export const useSearchTracking = (searchTerm, options) => {
  const {
    component,
    field,
    resultsCount,
    debounceTime = 1000,
    view = '',
    competitionId = ''
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
          field,
          view,
          competition_id: competitionId
        });
        hasSearchedRef.current = true;
      }

      // Set a timeout to track the completed search after user stops typing
      searchTimeoutRef.current = setTimeout(() => {
        const count = typeof resultsCount === 'function' ? resultsCount() : resultsCount;

        posthog.capture('search_completed', {
          component,
          field,
          view,
          competition_id: competitionId,
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
  }, [searchTerm, component, field, resultsCount, debounceTime, view, competitionId]);
};

export default loadPosthog;
