import React from 'react';
import { useSearchTracking } from '../../utils/analytics';

/**
 * Reusable search input component with clear button
 * @param {Object} props - Component props
 * @param {string} props.searchTerm - Current search term
 * @param {Function} props.setSearchTerm - Function to update search term
 * @param {string} props.placeholder - Placeholder text for the search input
 * @param {string} props.component - Component name for analytics tracking
 * @param {string} props.field - Field name for analytics tracking
 * @param {number} props.resultsCount - Number of search results for analytics tracking
 * @param {number} props.debounceTime - Debounce time for analytics tracking
 * @param {Object} props.style - Additional styles to apply to container
 * @returns {JSX.Element} SearchInput component
 */
function SearchInput({
  searchTerm,
  setSearchTerm,
  placeholder = "Search...",
  component = "",
  field = "",
  resultsCount = 0,
  debounceTime = 800,
  style = {}
}) {
  // Track search input usage with PostHog
  useSearchTracking(searchTerm, {
    component,
    field,
    resultsCount,
    debounceTime
  });

  return (
    <div className="search-container" style={{
      marginTop: '4px',
      display: 'flex',
      alignItems: 'center',
      maxWidth: '450px',
      position: 'relative',
      ...style
    }}>
      <span style={{
        position: 'absolute',
        left: '10px',
        color: '#666',
        fontSize: '18px',
        pointerEvents: 'none' // Allow clicks to pass through to the input underneath
      }}>
        🔍
      </span>
      <input
        type="text"
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{
          padding: '8px 12px 8px 40px',
          borderRadius: '4px',
          border: '1px solid #ccc',
          width: '100%',
          fontSize: '14px'
        }}
      />
      {searchTerm && (
        <button
          onClick={() => setSearchTerm('')}
          style={{
            position: 'absolute',
            right: '10px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#dd7777'
          }}
          aria-label="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  );
}

export default SearchInput;