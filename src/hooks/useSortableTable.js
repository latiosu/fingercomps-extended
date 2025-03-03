import { useCallback, useMemo, useState } from 'react';

/**
 * Custom hook for sortable tables
 * @param {Array} initialData - Initial table data
 * @param {Object} initialConfig - Initial sort configuration
 * @param {string|null} initialConfig.key - Sort key
 * @param {string} initialConfig.direction - Sort direction ('asc' or 'desc')
 * @returns {Object} Sortable table state and functions
 */
export default function useSortableTable(initialData = [], initialConfig = { key: null, direction: 'desc' }) {
  const [sortConfig, setSortConfig] = useState(initialConfig);
  const [data, setData] = useState(initialData);

  // Track previous initialData to detect changes
  const [prevInitialData, setPrevInitialData] = useState(initialData);
  if (initialData !== prevInitialData) {
    setPrevInitialData(initialData);
    setData(initialData);
  }

  /**
   * Request sorting by a specific key
   * @param {string} key - Key to sort by
   */
  const requestSort = useCallback((key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  }, [sortConfig]);

  /**
   * Sorted data based on current sort configuration
   */
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;

    return [...data].sort((a, b) => {
      // Handle different data types
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Handle dates
      if (aValue instanceof Date && bValue instanceof Date) {
        return sortConfig.direction === 'asc'
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }

      // Handle numbers
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Handle strings
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      // Default comparison
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig.key, sortConfig.direction]);

  /**
   * Update data and maintain sort
   * @param {Array} newData - New data to set
   */
  const updateData = useCallback((newData) => {
    setData(newData);
  }, []);

  return {
    items: sortedData,
    requestSort,
    sortConfig,
    setData: updateData
  };
}