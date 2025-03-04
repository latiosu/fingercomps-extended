import React from 'react';
import RankChangeIndicator from '../users/RankChangeIndicator';
import './ClickableCompetitor.css';

/**
 * Shared component for rendering a clickable competitor
 * @param {Object} props - Component props
 * @param {string} props.name - Competitor name
 * @param {string} props.category - Competitor category
 * @param {number} props.rank - Current rank
 * @param {number|string} props.rankChange - Rank change value or 'new' for new competitors
 * @param {boolean} props.isSelected - Whether the competitor is selected
 * @param {boolean} props.showCategory - Whether to show the category
 * @param {boolean} props.fullWidth - Whether the component should take the full width of its parent
 * @param {Function} props.onClick - Function to call when competitor is clicked
 * @returns {JSX.Element} ClickableCompetitor component
 */
function ClickableCompetitor({
  name,
  category,
  rank,
  rankChange,
  isSelected,
  showCategory = true,
  fullWidth = false,
  onClick
}) {
  return (
    <div
      className={`clickable-competitor ${isSelected ? 'selected' : ''} ${fullWidth ? 'full-width' : ''}`}
      onClick={onClick}
      title="Click to search for this competitor"
    >
      {showCategory && category && (
        <span className="competitor-category">[{category}]</span>
      )}
      <span className="competitor-name">{name}</span>
      {rankChange !== undefined && (
        <RankChangeIndicator change={rankChange} />
      )}
      {rank && (
        <span className="current-rank">Now #{rank}</span>
      )}
    </div>
  );
}

export default ClickableCompetitor;