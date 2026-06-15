import React from "react";
import useSortableTable from "../../hooks/useSortableTable";
import LoadingProgressBar from "./LoadingProgressBar";

/**
 * Reusable sortable table component
 * @param {Object} props - Component props
 * @param {Array} props.columns - Column definitions
 * @param {Array} props.data - Table data
 * @param {Object} props.initialSort - Initial sort configuration
 * @param {string} props.rowKey - Key to use for row identification
 * @param {Function} props.onRowClick - Function to call when a row is clicked
 * @param {Function} props.renderExpandedContent - Function to render expanded content
 * @param {Set} props.expandedRows - Set of expanded row IDs
 * @param {Function} props.rowClassName - Optional function returning a class name for a row
 * @param {boolean} props.loading - Whether the table is loading
 * @param {number} props.loadingProgress - Loading progress percentage (0-100)
 * @param {boolean} props.partialDataAvailable - Whether partial data is available for display
 * @param {string} props.emptyMessage - Message to display when there's no data
 * @returns {JSX.Element} SortableTable component
 */
function SortableTable({
  columns,
  data,
  initialSort = { key: null, direction: "desc" },
  rowKey = "id",
  onRowClick,
  renderExpandedContent,
  expandedRows = new Set(),
  rowClassName,
  loading = false,
  loadingProgress = 0,
  partialDataAvailable = false,
  emptyMessage = "No data available",
}) {
  const { items, requestSort, sortConfig } = useSortableTable(
    data,
    initialSort
  );

  // Render loading states
  if (loading && !partialDataAvailable) {
    // Always show loading indicator with progress until data is fully loaded
    return (
      <div className="loading-container">
        <LoadingProgressBar progress={loadingProgress} />
        <table className="mainTable">
          <thead className="tableHeader">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={column.className}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={columns.length} className="loading-message">
                <span className="loading-text">
                  Loading data ({loadingProgress}%)
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <>
      {loading && (
        <div className="loading-container">
          <LoadingProgressBar progress={loadingProgress} />
        </div>
      )}
      <table className="mainTable">
        <thead className="tableHeader">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={column.className}
                onClick={() =>
                  column.sortable !== false && requestSort(column.key)
                }
                style={{
                  cursor: column.sortable !== false ? "pointer" : "default",
                }}
              >
                {column.label}
                {sortConfig.key === column.key && (
                  <span>{sortConfig.direction === "asc" ? " 🔼" : " 🔽"}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.length > 0 ? (
            items.map((item) => {
              const isExpanded = expandedRows.has(item[rowKey]);
              return (
                <React.Fragment key={item[rowKey]}>
                  <tr
                    className={rowClassName ? rowClassName(item) : undefined}
                    onClick={() => onRowClick && onRowClick(item[rowKey])}
                    style={{ cursor: onRowClick ? "pointer" : "default" }}
                  >
                    {columns.map((column) => (
                      <td
                        key={`${item[rowKey]}-${column.key}`}
                        className={column.className}
                      >
                        {column.render ? column.render(item) : item[column.key]}
                      </td>
                    ))}
                  </tr>
                  {isExpanded && renderExpandedContent && (
                    <tr className="subTableContainer">
                      <td colSpan={columns.length}>
                        {renderExpandedContent(item)}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })
          ) : (
            <tr>
              <td colSpan={columns.length}>{emptyMessage}</td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}

export default SortableTable;
