import React, { useState } from 'react';

function ProblemsTable({ categories, categoryTops, problems, loading, countCompetitors, toTimeAgoString }) {
  // State to track sorting
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [showRawCounts, setShowRawCounts] = useState(false); // State for toggle

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

        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    
    return sortedData;
  }, [problems, sortConfig, countCompetitors, showRawCounts]);

  // Function to handle column click and update sort configuration
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={showRawCounts}
          onChange={() => setShowRawCounts(!showRawCounts)}
        />
        Show raw counts for tops and flashes
      </label>
      <table border="1">
        <thead>
          <tr>
            <th onClick={() => requestSort('climbNo')}>Problem No.</th>
            <th onClick={() => requestSort('marking')}>Name/Grade</th>
            <th onClick={() => requestSort('score')}>Points</th>
            <th onClick={() => requestSort('createdAt')}>Date Set</th>
            {Object.values(categories)
              .filter((item) => categoryTops[item.code].length > 0)
              .map((item, index) => (
                <React.Fragment key={index}>
                  <th onClick={() => requestSort(`stat-${item.code}`)}>{`${item.code} T(F)${showRawCounts ? '' : '%'}`}</th>
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
                {item.stats && Object.entries(item.stats).map(([k, v], idx) => (
                  <td key={idx}>
                    {showRawCounts
                      ? `${v.tops} (${v.flashes})`
                      : `${(v.tops / countCompetitors(k)).toFixed(0)}% (${(v.flashes / countCompetitors(k)).toFixed(0)}%)`
                    }
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="10">No data available</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default ProblemsTable;