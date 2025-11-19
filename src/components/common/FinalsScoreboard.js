import React, { useEffect } from 'react';
import { useCompetition } from '../../contexts/CompetitionContext';
import './FinalsScoreboard.css';

/**
 * Component to display the last submitted score for a category
 * @param {Object} props - Component props
 * @param {String} props.category - Category code to filter results for
 * @param {Array} props.allowedUsers - Allow list of strings of competitor IDs to be shown
 * @returns {JSX.Element} FinalsScoreboard component
 */
function FinalsScoreboard({ category, allowedUsers }) {
  const {
    finalsScoreboardData,
    loading,
    refreshFinalsScores,
  } = useCompetition();

  // Set up polling to refresh finals scores every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshFinalsScores();
    }, 15000); // 15 seconds

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, [refreshFinalsScores]);

  if (loading || Object.keys(finalsScoreboardData).length === 0) {
    return <>Loading</>;
  }

  if (!Object.keys(finalsScoreboardData).includes(category)) {
    return <>Category does not exist or have a finals round, please check the URL and try again</>
  }

  let data = finalsScoreboardData[category];
  if (allowedUsers && category) {
    const parsedUsers = allowedUsers.split(',').map(item => parseInt(item));
    data = data.filter((user) => parsedUsers ? parsedUsers.includes(user.competitorNo) : true);
  }

  if (!data || data.length === 0) {
    return <>No data available for this category</>;
  }

  // Recalculate ranks after filtering
  const allScoresZero = data.every(competitor => competitor.score === 0);

  if (allScoresZero) {
    // If all scores are zero, set rank to "-"
    data = data.map(competitor => ({
      ...competitor,
      rank: "-"
    }));
    
    // Order by allowedUsers sequence if provided
    if (allowedUsers) {
      const parsedUsers = allowedUsers.split(',').map(item => parseInt(item));
      data = data.sort((a, b) => {
        const indexA = parsedUsers.indexOf(a.competitorNo);
        const indexB = parsedUsers.indexOf(b.competitorNo);
        return indexA - indexB;
      });
    }
  } else {
    // Sort by score descending to calculate proper ranks
    const sortedData = [...data].sort((a, b) => b.score - a.score);

    // Assign ranks with tie handling
    let currentRank = 1;
    for (let i = 0; i < sortedData.length; i++) {
      if (i > 0 && sortedData[i].score === sortedData[i - 1].score) {
        // Same score as previous, use same rank
        sortedData[i].rank = sortedData[i - 1].rank;
      } else {
        // Different score, use current position + 1
        sortedData[i].rank = currentRank;
      }
      currentRank++;
    }

    data = sortedData;
  }

  console.info(data);

  const categoryFullName = data[0]?.categoryFullName || category;

  return (
    <>
      <div className="finals-scoreboard">
        <h1 className="scoreboard-title">{categoryFullName}</h1>
        <div className="scoreboard-table">
          {data.map((competitor) => (
            <div key={competitor.competitorNo} className="competitor-row">
              <div className="rank">{competitor.rank}</div>
              <div className="name">{competitor.name}</div>
              <div className="problems">
                {competitor.topZoneStats.map((problem, index) => (
                  <div key={index} className="problem-box">
                    <div
                      className={`problem-indicator ${problem.hasTop ? 'has-top' : problem.hasZone ? 'has-zone' : problem.attemptsToTop + problem.attemptsToZone > 0 ? 'no-achievement' : ''}`}
                    >
                      <div className="attempts-top">{problem.hasTop ? problem.attemptsToTop : '\u00A0'}</div>
                      <div className="attempts-zone">{problem.hasZone ? problem.attemptsToZone : '\u00A0'}</div>
                    </div>
                    <div className="problem-number">{index + 1}</div>
                  </div>
                ))}
              </div>
              <div className="score">{competitor.score.toFixed(1)}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default FinalsScoreboard;