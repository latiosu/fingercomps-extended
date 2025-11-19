import React from 'react';
import { useCompetition } from '../../contexts/CompetitionContext';
import './FinalsScoreboard.css';

/**
 * Component to display the last submitted score for a category
 * @param {Object} props - Component props
 * @param {String} props.category - Category code to filter results for
 * @param {Array} props.allowedUsers - Allow list of competitor IDs to be shown
 * @returns {JSX.Element} FinalsScoreboard component
 */
function FinalsScoreboard({ category, allowedUsers }) {
  const {
    finalsScoreboardData,
    loading,
  } = useCompetition();

  if (loading || Object.keys(finalsScoreboardData).length === 0) {
    return <>Loading</>;
  }

  if (!Object.keys(finalsScoreboardData).includes(category)) {
    return <>Category does not exist or have a finals round, please check the URL and try again</>
  }

  const data = category ? finalsScoreboardData[category].filter((user) => allowedUsers ? allowedUsers.includes(user.competitorNo) : true) : finalsScoreboardData;

  // TODO: Render the data
  return (
    <>TODO</>
  );
}

export default FinalsScoreboard;