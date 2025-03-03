import React, { useMemo, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useCompetition } from '../../contexts/CompetitionContext';
import { useRankHistory } from '../../contexts/RankHistoryContext';
import useExpandableRows from '../../hooks/useExpandableRows';
import { useSearchTracking } from '../../utils/analytics';
import SortableTable from '../common/SortableTable';
import UserScoresTable from './UserScoresTable';
import RankChangeIndicator from './RankChangeIndicator';
import RankChangePeriodSelector from './RankChangePeriodSelector';
import RankHistoryChart from './RankHistoryChart';
import MoversAndShakers from './MoversAndShakers';

/**
 * Component to display the user table
 * @param {Object} props - Component props
 * @param {Function} props.onRecommendClick - Function to call when recommend button is clicked
 * @returns {JSX.Element} UserTable component
 */
function UserTable({ onRecommendClick }) {
  const [searchTerm, setSearchTerm] = useState('');
  // const [rankChangeFilter, setRankChangeFilter] = useState('');
  const {
    selectedCategory,
    limitScores,
    setLimitScores,
    isMobile,
  } = useApp();
  const {
    userTableData,
    categories,
    loading,
    loadingProgress,
    partialDataAvailable
  } = useCompetition();
  const { rankChanges, loading: rankChangesLoading } = useRankHistory();

  const { expandedRows, toggleRow } = useExpandableRows();

  // Combine user table data with rank changes
  const dataWithRankChanges = useMemo(() => {
    if (!rankChanges.length) return userTableData;
    
    return userTableData.map(user => {
      const rankChange = rankChanges.find(rc => rc.competitorNo === user.competitorNo);
      return {
        ...user,
        rankChange: rankChange ? rankChange.rankChange : 0,
        previousRank: rankChange ? rankChange.previousRank : user.rank,
        scoreChange: rankChange ? rankChange.scoreChange : 0
      };
    });
  }, [userTableData, rankChanges]);

  // Memoize filtered data to avoid recalculation on every render
  const filteredData = useMemo(() => {
    return dataWithRankChanges
      .filter(item => {
        // Filter by category if selected
        if (selectedCategory && item.categoryFullName !== selectedCategory) {
          return false;
        }

        // Filter by search term if provided
        if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
        }
        
        // Filter by rank change if selected
        // if (rankChangeFilter) {
        //   if (rankChangeFilter === 'risers' && (item.rankChange <= 0 || item.rankChange === 'new')) {
        //     return false;
        //   }
        //   if (rankChangeFilter === 'fallers' && item.rankChange >= 0) {
        //     return false;
        //   }
        //   if (rankChangeFilter === 'unchanged' && item.rankChange !== 0) {
        //     return false;
        //   }
        //   if (rankChangeFilter === 'new' && item.rankChange !== 'new') {
        //     return false;
        //   }
        // }

        return true;
      })
      .map((item, index) => ({
        ...item,
        index
      }));
  }, [dataWithRankChanges, selectedCategory, searchTerm]);

  // Track search input usage with PostHog
  useSearchTracking(searchTerm, {
    component: 'UserTable',
    field: 'search_by_name',
    resultsCount: filteredData.length,
    debounceTime: 800 // Track after 800ms of inactivity
  });

  // Define columns for the table
  const columns = [
    // Only show index column in desktop view
    ...(!isMobile ? [
      {
        key: 'index',
        label: '#',
        sortable: false,
        render: (item) => item.index + 1
      }
    ] : []),
    // For mobile: Combined Rank and Change column
    // For desktop: Separate Rank column
    ...(isMobile ? [
      {
        key: 'rank',
        label: 'Rank',
        sortable: true,
        render: (item) => (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span>{item.rank}</span>
            <RankChangeIndicator change={item.rankChange} />
          </div>
        )
      }
    ] : [
      {
        key: 'rank',
        label: 'Overall Rank',
        sortable: true
      },
      {
        key: 'rankChange',
        label: 'Change',
        sortable: true,
        render: (item) => <RankChangeIndicator change={item.rankChange} />
      }
    ]),
    ...(!selectedCategory ? [{
      key: 'categoryFullName',
      label: 'Category',
      sortable: true
    }] : []),
    {
      key: 'name',
      label: 'Name',
      sortable: true
    },
    {
      key: 'tops',
      label: 'Tops',
      sortable: true
    },
    {
      key: 'flashes',
      label: 'Flashes',
      sortable: true
    },
    {
      key: 'total',
      label: `Score${!isMobile ? '(+ Flash Bonus)' : ''}`,
      sortable: true,
      render: (item) => (
        <span>
          {item.total - item.bonus} {item.bonus > 0 ? `(+${item.bonus})` : ''}
        </span>
      )
    }
  ];

  // Render expanded content for a row
  const renderExpandedContent = (item) => (
    <>
      <UserScoresTable
        scores={item.scores}
        limitScores={limitScores}
        categoryPumpfestTopScores={categories[item.category]?.pumpfestTopScores}
        flashExtraPoints={item.flashExtraPoints}
        isMobile={isMobile}
      />
      
      {/* Add rank history chart */}
      {/* <RankHistoryChart competitorNo={item.competitorNo} /> */}
      
      <div className="recommendedBtnContainer">
        <button
          id="recommended-btn"
          onClick={(e) => {
            e.stopPropagation();
            onRecommendClick && onRecommendClick(item);
          }}
        >
          Recommend Problems ✨
        </button>
      </div>
    </>
  );

  return (
    <>
      <div className="filters">
        {/* Rank change period selector */}
        <RankChangePeriodSelector />
        
        {/* Rank change filter */}
        {/* <div>
          <label>Filter by rank change: </label>
          <select
            value={rankChangeFilter}
            onChange={(e) => setRankChangeFilter(e.target.value)}
            disabled={loading || rankChangesLoading}
          >
            <option value="">All competitors</option>
            <option value="risers">Risers only</option>
            <option value="fallers">Fallers only</option>
            <option value="unchanged">Unchanged only</option>
            <option value="new">New competitors</option>
          </select>
        </div> */}

        {/* Limit to relevant scores */}
        {/* <label>
          <input
            type="checkbox"
            checked={limitScores}
            onChange={(e) => setLimitScores(e.target.checked)}
            disabled={loading && loadingProgress < 100}
          />
          Limit to top {Object.values(categories)[0]?.pumpfestTopScores} scores
        </label> */}
      </div>
      
      {/* Movers and Shakers section */}
      <MoversAndShakers />

      {/* Search by name */}
      <div className="search-container" style={{
        marginTop: '4px',
        display: 'flex',
        alignItems: 'center',
        maxWidth: '450px',
        position: 'relative'
      }}>
        <span style={{
          position: 'absolute',
          left: '10px',
          color: '#666',
          fontSize: '16px'
        }}>
          🔍
        </span>
        <input
          type="text"
          placeholder="Search by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: '8px 12px 8px 32px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            width: '100%',
            fontSize: '14px'
          }}
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            style={{
              position: 'absolute',
              right: '10px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#dd7777'
            }}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>
      <SortableTable
        columns={columns}
        data={filteredData}
        initialSort={{ key: 'total', direction: 'desc' }}
        rowKey="competitorNo"
        onRowClick={(id) => toggleRow(id)}
        renderExpandedContent={renderExpandedContent}
        expandedRows={expandedRows}
        loading={loading}
        loadingProgress={loadingProgress}
        partialDataAvailable={partialDataAvailable}
        emptyMessage={selectedCategory ? "No users in this category" : "No users available"}
      />
    </>
  );
}

export default UserTable;