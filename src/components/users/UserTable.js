import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { useCompetition } from '../../contexts/CompetitionContext';
import useExpandableRows from '../../hooks/useExpandableRows';
import SortableTable from '../common/SortableTable';
import UserScoresTable from './UserScoresTable';

/**
 * Component to display the user table
 * @param {Object} props - Component props
 * @param {Function} props.onRecommendClick - Function to call when recommend button is clicked
 * @returns {JSX.Element} UserTable component
 */
function UserTable({ onRecommendClick }) {
  const {
    selectedCategory,
    limitScores,
    setLimitScores,
    isMobile,
  } = useApp();
  const {
    userTableData,
    categories,
    loading
  } = useCompetition();

  const { expandedRows, toggleRow } = useExpandableRows();

  // Define columns for the table
  const columns = [
    {
      key: 'index',
      label: '#',
      sortable: false,
      render: (item) => item.index + 1
    },
    {
      key: 'rank',
      label: `${!isMobile ? 'Overall ' : ''}Rank`,
      sortable: true
    },
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

  // Filter data based on selected category
  const filteredData = userTableData
    .filter(item => {
      if (!selectedCategory) return true;
      return item.categoryFullName === selectedCategory;
    })
    .map((item, index) => ({
      ...item,
      index
    }));

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
        <label>
          <input
            type="checkbox"
            checked={limitScores}
            onChange={(e) => setLimitScores(e.target.checked)}
            disabled={loading}
          />
          Hide scores that don't affect total
        </label>
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
        emptyMessage={selectedCategory ? "No users in this category" : "No users available"}
      />
    </>
  );
}

export default UserTable;