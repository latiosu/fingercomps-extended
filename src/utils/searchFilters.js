/**
 * Utility functions for filtering data based on search terms
 */

/**
 * Filters an item by name (case-insensitive)
 * @param {Object} item - The item to check
 * @param {string} searchTerm - The search term to filter by
 * @param {string} field - The field to search in (default: 'name')
 * @returns {boolean} True if the item passes the filter
 */
export const filterBySearchTerm = (item, searchTerm, field = 'name') => {
  if (!searchTerm || searchTerm.trim() === '') {
    return true;
  }

  // If item[field] is undefined or null, return false
  if (!item[field]) {
    return false;
  }

  return item[field].toLowerCase().includes(searchTerm.toLowerCase());
};

/**
 * Apply multiple filters to a dataset
 * @param {Array} data - The data to filter
 * @param {Object} filters - Object containing filter functions
 * @returns {Array} Filtered data
 */
export const applyFilters = (data, filters) => {
  if (!data || !Array.isArray(data)) {
    return [];
  }

  return data.filter(item => {
    // Apply all filters
    for (const key in filters) {
      if (!filters[key](item)) {
        return false;
      }
    }
    return true;
  });
};