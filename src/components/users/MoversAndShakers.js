import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { useRankHistory } from '../../contexts/RankHistoryContext';
import './MoversAndShakers.css';

/**
 * Component to display significant rank changes (biggest risers and fallers)
 * @param {Object} props - Component props
 * @param {Function} props.onRiserClick - Function to call when a riser is clicked
 * @returns {JSX.Element} MoversAndShakers component
 */
function MoversAndShakers({ onRiserClick }) {
  const { significantChanges, timeframe, loading } = useRankHistory();
  const { isMobile, selectedCategory } = useApp();

  // The significantChanges are now filtered by category at the service level
  const { risers, fallers } = significantChanges;

  const timeframeText = {
    hourly: 'hour',
    halfday: '12 hours',
    daily: 'day',
    threedays: '3 days',
    weekly: 'week'
  }[timeframe] || 'period';

  const fallbackText = `No significant rank changes in past ${timeframeText.toLowerCase()}${selectedCategory ? ` for ${selectedCategory}` : ''}`;

  // Show loading state
  if (loading) {
    return (
      <div className="movers-and-shakers loading">
        <h3>Loading rank changes...</h3>
      </div>
    );
  }

  // Show message if no significant changes
  if (risers.length === 0 && fallers.length === 0) {
    return (
      <div className="movers-and-shakers empty">
        {/* <h3>Movers & Shakers</h3> */}
        <p>
          {fallbackText}
        </p>
      </div>
    );
  }

  return (
    <div className="movers-and-shakers">
      {/* <h3>Movers & Shakers</h3> */}

      <div className="movers-container">
        <div className="movers-section risers">
          <h4>
            Fastest Risers in past {timeframeText}
            {selectedCategory ? ` for ${selectedCategory}` : ''}
          </h4>
          {risers.length > 0 ? (
            <ul>
              {risers.slice(0, isMobile ? 3 : 5).map(competitor => (
                <li
                  key={competitor.competitorNo}
                  onClick={() => onRiserClick && onRiserClick(competitor.name)}
                  style={{ cursor: 'pointer' }}
                  title="Click to search for this competitor"
                >
                  {!selectedCategory && <span className="competitor-category">[{competitor.category}]</span>}
                  <span className="competitor-name">{competitor.name}</span>
                  <span className="rank-change up">↑ {competitor.rankChange}</span>
                  <span className="current-rank">Now #{competitor.rank}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-changes">{fallbackText}</p>
          )}
        </div>

        {/* <div className="movers-section fallers">
          <h4>Fastest Fallers This {timeframeText}</h4>
          {fallers.length > 0 ? (
            <ul>
              {fallers.slice(0, 3).map(competitor => (
                <li key={competitor.competitorNo}>
                  <span className="competitor-name">{competitor.name}</span>
                  <span className="rank-change down">↓ {Math.abs(competitor.rankChange)}</span>
                  <span className="current-rank">Now #{competitor.rank}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-changes">No significant fallers</p>
          )}
        </div> */}
      </div>
    </div>
  );
}

export default MoversAndShakers;