import React from 'react';
import { useCompetition } from '../../contexts/CompetitionContext';
import { toTimeAgoString } from '../../utils/dateFormatters';

/**
 * Component to display the last submitted score for a category
 * @returns {JSX.Element} LastScoreDisplay component
 */
function LastScoreDisplay() {
  const {
    lastSubmittedScore,
    competitors,
    loading,
  } = useCompetition();

  if (loading) {
    return <></>;
  }

  if (!lastSubmittedScore) {
    return (
      <div style={{ marginTop: '20px' }}>
        <p>No scores available for the selected category.</p>
      </div>
    );
  }

  const competitorName = competitors[lastSubmittedScore.competitorNo]?.name || 'Unknown';
  const competitorCategory = competitors[lastSubmittedScore.competitorNo]?.category || null;

  return (
    <div style={{ marginTop: '20px' }}>
      <p>
        {`Last score was submitted at: ${toTimeAgoString(lastSubmittedScore.createdAt)} by ${competitorName}${competitorCategory ? ` in ${competitorCategory}` : ''}`}
      </p>
    </div>
  );
}

export default LastScoreDisplay;