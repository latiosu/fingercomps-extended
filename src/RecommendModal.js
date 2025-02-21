import React from 'react';
import './RecommendModal.css';
import SendsSubTable from './SendsSubTable';

import { formatDateForHover, toTimeAgoString } from './utils/dateFormatters';

function RecommendModal({ onClose, problems, userScores, userCategory, categories, isMobile, userTableData, currentUser }) {
  const [expandedRows, setExpandedRows] = React.useState(new Set());
  // Get category users and current user's rank
  const categoryUsers = userTableData.filter(user => user.category === userCategory);
  const currentUserIndex = categoryUsers.findIndex(u => u.competitorNo === currentUser.competitorNo);

  const [showNonRankingProblems, setShowNonRankingProblems] = React.useState(currentUserIndex === 0);
  const [sortByOverallTops, setSortByOverallTops] = React.useState(false);

  // Get user's lowest scoring top that counts towards their total
  const flashPoints = categories[userCategory]?.flashExtraPoints || 0;
  const sortedUserScores = [...(userScores || [])]
    .map(s => ({ ...problems[s?.climbNo], ...s }))
    .sort((a, b) => {
      const aTotal = a.score + (a.flashed ? flashPoints : 0);
      const bTotal = b.score + (b.flashed ? flashPoints : 0);
      return bTotal - aTotal;
    });

  const lowestCountingScore = sortedUserScores[categories[userCategory]?.pumpfestTopScores - 1]?.score || 0;
  const pointsNeededForNextRank = currentUserIndex > 0
    ? categoryUsers[currentUserIndex - 1].total - currentUser.total
    : 0;

  // Helper function to calculate total score with a new problem
  const calculateNewTotal = (newProblemScore) => {
    const newScores = [...sortedUserScores];
    newScores.push({ score: newProblemScore, flashed: false });
    return newScores
      .sort((a, b) => (b.score + (b.flashed ? flashPoints : 0)) - (a.score + (a.flashed ? flashPoints : 0)))
      .slice(0, categories[userCategory]?.pumpfestTopScores)
      .reduce((sum, s) => sum + s.score + (s.flashed ? flashPoints : 0), 0);
  };

  // Helper function to calculate rank change
  const calculateRankChange = (newTotal) => {
    const updatedCategoryUsers = categoryUsers.map(user => {
      if (user.competitorNo === currentUser.competitorNo) {
        return { ...user, total: newTotal };
      }
      return user;
    });
    updatedCategoryUsers.sort((a, b) => b.total - a.total);
    const newRank = updatedCategoryUsers.findIndex(u => u.competitorNo === currentUser.competitorNo) + 1;
    return currentUserIndex + 1 - newRank;
  };

  // Helper function to get tops count based on sort mode
  const getTopCount = (problem) => {
    if (sortByOverallTops) {
      return Object.values(problem.stats || {}).reduce((sum, stat) => sum + (stat.tops || 0), 0);
    }
    return problem.stats?.[userCategory]?.tops || 0;
  };

  // Filter and process problems
  const currentTotal = sortedUserScores
    .slice(0, categories[userCategory]?.pumpfestTopScores)
    .reduce((sum, s) => sum + s.score + (s.flashed ? flashPoints : 0), 0);

  const recommendedProblems = Object.values(problems)
    .filter(problem => {
      // Check if user hasn't topped it
      const hasTopped = userScores?.some(s => s.climbNo === problem.climbNo && s.topped);
      if (hasTopped) return false;

      // Check if worth more points than user's lowest counting top
      if (problem.score <= lowestCountingScore) return false;

      // If not at rank 1, check if problem provides at least 50% of points needed
      if (currentUserIndex > 0) {
        const newTotal = calculateNewTotal(problem.score);
        const additionalPoints = newTotal - currentTotal;
        if (additionalPoints < pointsNeededForNextRank * 0.5) return false;
      }

      return true;
    })
    .map(problem => {
      const newTotal = calculateNewTotal(problem.score);
      return {
        ...problem,
        additionalPoints: newTotal - currentTotal,
        rankImprovement: calculateRankChange(newTotal)
      };
    })
    .sort((a, b) => {
      const aTops = getTopCount(a);
      const bTops = getTopCount(b);
      if (bTops !== aTops) {
        return bTops - aTops;
      }
      return b.score - a.score;
    });

  // Filter based on rank improvement and checkbox state
  const filteredProblems = recommendedProblems.filter(problem =>
    showNonRankingProblems || problem.rankImprovement > 0
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxHeight: '80vh' }}>
        <div className="modal-header">
          <h2>Recommended Problems for {currentUser.name}</h2>
          <button onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={showNonRankingProblems}
                onChange={(e) => setShowNonRankingProblems(e.target.checked)}
              />
              Show problems that don't change rank
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={sortByOverallTops}
                onChange={(e) => setSortByOverallTops(e.target.checked)}
              />
              Use overall tops instead of category tops
            </label>
          </div>
          {currentUserIndex > 0 && (
            <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
              <strong>{pointsNeededForNextRank} points</strong> till next rank (#{currentUserIndex})
            </div>
          )}
          <table border="1" className="mainTable">
            <thead className="tableHeader">
              <tr>
                <th>Problem{!isMobile && " No."}</th>
                <th>Name{!isMobile && "/Grade"}</th>
                {!isMobile && <th>Points</th>}
                <th>{!isMobile && "Additional "}Points</th>
                <th>Rank Change</th>
                <th>{sortByOverallTops ? "Overall" : (userCategory || "Category")} Tops</th>
              </tr>
            </thead>
            <tbody>
              {filteredProblems.length > 0 ? (
                filteredProblems.map(problem => {
                  const isExpanded = expandedRows.has(problem.climbNo);
                  const totalColumns = isMobile ? 5 : 6;

                  return (
                    <React.Fragment key={problem.climbNo}>
                      <tr
                        onClick={() => {
                          setExpandedRows(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(problem.climbNo)) {
                              newSet.delete(problem.climbNo);
                            } else {
                              newSet.add(problem.climbNo);
                            }
                            return newSet;
                          });
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>{problem.climbNo}</td>
                        <td>{problem.marking}</td>
                        {!isMobile && <td>{problem.score}</td>}
                        <td>+{problem.additionalPoints}</td>
                        <td style={{ backgroundColor: problem.rankImprovement > 0 ? '#e6ffe6' : 'transparent' }}>
                          {problem.rankImprovement > 0 ? `+${problem.rankImprovement}` : '0'}
                        </td>
                        <td>{getTopCount(problem)}</td>
                      </tr>
                      {isExpanded && (
                        <tr className="subTableContainer">
                          <td colSpan={totalColumns}>
                            <SendsSubTable
                              sends={problem.sends}
                              categoryCode={userCategory}
                              isMobile={isMobile}
                              toTimeAgoString={toTimeAgoString}
                              formatDateForHover={formatDateForHover}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={isMobile ? 5 : 6}>No recommendations available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default RecommendModal;