import React, { useMemo, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useCompetition } from '../../contexts/CompetitionContext';
import useExpandableRows from '../../hooks/useExpandableRows';
import { formatDateForHover, toTimeAgoString } from '../../utils/dateFormatters';
import SendsSubTable from '../common/SendsSubTable';
import SortableTable from '../common/SortableTable';

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
    loadingProgress,
    partialDataAvailable,
    countCompetitors 
  } = useCompetition();
  
  const { expandedRows, toggleRow } = useExpandableRows();
  
  // State for filtering and display options
  const [showRawCounts, setShowRawCounts] = useState(true);
  const [hideZeroTops, setHideZeroTops] = useState(true);

  // Filter categories to show based on selected category
  const focusCategories = useMemo(() => 
    Object.values(categories)
      .filter((cat) => categoryTops[cat.code]?.length > 0 && 
        (selectedCategoryCode ? cat.code === selectedCategoryCode : true)),
    [categories, categoryTops, selectedCategoryCode]
  );

  // Define columns for the table
  const columns = useMemo(() => {
    const baseColumns = [
      {
        key: 'climbNo',
        label: `Problem${!isMobile ? " No." : ""}`,
        sortable: true
      },
      {
        key: 'marking',
        label: `Name${!isMobile ? "/Grade" : ""}`,
        sortable: true
      },
      {
        key: 'score',
        label: 'Points',
        sortable: true
      },
      {
        key: 'createdAt',
        label: 'Date Set',
        sortable: true,
        render: (item) => (
          <span title={formatDateForHover(item.createdAt)}>
            {toTimeAgoString(item.createdAt)}
          </span>
        )
      }
    ];

    // Add category columns
    const categoryColumns = focusCategories.map(cat => ({
      key: `stat-${cat.code}`,
      label: cat.name || 'TBC',
      sortable: true,
      render: (item) => {
        const statKey = `stat-${cat.code}`;
        if (item[statKey]) {
          return <span>{item[statKey].rawValue}</span>;
        }
        return <span>-</span>;
      }
    }));

    return [...baseColumns, ...categoryColumns];
  }, [focusCategories, isMobile]);

  // Filter and prepare problems data
  const problemsData = useMemo(() => {
    let filteredData = [...Object.values(problems)];

    if (hideZeroTops) {
      filteredData = filteredData.filter(problem => {
        if (!problem.stats) return false;
        return Object.entries(problem.stats)
          .filter(([k, _]) => categoryTops[k]?.length > 0 && 
            (selectedCategoryCode ? k === selectedCategoryCode : true))
          .some(([_, v]) => v.tops > 0);
      });
    }

    return filteredData.map(problem => ({
      ...problem,
      ...focusCategories.reduce((acc, cat) => {
        const statKey = `stat-${cat.code}`;
        const stats = problem.stats && problem.stats[cat.code];
        acc[statKey] = stats ? {
          tops: stats.tops,
          flashes: stats.flashes,
          rawValue: showRawCounts ? 
            `${stats.tops} (${stats.flashes})` : 
            `${(stats.tops / countCompetitors(cat.code)).toFixed(0)}% (${(stats.flashes / countCompetitors(cat.code)).toFixed(0)}%)`,
          sortValue: showRawCounts ? 
            stats.tops : 
            stats.tops / countCompetitors(cat.code)
        } : { rawValue: "-", sortValue: 0 };
        return acc;
      }, {})
    }));
  }, [problems, hideZeroTops, focusCategories, categoryTops, selectedCategoryCode, showRawCounts, countCompetitors]);

  // Render expanded content for a row
  const renderExpandedContent = (item) => (
    <SendsSubTable
      sends={item.sends}
      categoryCode={selectedCategoryCode}
      isMobile={isMobile}
    />
  );

  return (
    <>
      <div className="filters">
        <label>
          <input
            type="checkbox"
            checked={showRawCounts}
            onChange={() => setShowRawCounts(!showRawCounts)}
            disabled={loading && loadingProgress < 100}
          />
          Show raw counts for tops and flashes
        </label>
        <label>
          <input
            type="checkbox"
            checked={hideZeroTops}
            onChange={() => setHideZeroTops(!hideZeroTops)}
            disabled={loading && loadingProgress < 100}
          />
          Hide problems with no tops
        </label>
      </div>
      
      <SortableTable
        columns={columns}
        data={problemsData}
        initialSort={{ key: 'score', direction: 'desc' }}
        rowKey="climbNo"
        onRowClick={(id) => toggleRow(id)}
        renderExpandedContent={renderExpandedContent}
        expandedRows={expandedRows}
        loading={loading}
        loadingProgress={loadingProgress}
        partialDataAvailable={partialDataAvailable}
        emptyMessage="No problems available"
      />
    </>
  );
}

export default ProblemsTable;