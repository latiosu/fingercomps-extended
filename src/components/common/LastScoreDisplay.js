import React, { useEffect, useMemo, useState } from 'react';
import { useCompetition } from '../../contexts/CompetitionContext';
import { useRankHistory } from '../../contexts/RankHistoryContext';
import { toTimeAgoString } from '../../utils/dateFormatters';
import ClickableCompetitor from './ClickableCompetitor';
import './LastScoreDisplay.css';

/**
 * Component to display the last submitted score for a category
 * @param {Object} props - Component props
 * @param {Function} props.onCompetitorClick - Function to call when a competitor is clicked
 * @param {string} props.searchTerm - Current search term
 * @returns {JSX.Element} LastScoreDisplay component
 */
function LastScoreDisplay({ onCompetitorClick, searchTerm }) {
  const {
    lastSubmittedScore,
    competitors,
    userTableData,
    loading,
    selectedCategoryCode,
  } = useCompetition();
  const { rankChanges } = useRankHistory();
  const [selectedCompetitor, setSelectedCompetitor] = useState(null);

  // Clear selected competitor when search term changes or is cleared
  useEffect(() => {
    if (!searchTerm || searchTerm !== selectedCompetitor) {
      setSelectedCompetitor(null);
    }
  }, [searchTerm, selectedCompetitor]);

  const submittedCompetitorNo = lastSubmittedScore?.competitorNo;
  const competitor = submittedCompetitorNo
    ? competitors[submittedCompetitorNo] || { name: 'Unknown', category: null, rank: null }
    : null;
  const competitorName = competitor?.name;
  const rankChange = rankChanges.find(rc => rc.competitorNo === submittedCompetitorNo);
  const currentRank = useMemo(() => {
    if (!submittedCompetitorNo) {
      return null;
    }

    if (selectedCategoryCode) {
      let rank = 0;
      let lastTotal = null;

      const categoryRows = userTableData
        .filter(user => user.category === selectedCategoryCode)
        .sort((a, b) => b.total - a.total);

      for (let index = 0; index < categoryRows.length; index += 1) {
        const user = categoryRows[index];

        if (lastTotal === null || user.total !== lastTotal) {
          rank = index + 1;
          lastTotal = user.total;
        }

        if (user.competitorNo === submittedCompetitorNo) {
          return rank;
        }
      }
    }

    const userRow = userTableData.find(user => user.competitorNo === submittedCompetitorNo);
    return userRow?.rank || competitor?.rank || null;
  }, [competitor?.rank, submittedCompetitorNo, selectedCategoryCode, userTableData]);

  if (loading) {
    return <></>;
  }

  if (!lastSubmittedScore) {
    return (
      <div className="last-score-container">
        <p className="last-score-text">No scores available for the selected category.</p>
      </div>
    );
  }

  // Prepare the clickable competitor
  const handleCompetitorClick = () => {
    // Toggle selection - if already selected, clear it
    if (selectedCompetitor === competitorName) {
      setSelectedCompetitor(null);
      onCompetitorClick && onCompetitorClick('');
    } else {
      setSelectedCompetitor(competitorName);
      onCompetitorClick && onCompetitorClick(competitorName);
    }
  };

  return (
    <div className="last-score-container">
      <p className="last-score-text">
        Last {selectedCategoryCode ? selectedCategoryCode : ''} score: {toTimeAgoString(lastSubmittedScore.createdAt)} by
      </p>
      <ClickableCompetitor
        name={competitorName}
        category={competitor.category}
        rank={currentRank}
        rankChange={rankChange ? rankChange.rankChange : undefined}
        isSelected={selectedCompetitor === competitorName}
        onClick={handleCompetitorClick}
      />
    </div>
  );
}

export default LastScoreDisplay;
