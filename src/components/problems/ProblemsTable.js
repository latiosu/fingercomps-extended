import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useCompetition } from '../../contexts/CompetitionContext';
import useExpandableRows from '../../hooks/useExpandableRows';
import SendsSubTable from '../common/SendsSubTable';
import { toTimeAgoString, formatDateForHover } from '../../utils/dateFormatters';

/**
 * Component to display the problems table
 * @returns {JSX.Element} ProblemsTable component
 */
function ProblemsTable() {
  const { isMobile, selectedCategoryCode } = useApp();
  const { 
    categories, 
    categoryTops, 
    problems, 
    loading, 
    countCompetitors 
  } = useCompetition();
  
  const { expandedRows, toggleRow } = useExpandableRows();
  
  // State for filtering and display options
  const [showRawCounts, setShowRawCounts] = useState(true);
  const [hideZeroTops, setHideZeroTops] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: 'score', direction: 'desc' });

  // Function to handle column click and update sort configuration
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filter categories to show based on selected category
  const focusCategories = Object.values(categories)
    .filter((cat) => categoryTops[cat.code]?.length > 0 && (selectedCategoryCode ? cat.code === selectedCategoryCode : true));

  // Sort and filter problems
  const sortedProblems = React.useMemo(() => {
    let sortedData = [...Object.values(problems)];

    if (hideZeroTops) {
      sortedData = sortedData.filter(problem => {
        if (!problem.stats) return false;
        return Object.entries(problem.stats)
          .filter(([k, _]) => categoryTops[k]?.length > 0 && (selectedCategoryCode ? k === selectedCategoryCode : true))
          .some(([_, v]) => v.tops > 0);
      });
    }

    if (sortConfig.key) {
      sortedData.sort((a, b) => {
        let aValue, bValue;

        if (sortConfig.key === 'createdAt') {
          aValue = new Date(a[sortConfig.key]);
          bValue = new Date(b[sortConfig.key]);
        } else if (sortConfig.key.startsWith('stat-')) {
          const statKey = sortConfig.key.replace('stat-', '');
          aValue = a.stats && a.stats[statKey] ? (showRawCounts ? a.stats[statKey].tops : a.stats[statKey].tops / countCompetitors(statKey)) : 0;
          bValue = b.stats && b.stats[statKey] ? (showRawCounts ? b.stats[statKey].tops : b.stats[statKey].tops / countCompetitors(statKey)) : 0;
        } else {
          aValue = a[sortConfig.key];
          bValue = b[sortConfig.key];
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return sortedData;
  }, [problems, hideZeroTops, sortConfig.key, sortConfig.direction, categoryTops, selectedCategoryCode, showRawCounts, countCompetitors]);

  return (
    <>
      <div className="filters">
        <label>
          <input
            type="checkbox"
            checked={showRawCounts}
            onChange={() => setShowRawCounts(!showRawCounts)}
          />
          Show raw counts for tops and flashes
        </label>
        <label>
          <input
            type="checkbox"
            checked={hideZeroTops}
            onChange={() => setHideZeroTops(!hideZeroTops)}
          />
          Hide problems with no tops
        </label>
      </div>
      
      <div className="mainTable-container">
        <table border="1" className="mainTable">
          <thead>
            <tr className="tableHeader">
              <th 
                style={{ cursor: 'pointer' }} 
                onClick={() => requestSort('climbNo')}
              >
                Problem{!isMobile && " No."}
                {sortConfig.key === 'climbNo' ? (sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽') : ''}
              </th>
              <th 
                style={{ cursor: 'pointer' }} 
                onClick={() => requestSort('marking')}
              >
                Name{!isMobile && "/Grade"}
                {sortConfig.key === 'marking' ? (sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽') : ''}
              </th>
              <th 
                style={{ cursor: 'pointer' }} 
                onClick={() => requestSort('score')}
              >
                Points
                {sortConfig.key === 'score' ? (sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽') : ''}
              </th>
              <th 
                style={{ cursor: 'pointer' }} 
                onClick={() => requestSort('createdAt')}
              >
                Date Set
                {sortConfig.key === 'createdAt' ? (sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽') : ''}
              </th>
              {focusCategories.map((cat) => (
                <th 
                  key={cat.code}
                  style={{ cursor: 'pointer' }} 
                  onClick={() => requestSort(`stat-${cat.code}`)}
                >
                  {cat.name || 'TBC'}
                  {sortConfig.key === `stat-${cat.code}` ? (sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4 + focusCategories.length}>Loading...</td>
              </tr>
            ) : sortedProblems.length > 0 ? (
              sortedProblems.map((item) => {
                const isExpanded = expandedRows.has(item.climbNo);
                const totalColumns = 4 + focusCategories.length;
                return (
                  <React.Fragment key={item.climbNo}>
                    <tr 
                      onClick={() => toggleRow(item.climbNo)} 
                      style={{ cursor: 'pointer' }}
                    >
                      <td>{item.climbNo}</td>
                      <td>{item.marking}</td>
                      <td>{item.score}</td>
                      <td title={formatDateForHover(item.createdAt)}>
                        {toTimeAgoString(item.createdAt)}
                      </td>
                      {item.stats ? Object.entries(item.stats)
                        .filter(([k, _]) => categoryTops[k]?.length > 0 && (selectedCategoryCode ? k === selectedCategoryCode : true))
                        .map(([k, v], idx) => (
                          <td key={`${item.climbNo}-${idx}`}>
                            {v.tops > 0
                              ? (showRawCounts 
                                ? `${v.tops} (${v.flashes})` 
                                : (v.tops / countCompetitors(k)).toFixed(0) + `% (${(v.flashes / countCompetitors(k)).toFixed(0)}%)`)
                              : "-"
                            }
                          </td>
                        ))
                      : focusCategories.map((_, idx) => <td key={`${item.climbNo}-empty-${idx}`}>-</td>)}
                    </tr>
                    {isExpanded && (
                      <tr className="subTableContainer">
                        <td colSpan={totalColumns}>
                          <SendsSubTable
                            sends={item.sends}
                            categoryCode={selectedCategoryCode}
                            isMobile={isMobile}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              <tr>
                <td colSpan={4 + focusCategories.length}>No data available</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default ProblemsTable;