import React, { useState } from 'react';
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
  const [searchTerm, setSearchTerm] = useState('');
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

  // Filter data based on selected category and search term
  const filteredData = userTableData
    .filter(item => {
      // Filter by category if selected
      if (selectedCategory && item.categoryFullName !== selectedCategory) {
        return false;
      }

      // Filter by search term if provided
      if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      return true;
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
            disabled={loading && loadingProgress < 100}
          />
          Limit to top {Object.values(categories)[0]?.pumpfestTopScores} scores
        </label>
      </div>
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
              fontSize: '14px',
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