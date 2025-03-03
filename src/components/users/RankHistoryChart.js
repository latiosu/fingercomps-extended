import React, { useEffect, useState } from 'react';
import { useRankHistory } from '../../contexts/RankHistoryContext';
import './RankHistoryChart.css';

/**
 * Component to display a competitor's rank history as a sparkline chart
 * @param {Object} props - Component props
 * @param {string} props.competitorNo - Competitor number
 * @returns {JSX.Element} RankHistoryChart component
 */
function RankHistoryChart({ competitorNo }) {
  const { getCompetitorRankHistory, timeframe } = useRankHistory();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch rank history when competitor or timeframe changes
  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const data = await getCompetitorRankHistory(competitorNo);
        setHistory(data);
      } catch (error) {
        console.error('Error fetching rank history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [competitorNo, getCompetitorRankHistory, timeframe]);

  // Show loading state
  if (loading) {
    return <div className="rank-history-chart-loading">Loading history...</div>;
  }

  // Show message if not enough data
  if (history.length < 2) {
    return <div className="rank-history-chart-empty">Not enough historical data available</div>;
  }

  // Calculate min and max ranks for normalization
  const maxRank = Math.max(...history.map(h => h.rank));
  const minRank = Math.min(...history.map(h => h.rank));
  const range = maxRank - minRank || 1;

  // Format date based on timeframe
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    switch (timeframe) {
      case 'hourly':
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      case 'daily':
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      case 'weekly':
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      default:
        return date.toLocaleDateString();
    }
  };

  return (
    <div className="rank-history-chart">
      <h4>Rank History</h4>
      <div className="sparkline-container">
        <div className="sparkline">
          {history.map((point, index) => {
            // Normalize rank (inverted, since lower rank is better)
            const normalizedRank = 1 - ((point.rank - minRank) / range);
            const height = `${normalizedRank * 100}%`;

            return (
              <div
                key={index}
                className="sparkline-point"
                style={{ height }}
                title={`${formatDate(point.timestamp)}: Rank ${point.rank}`}
              />
            );
          })}
        </div>

        <div className="chart-labels">
          <div className="y-axis-label top">{minRank}</div>
          <div className="y-axis-label bottom">{maxRank}</div>
        </div>
      </div>

      <div className="chart-legend">
        <div className="legend-item">
          <span className="legend-date">{formatDate(history[0].timestamp)}</span>
          <span className="legend-rank">Rank {history[0].rank}</span>
        </div>
        <div className="legend-item">
          <span className="legend-date">{formatDate(history[history.length - 1].timestamp)}</span>
          <span className="legend-rank">Rank {history[history.length - 1].rank}</span>
        </div>
      </div>
    </div>
  );
}

export default RankHistoryChart;