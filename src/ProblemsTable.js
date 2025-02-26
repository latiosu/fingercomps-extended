import React, { useState } from 'react';
import SendsSubTable from './SendsSubTable';

import { formatDateForHover, toTimeAgoString } from './utils/dateFormatters';

function ProblemsTable({
  categories, categoryTops, problems, loading, countCompetitors, selectedCategoryCode, isMobile
}) {
  // State to track sorting
  const [sortConfig, setSortConfig] = useState({ key: 'score', direction: 'desc' });
  const [showRawCounts, setShowRawCounts] = useState(true);
  const [hideZeroTops, setHideZeroTops] = useState(true);
  const [expandedRows, setExpandedRows] = useState(new Set());

  // Sorting function
  const sortedProblems = React.useMemo(() => {
    let sortedData = [...Object.values(problems)];

    if (hideZeroTops) {
      sortedData = sortedData.filter(problem => {
        if (!problem.stats) return false;
        return Object.entries(problem.stats)
          .filter(([k, _]) => categoryTops[k].length > 0 && (selectedCategoryCode ? k === selectedCategoryCode : true))
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

  // Function to handle column click and update sort configuration
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleRowClick = (id) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const focusCategories = Object.values(categories)
    .filter((cat) => categoryTops[cat.code].length > 0 && (selectedCategoryCode ? cat.code === selectedCategoryCode : true));

  return (
    <React.Fragment>
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
              <th style={{ cursor: 'pointer' }} onClick={() => requestSort('climbNo')}>Problem{!isMobile && " No."}{sortConfig.key === 'climbNo' ? (sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽') : ''}</th>
              <th style={{ cursor: 'pointer' }} onClick={() => requestSort('marking')}>Name{!isMobile && "/Grade"}{sortConfig.key === 'marking' ? (sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽') : ''}</th>
              <th style={{ cursor: 'pointer' }} onClick={() => requestSort('score')}>Points{sortConfig.key === 'score' ? (sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽') : ''}</th>
              <th style={{ cursor: 'pointer' }} onClick={() => requestSort('createdAt')}>Date Set{sortConfig.key === 'createdAt' ? (sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽') : ''}</th>
              {focusCategories.map((cat) => (
                  <React.Fragment key={cat.code}>
                    <th style={{ cursor: 'pointer' }} onClick={() => requestSort(`stat-${cat.code}`)}>
                      {cat.name || 'TBC'}{sortConfig.key === `stat-${cat.code}` ? (sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽') : ''}
                    </th>
                  </React.Fragment>
                ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="10">Loading...</td>
              </tr>
            ) : sortedProblems.length > 0 ? (
              sortedProblems.map((item) => {
                const isExpanded = expandedRows.has(item.climbNo);
                const totalColumns = 4 + focusCategories.length;
                return (
                  <React.Fragment key={item.climbNo}>
                    <tr onClick={() => handleRowClick(item.climbNo)} style={{ cursor: 'pointer' }}>
                      <td>{item.climbNo}</td>
                      <td>{item.marking}</td>
                      <td>{item.score}</td>
                      <td title={formatDateForHover(item.createdAt)}>{toTimeAgoString(item.createdAt)}</td>
                      {item.stats ? Object.entries(item.stats)
                        .filter(([k, _]) => categoryTops[k].length > 0 && (selectedCategoryCode ? k === selectedCategoryCode : true))
                        .map(([k, v], idx) => (
                          <td key={`${item.climbNo}-${idx}`}>
                            {v.tops > 0
                              ? (showRawCounts ? `${v.tops} (${v.flashes})` : (v.tops / countCompetitors(k)).toFixed(0) + `% (${(v.flashes / countCompetitors(k)).toFixed(0)}%)`)
                              : "-"
                            }
                          </td>
                        ))
                      : focusCategories.map(() => <td>-</td>)}
                      {/* {focusCategories.map(() => <td>-</td>)} */}
                    </tr>
                    {isExpanded && (
                      <tr className="subTableContainer">
                        <td colSpan={totalColumns}>
                          <SendsSubTable
                            sends={item.sends}
                            categoryCode={selectedCategoryCode}
                            isMobile={isMobile}
                            toTimeAgoString={toTimeAgoString}
                            formatDateForHover={formatDateForHover}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              <tr>
                <td colSpan="10">No data available</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </React.Fragment>
  );
}

export default ProblemsTable;