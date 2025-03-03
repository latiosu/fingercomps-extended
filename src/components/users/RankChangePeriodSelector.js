import posthog from 'posthog-js';
import React from 'react';
import { useRankHistory } from '../../contexts/RankHistoryContext';

/**
 * Component to select the time period for rank changes
 * @returns {JSX.Element} RankChangePeriodSelector component
 */
function RankChangePeriodSelector() {
  const { timeframe, setTimeframe, loading } = useRankHistory();

  const handleTimeframeChange = (e) => {
    const newTimeframe = e.target.value;
    setTimeframe(newTimeframe);

    // Track timeframe change with PostHog
    if (process.env.NODE_ENV !== "development") {
      posthog.capture('rank_timeframe_changed', {
        component: 'RankChangePeriodSelector',
        previous_timeframe: timeframe,
        new_timeframe: newTimeframe
      });
    }
  };

  return (
    <div className="rank-change-period-selector">
      <label>Show rank changes for: </label>
      <select
        value={timeframe}
        onChange={handleTimeframeChange}
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