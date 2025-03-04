import React, { useEffect, useState } from 'react';
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
    loading,
    selectedCategoryCode,
  } = useCompetition();
  const { rankChanges, significantChanges } = useRankHistory();
  const [selectedCompetitor, setSelectedCompetitor] = useState(null);

  // Clear selected competitor when search term changes or is cleared
  useEffect(() => {
    if (!searchTerm || searchTerm !== selectedCompetitor) {
      setSelectedCompetitor(null);
    }
  }, [searchTerm, selectedCompetitor]);

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

  const competitor = competitors[lastSubmittedScore.competitorNo] || { name: 'Unknown', category: null, rank: null };
  const competitorName = competitor.name;

  // Find rank change for this competitor if available
  const rankChange = rankChanges.find(rc => rc.competitorNo === lastSubmittedScore.competitorNo);

  // Get the most up-to-date rank from significantChanges if available
  let currentRank = competitor.rank;

  // Check if this competitor is in the risers or fallers list to get the most up-to-date rank
  const { risers, fallers } = significantChanges;
  const matchingRiser = risers.find(r => r.competitorNo === lastSubmittedScore.competitorNo);
  const matchingFaller = fallers.find(f => f.competitorNo === lastSubmittedScore.competitorNo);

  if (matchingRiser) {
    currentRank = matchingRiser.rank;
  } else if (matchingFaller) {
    currentRank = matchingFaller.rank;
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