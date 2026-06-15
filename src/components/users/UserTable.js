import posthog from 'posthog-js';
import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useCompetition } from '../../contexts/CompetitionContext';
import { useRankHistory } from '../../contexts/RankHistoryContext';
import { useSandbox } from '../../contexts/SandboxContext';
import useExpandableRows from '../../hooks/useExpandableRows';
import { computeCategoryPositions } from '../../utils/sandboxUtils';
import { filterBySearchTerm } from '../../utils/searchFilters';
import SearchInput from '../common/SearchInput';
import SortableTable from '../common/SortableTable';
import SandboxBanner from '../sandbox/SandboxBanner';
import SandboxModal from '../sandbox/SandboxModal';
import '../sandbox/Sandbox.css';
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
    setWhatIfModalUser,
  } = useApp();
  const {
    userTableData,
    categories,
    competitionId,
    loading,
    backgroundLoading,
    fullDataLoaded,
    loadingProgress,
    partialDataAvailable
  } = useCompetition();
  const { rankChanges} = useRankHistory();
  const {
    sandboxMode,
    enterSandbox,
    theoreticalScores,
    theoreticalTopsCount,
    removeTheoreticalTop,
    sandboxUserTableData,
  } = useSandbox();
  const [showSandboxModal, setShowSandboxModal] = useState(false);

  const { expandedRows, toggleRow } = useExpandableRows();

  const showFlashBonusStorageKey = `show_flash_bonus_${competitionId}`;
  const showMinimumTopsStorageKey = `show_minimum_tops_${competitionId}`;

  const [showFlashBonus, setShowFlashBonus] = useState(() => {
    try {
      const savedValue = localStorage.getItem(showFlashBonusStorageKey);
      return savedValue !== null ? savedValue === "true" : false; // Default to false if not found
    } catch (error) {
      console.warn("Unable to access localStorage:", error);
      return false;
    }
  });

  const [showMinimumTops, setShowMinimumTops] = useState(() => {
    try {
      const savedValue = localStorage.getItem(showMinimumTopsStorageKey);
      return savedValue !== null ? savedValue === "true" : false; // Default to false if not found
    } catch (error) {
      console.warn("Unable to access localStorage:", error);
      return false;
    }
  });

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

  // In sandbox mode, rankings come from the theoretical overlay instead
  const baseData = sandboxMode ? sandboxUserTableData : userTableData;

  // Combine user table data with rank changes
  const dataWithRankChanges = useMemo(() => {
    // In sandbox mode, show movement relative to the real rankings rather
    // than historical rank changes
    if (sandboxMode && theoreticalTopsCount > 0) {
      const realPositions = computeCategoryPositions(userTableData);
      const sandboxPositions = computeCategoryPositions(baseData);
      const realTotals = new Map(userTableData.map(user => [user.competitorNo, user.total]));

      return baseData.map(user => ({
        ...user,
        rankChange: (realPositions[user.competitorNo] || 0) - (sandboxPositions[user.competitorNo] || 0),
        previousRank: realPositions[user.competitorNo] || user.rank,
        scoreChange: user.total - (realTotals.get(user.competitorNo) ?? user.total)
      }));
    }

    if (!fullDataLoaded && !sandboxMode) {
      return baseData.map(user => ({
        ...user,
        rankChange: null,
        previousRank: null,
        scoreChange: null
      }));
    }

    if (!rankChanges.length) return baseData;

    return baseData.map(user => {
      const rankChange = rankChanges.find(rc => rc.competitorNo === user.competitorNo);
      return {
        ...user,
        rankChange: rankChange ? rankChange.rankChange : 0,
        previousRank: rankChange ? rankChange.previousRank : user.rank,
        scoreChange: rankChange ? rankChange.scoreChange : 0
      };
    });
  }, [
    baseData,
    userTableData,
    rankChanges,
    sandboxMode,
    theoreticalTopsCount,
    fullDataLoaded,
  ]);

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

    // Second, filter for minimum tops
    const minimumTopsData = categoryFilteredData
      .filter(item => {
        if (showMinimumTops && item.tops < categories[item.category]?.pumpfestTopScores) {
          return false;
        }
        return true;
      });

    // Then, apply search term filter while preserving the category-based indices
    return minimumTopsData
      .filter(item => filterBySearchTerm(item, searchTerm));
  }, [dataWithRankChanges, selectedCategory, searchTerm, showMinimumTops, categories]);

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
      sortable: true,
      render: (item) => {
        const theoreticalCount = sandboxMode
          ? (theoreticalScores[item.competitorNo]?.length || 0)
          : 0;
        if (!theoreticalCount) return item.name;
        return (
          <span>
            {item.name}
            <span
              className="sandbox-badge"
              title={`${theoreticalCount} theoretical top${theoreticalCount !== 1 ? 's' : ''}`}
            >
              🧪+{theoreticalCount}
            </span>
          </span>
        );
      }
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
      label: `Score${!isMobile && showFlashBonus ? '(+ Flash Bonus)' : ''}`,
      sortable: true,
      render: (item) => (
        <span>
          {item.total} {showFlashBonus && item.bonus > 0 ? `(+${item.bonus})` : ''}
          {sandboxMode && item.scoreChange > 0 && (
            <span className="sandbox-score-delta"> (+{item.scoreChange})</span>
          )}
        </span>
      )
    }
  ];

  // Render expanded content for a row
  const renderExpandedContent = (item) => (
    <>
      <UserScoresTable
        qualificationScores={item.scores}
        limitScores={limitScores}
        categoryPumpfestTopScores={categories[item.category]?.pumpfestTopScores}
        flashExtraPoints={item.flashExtraPoints}
        isMobile={isMobile}
        showFlashBonus={showFlashBonus}
        onRemoveTheoretical={sandboxMode
          ? (climbNo) => removeTheoreticalTop(item.competitorNo, climbNo)
          : undefined}
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
        <button
          id="whatif-btn"
          title="Add theoretical sends and see how rankings would change"
          onClick={(e) => {
            e.stopPropagation();

            // Track what-if sandbox button click with PostHog
            if (process.env.NODE_ENV !== "development") {
              posthog.capture('what_if_sandbox_clicked', {
                component: 'UserTable',
                user_category: item.category,
                user_name: item.name,
                user_rank: item.rank,
              });
            }

            enterSandbox();
            setWhatIfModalUser(item);
          }}
        >
          🧪 What-if Sends
        </button>
      </div>
    </>
  );

  return (
    <>
      <div className="filters">
        <RankChangePeriodSelector />
        <label>
          <input
            type="checkbox"
            checked={showFlashBonus}
            onChange={() => setShowFlashBonus(!showFlashBonus)}
            disabled={loading && loadingProgress < 100}
          />
          Show bonus points from flashes
        </label>
        <label>
          <input
            type="checkbox"
            checked={showMinimumTops}
            onChange={() => setShowMinimumTops(!showMinimumTops)}
            disabled={loading && loadingProgress < 100}
          />
          Show competitors with minimum tops
        </label>
      </div>

      <SandboxBanner onAddTops={() => setShowSandboxModal(true)} />

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
      <div className={`table-container${sandboxMode ? ' sandbox-table' : ''}`}>
        <SortableTable
          columns={columns}
          data={filteredData}
          initialSort={{ key: 'total', direction: 'desc' }}
          rowKey="competitorNo"
          onRowClick={(id) => toggleRow(id)}
          renderExpandedContent={renderExpandedContent}
          expandedRows={expandedRows}
          rowClassName={(item) => (
            sandboxMode && theoreticalScores[item.competitorNo]?.length
              ? 'sandbox-modified-row'
              : undefined
          )}
          loading={loading || backgroundLoading}
          loadingProgress={loadingProgress}
          partialDataAvailable={partialDataAvailable}
          emptyMessage={selectedCategory ? "No users in this category" : "No users available"}
        />
      </div>

      {/* Sandbox add-tops modal */}
      {showSandboxModal && (
        <SandboxModal onClose={() => setShowSandboxModal(false)} />
      )}
    </>
  );
}

export default UserTable;
