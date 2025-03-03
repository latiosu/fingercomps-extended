import React from 'react';
import './RankChangeIndicator.css';

/**
 * Component to display rank change indicators
 * @param {Object} props - Component props
 * @param {number|string} props.change - Rank change value or 'new' for new competitors
 * @returns {JSX.Element} RankChangeIndicator component
 */
function RankChangeIndicator({ change }) {
  // Handle new competitors
  if (change === 'new') {
    return (
      <div className="rank-change-indicator new" title="New competitor">
        <span className="rank-change-icon">NEW</span>
      </div>
    );
  }
  
  // Determine icon and color based on change
  const getIndicator = () => {
    if (change > 4) return { icon: '↑↑', color: 'green', label: 'Rising fast', className: 'rising-fast' };
    if (change > 0) return { icon: '↑', color: 'lightgreen', label: 'Rising', className: 'rising' };
    if (change < -4) return { icon: '↓↓', color: 'red', label: 'Falling fast', className: 'falling-fast' };
    if (change < 0) return { icon: '↓', color: 'pink', label: 'Falling', className: 'falling' };
    return { icon: '−', color: 'gray', label: 'Unchanged', className: 'unchanged' };
  };
  
  const indicator = getIndicator();
  
  return (
    <div 
      className={`rank-change-indicator ${indicator.className}`}
      title={`${Math.abs(change)} positions ${change > 0 ? 'up' : change < 0 ? 'down' : 'unchanged'}`}
    >
      <span className="rank-change-icon">{indicator.icon}</span>
      {change !== 0 && <span className="rank-change-value">{Math.abs(change)}</span>}
    </div>
  );
}

export default RankChangeIndicator;