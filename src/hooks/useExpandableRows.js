import { useState, useCallback } from 'react';

/**
 * Custom hook for managing expandable rows
 * @returns {Object} Expandable rows state and functions
 */
export default function useExpandableRows() {
  const [expandedRows, setExpandedRows] = useState(new Set());

  /**
   * Toggle a row's expanded state
   * @param {string|number} id - Row identifier
   */
  const toggleRow = useCallback((id) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  /**
   * Check if a row is expanded
   * @param {string|number} id - Row identifier
   * @returns {boolean} Whether the row is expanded
   */
  const isRowExpanded = useCallback((id) => {
    return expandedRows.has(id);
  }, [expandedRows]);

  /**
   * Collapse all expanded rows
   */
  const collapseAllRows = useCallback(() => {
    setExpandedRows(new Set());
  }, []);

  return {
    expandedRows,
    toggleRow,
    isRowExpanded,
    collapseAllRows
  };
}