import React, { useState } from 'react';

function ProblemsTable({
  categories, categoryTops, problems, loading, countCompetitors, toTimeAgoString, selectedCategory, selectedCategoryCode
}) {
  // State to track sorting
  const [sortConfig, setSortConfig] = useState({ key: 'climbNo', direction: 'asc' });
  const [showRawCounts, setShowRawCounts] = useState(false);

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

  return (
    <React.Fragment>
      <div className="filters">
        <div>
          <label>
            <input
              type="checkbox"
              checked={showRawCounts}
              onChange={() => setShowRawCounts(!showRawCounts)}
            />
            Show raw counts for tops and flashes
          </label>
        </div>
      </div>
      <table border="1" className="mainTable">
        <thead>
          <tr className="tableHeader">
            <th style={{ cursor: 'pointer' }} onClick={() => requestSort('climbNo')}>Problem No.{sortConfig.key === 'climbNo' ? (sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽') : ''}</th>
            <th style={{ cursor: 'pointer' }} onClick={() => requestSort('marking')}>Name/Grade{sortConfig.key === 'marking' ? (sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽') : ''}</th>
            <th style={{ cursor: 'pointer' }} onClick={() => requestSort('score')}>Points{sortConfig.key === 'score' ? (sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽') : ''}</th>
            <th style={{ cursor: 'pointer' }} onClick={() => requestSort('createdAt')}>Date Set{sortConfig.key === 'createdAt' ? (sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽') : ''}</th>
            {Object.values(categories)
              .filter((item) => categoryTops[item.code].length > 0 && (selectedCategoryCode ? item.code === selectedCategoryCode : true))
              .map((item, index) => (
                <React.Fragment key={index}>
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
            sortedProblems.map((item, index) => (
              <tr key={index}>
                <td>{item.climbNo}</td>
                <td>{item.marking}</td>
                <td>{item.score}</td>
                <td>{toTimeAgoString(item.createdAt)}</td>
                {item.stats && Object.entries(item.stats)
                  .filter(([k, _]) => selectedCategoryCode ? k === selectedCategoryCode : true)
                  .map(([k, v], idx) => (
                    <td key={idx}>
                      {showRawCounts
                        ? `${v.tops} (${v.flashes})`
                        : `${(v.tops / countCompetitors(k)).toFixed(0)}% (${(v.flashes / countCompetitors(k)).toFixed(0)}%)`
                      }
                    </td>
                  ))
                }
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="10">No data available</td>
            </tr>
          )}
        </tbody>
      </table>
    </React.Fragment>
  );
}

export default ProblemsTable;