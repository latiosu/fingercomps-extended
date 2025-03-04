import posthog from 'posthog-js';
import React, { useMemo, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useCompetition } from '../../contexts/CompetitionContext';
import { useRankHistory } from '../../contexts/RankHistoryContext';
import useExpandableRows from '../../hooks/useExpandableRows';
import { useSearchTracking } from '../../utils/analytics';
import SortableTable from '../common/SortableTable';
import MoversAndShakers from './MoversAndShakers';
import RankChangeIndicator from './RankChangeIndicator';
import RankChangePeriodSelector from './RankChangePeriodSelector';
import UserScoresTable from './UserScoresTable';

/**
 * Component to display the user table
 * @param {Object} props - Component props
 * @param {Function} props.onRecommendClick - Function to call when recommend button is clicked
 * @returns {JSX.Element} UserTable component
 */
function UserTable({ onRecommendClick }) {
  const [searchTerm, setSearchTerm] = useState('');
  const {
    selectedCategory,
    limitScores,
    isMobile,
  } = useApp();
  const {
    userTableData,
    categories,
    loading,
    loadingProgress,
    partialDataAvailable
  } = useCompetition();
  const { rankChanges} = useRankHistory();

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
    // First, filter by category only
    const categoryFilteredData = dataWithRankChanges
      .filter(item => {
        // Filter by category if selected
        if (selectedCategory && item.categoryFullName !== selectedCategory) {
          return false;
        }
        return true;
      })
      .map((item, index) => ({
        ...item,
        // Assign index based on category filtering only
        categoryIndex: index
      }));

    // Then, apply search term filter while preserving the category-based indices
    return categoryFilteredData
      .filter(item => {
        // Filter by search term if provided
        if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
        }
        return true;
      });
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
    // Index column - combined with rank change in mobile view
    {
      key: 'categoryIndex',
      label: '#',
      sortable: true,
      render: (item) => (
        isMobile ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span>{item.categoryIndex + 1}</span>
            <RankChangeIndicator change={item.rankChange} />
          </div>
        ) : (
          item.categoryIndex + 1
        )
      )
    },
    // Change column - only in desktop view
    ...(!isMobile ? [
      {
        key: 'rankChange',
        label: 'Change',
        sortable: true,
        render: (item) => <RankChangeIndicator change={item.rankChange} />
      }
    ] : []),
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

      <div className="recommendedBtnContainer">
        <button
          id="recommended-btn"
          onClick={(e) => {
            e.stopPropagation();

            // Track recommend problems button click with PostHog
            if (process.env.NODE_ENV !== "development") {
              posthog.capture('recommend_problems_clicked', {
                component: 'UserTable',
                user_category: item.category,
                user_name: item.name,
                user_rank: item.rank,
              });
            }

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
        <RankChangePeriodSelector />
      </div>

      <MoversAndShakers onRiserClick={setSearchTerm} searchTerm={searchTerm} />

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
          fontSize: '18px',
          pointerEvents: 'none' // Allow clicks to pass through to the input underneath
        }}>
          🔍
        </span>
        <input
          type="text"
          placeholder="Search by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: '8px 12px 8px 40px',
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