import React from 'react';
import { useRankHistory } from '../../contexts/RankHistoryContext';

/**
 * Component to select the time period for rank changes
 * @returns {JSX.Element} RankChangePeriodSelector component
 */
function RankChangePeriodSelector() {
  const { timeframe, setTimeframe, loading } = useRankHistory();
  
  return (
    <div className="rank-change-period-selector">
      <label>Show rank changes for: </label>
      <select 
        value={timeframe} 
        onChange={(e) => setTimeframe(e.target.value)}
        disabled={loading}
      >
        <option value="hourly">Last hour</option>
        <option value="halfday">Last 12 hours</option>
        <option value="daily">Last day</option>
        <option value="threedays">Last 3 days</option>
        <option value="weekly">Last 7 days</option>
      </select>
      {loading && <span className="loading-indicator">Loading...</span>}
    </div>
  );
}

export default RankChangePeriodSelector;