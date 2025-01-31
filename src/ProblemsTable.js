import React, { useState } from 'react';

function ProblemsTable({
  categories, categoryTops, problems, loading, countCompetitors, toTimeAgoString, formatDateForHover, selectedCategoryCode, isMobile
}) {
  // State to track sorting
  const [sortConfig, setSortConfig] = useState({ key: 'climbNo', direction: 'asc' });
  const [showRawCounts, setShowRawCounts] = useState(true);
  const [expandedRows, setExpandedRows] = useState(new Set());

  // Sorting function
  const sortedProblems = React.useMemo(() => {
    const sortedData = [...Object.values(problems)];

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
  }, [problems, sortConfig, countCompetitors, showRawCounts]);

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
      </div>
      <div className="mainTable-container">
        <table border="1" className="mainTable">
          <thead>
            <tr className="tableHeader">
              <th style={{ cursor: 'pointer' }} onClick={() => requestSort('climbNo')}>Problem{!isMobile && " No."}{sortConfig.key === 'climbNo' ? (sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽') : ''}</th>
              <th style={{ cursor: 'pointer' }} onClick={() => requestSort('marking')}>Name{!isMobile && "/Grade"}{sortConfig.key === 'marking' ? (sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽') : ''}</th>
              <th style={{ cursor: 'pointer' }} onClick={() => requestSort('score')}>Points{sortConfig.key === 'score' ? (sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽') : ''}</th>
              <th style={{ cursor: 'pointer' }} onClick={() => requestSort('createdAt')}>Date Set{sortConfig.key === 'createdAt' ? (sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽') : ''}</th>
              {Object.values(categories)
                .filter((item) => categoryTops[item.code].length > 0 && (selectedCategoryCode ? item.code === selectedCategoryCode : true))
                .map((item) => (
                  <React.Fragment key={item.code}>
                    <th style={{ cursor: 'pointer' }} onClick={() => requestSort(`stat-${item.code}`)}>
                      {item.name || 'TBC'}{sortConfig.key === `stat-${item.code}` ? (sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽') : ''}
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
                const totalColumns = 4 + Object.values(categories)
                  .filter((cat) => categoryTops[cat.code].length > 0 && (selectedCategoryCode ? cat.code === selectedCategoryCode : true))
                  .length;
                return (
                  <React.Fragment key={item.climbNo}>
                    <tr onClick={() => handleRowClick(item.climbNo)} style={{ cursor: 'pointer' }}>
                      <td>{item.climbNo}</td>
                      <td>{item.marking}</td>
                      <td>{item.score}</td>
                      <td title={formatDateForHover(item.createdAt)}>{toTimeAgoString(item.createdAt)}</td>
                      {item.stats && Object.entries(item.stats)
                        .filter(([k, _]) => selectedCategoryCode ? k === selectedCategoryCode : true)
                        .map(([k, v], idx) => (
                          <td key={`${item.climbNo}-${idx}`}>
                            {showRawCounts
                              ? `${v.tops} (${v.flashes})`
                              : `${(v.tops / countCompetitors(k)).toFixed(0)}% (${(v.flashes / countCompetitors(k)).toFixed(0)}%)`
                            }
                          </td>
                        ))
                      }
                    </tr>
                    {isExpanded && (
                      <tr className="subTableContainer">
                        <td colSpan={totalColumns}>
                          <table border="1" className="subTable" style={{ width: '100%' }}>
                            <thead>
                              <tr className="subTableHeader">
                                <th>{!isMobile && "Overall "}Rank</th>
                                <th>Category</th>
                                <th>Name</th>
                                <th>Flashed?</th>
                                <th>Sent</th>
                              </tr>
                            </thead>
                            <tbody>
                              {item.sends && item.sends
                                .filter((send) => selectedCategoryCode ? send.categoryCode === selectedCategoryCode : true)
                                .sort((a, b) => a.rank - b.rank)
                                .map((send, subIndex) => (
                                  <tr key={`${item.climbNo}-${subIndex}`}>
                                    <td>{send.rank}</td>
                                    <td>{send.category || 'TBC'}</td>
                                    <td>{send.name}</td>
                                    <td>{send.flashed ? 'Y' : ''}</td>
                                    <td title={formatDateForHover(send.createdAt)}>{toTimeAgoString(send.createdAt)}</td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
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