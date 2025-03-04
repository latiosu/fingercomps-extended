import React, { useEffect, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useRankHistory } from '../../contexts/RankHistoryContext';
import ClickableCompetitor from '../common/ClickableCompetitor';
import './MoversAndShakers.css';

/**
 * Component to display significant rank changes (biggest risers and fallers)
 * @param {Object} props - Component props
 * @param {Function} props.onRiserClick - Function to call when a riser is clicked
 * @param {string} props.searchTerm - Current search term
 * @returns {JSX.Element} MoversAndShakers component
 */
function MoversAndShakers({ onRiserClick, searchTerm }) {
  const { significantChanges, timeframe, loading } = useRankHistory();
  const { isMobile, selectedCategory } = useApp();
  const [selectedRiser, setSelectedRiser] = useState(null);

  // The significantChanges are now filtered by category at the service level
  const { risers, fallers } = significantChanges;

  // Clear selected riser when search term changes or is cleared
  useEffect(() => {
    if (!searchTerm || searchTerm !== selectedRiser) {
      setSelectedRiser(null);
    }
  }, [searchTerm, selectedRiser]);

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
        <p>
          {fallbackText}
        </p>
      </div>
    );
  }

  return (
    <div className="movers-and-shakers">
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
                  className={selectedRiser === competitor.name ? 'selected' : ''}
                >
                  <ClickableCompetitor
                    name={competitor.name}
                    category={competitor.category}
                    rank={competitor.rank}
                    rankChange={competitor.rankChange}
                    isSelected={selectedRiser === competitor.name}
                    showCategory={!selectedCategory}
                    fullWidth={true}
                    onClick={() => {
                      // Toggle selection - if already selected, clear it
                      if (selectedRiser === competitor.name) {
                        setSelectedRiser(null);
                        onRiserClick && onRiserClick('');
                      } else {
                        setSelectedRiser(competitor.name);
                        onRiserClick && onRiserClick(competitor.name);
                      }
                    }}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-changes">{fallbackText}</p>
          )}
        </div>

        {/* Fallers section removed for brevity */}
      </div>
    </div>
  );
}

export default MoversAndShakers;