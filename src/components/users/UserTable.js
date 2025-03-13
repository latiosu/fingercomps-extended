import posthog from 'posthog-js';
import React, { useEffect, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useCompetition } from '../../contexts/CompetitionContext';
import { useRankHistory } from '../../contexts/RankHistoryContext';
import useExpandableRows from '../../hooks/useExpandableRows';
import { filterBySearchTerm } from '../../utils/searchFilters';
import SearchInput from '../common/SearchInput';
import SortableTable from '../common/SortableTable';
import MoversAndShakers from './MoversAndShakers';
import RankChangeIndicator from './RankChangeIndicator';
import RankChangePeriodSelector from './RankChangePeriodSelector';
import UserScoresTable from './UserScoresTable';

/**
 * Component to display the user table
 * @param {Object} props - Component props
 * @param {Function} props.onRecommendClick - Function to call when recommend button is clicked
 * @param {string} props.searchTerm - Current search term
 * @param {Function} props.setSearchTerm - Function to update search term
 * @returns {JSX.Element} UserTable component
 */
function UserTable({ onRecommendClick, searchTerm, setSearchTerm }) {
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

  /**
   * Track when exactly two rows are expanded (triggering matching problems feature)
   * This happens when a user opens two competitor rows, which activates the
   * matching problems highlighting feature (problems that both users have completed)
   *
   * Reference: The HighlightedProblemsContext tracks which problems should be
   * highlighted when multiple user tables are open, showing matching problems
   * at the top when exactly 2 rows are expanded.
   */
  useEffect(() => {
    // Only track in production environment
    if (process.env.NODE_ENV !== "development" && expandedRows.size === 2) {
      // Convert Set to Array to get the competitor IDs
      const openCompetitorIds = Array.from(expandedRows);

      // Find the competitor data for the open rows
      const openCompetitors = openCompetitorIds.map(id =>
        userTableData.find(user => user.competitorNo === id)
      ).filter(Boolean);

      // Track the event with PostHog
      posthog.capture('matching_problems_feature_triggered', {
        component: 'UserTable',
        open_competitor_count: 2,
        open_competitor_categories: openCompetitors.map(c => c.category),
        open_competitor_names: openCompetitors.map(c => c.name),
        open_competitor_ranks: openCompetitors.map(c => c.rank)
      });
    }
  }, [expandedRows, userTableData]);

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
      .filter(item => filterBySearchTerm(item, searchTerm));
  }, [dataWithRankChanges, selectedCategory, searchTerm]);

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
          Recommended Problems ✨
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

      <SearchInput
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        placeholder="Search by name..."
        component="UserTable"
        field="search_by_name"
        resultsCount={filteredData.length}
        debounceTime={800}
      />
      <div className="table-container">
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
      </div>
    </>
  );
}

export default UserTable;