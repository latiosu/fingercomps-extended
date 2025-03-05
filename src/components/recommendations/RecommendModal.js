import React, { useMemo, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useCompetition } from '../../contexts/CompetitionContext';
import useExpandableRows from '../../hooks/useExpandableRows';
import { getMainLocation, getRecommendedProblems } from '../../utils/scoreCalculators';
import SendsSubTable from '../common/SendsSubTable';
import './RecommendModal.css';

/**
 * Modal component for recommending problems to a user
 * @param {Object} props - Component props
 * @param {Function} props.onClose - Function to call when the modal is closed
 * @param {Object} props.user - User to recommend problems for
 * @returns {JSX.Element} RecommendModal component
 */
function RecommendModal({ onClose, user }) {
  const { isMobile } = useApp();
  const {
    problems,
    scores,
    categories,
    userTableData
  } = useCompetition();

  const { expandedRows, toggleRow } = useExpandableRows();

  // Get category users and current user's rank
  const categoryUsers = userTableData.filter(u => u.category === user.category);
  const currentUserIndex = categoryUsers.findIndex(u => u.competitorNo === user.competitorNo);

  // Check if there are any problems that increase rank
  const hasRankIncreasingProblems = useMemo(() => {
    // Get user's scores
    const userScores = scores[user.competitorNo] || [];

    // Get category data
    const category = categories[user.category];

    // Get all recommended problems without filtering by showNonRankingProblems
    const allRecommendedProblems = getRecommendedProblems(
      problems,
      userScores,
      user,
      categoryUsers,
      category,
      false, // sortByOverallTops
      true,  // showNonRankingProblems (show all problems)
      ''     // selectedLocation
    );

    // Check if any problem increases rank
    return allRecommendedProblems.some(problem => problem.rankImprovement > 0);
  }, [problems, scores, user, categoryUsers, categories]);

  // State for filtering options
  const [showNonRankingProblems, setShowNonRankingProblems] = useState(currentUserIndex === 0 || !hasRankIncreasingProblems);
  const [sortByOverallTops, setSortByOverallTops] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('');

  // Get user's scores
  const userScores = scores[user.competitorNo] || [];

  // Get category data
  const category = categories[user.category];

  // Get unique locations from problems and organize them into groups
  const locationGroups = useMemo(() => {
    // Collect all unique locations
    const locationSet = new Set();
    Object.values(problems).forEach(problem => {
      if (problem.station) {
        locationSet.add(problem.station);
      }
    });
    const allLocations = Array.from(locationSet);

    // Group locations by their main part
    const groups = {};
    allLocations.forEach(location => {
      const mainLocation = getMainLocation(location);

      if (!groups[mainLocation]) {
        groups[mainLocation] = {
          name: mainLocation,
          locations: []
        };
      }

      groups[mainLocation].locations.push(location);
    });

    // Sort locations within each group
    Object.values(groups).forEach(group => {
      group.locations.sort((a, b) => {
        // Put the main location (exact match to group name) first
        if (getMainLocation(a) === a && getMainLocation(b) !== b) return -1;
        if (getMainLocation(a) !== a && getMainLocation(b) === b) return 1;
        // Otherwise sort alphabetically
        return a.localeCompare(b);
      });
    });

    // Sort groups alphabetically
    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  }, [problems]);

  // Get recommended problems
  const recommendedProblems = getRecommendedProblems(
    problems,
    userScores,
    user,
    categoryUsers,
    category,
    sortByOverallTops,
    showNonRankingProblems,
    selectedLocation
  );

  // Calculate points needed for next rank
  const pointsNeededForNextRank = currentUserIndex > 0
    ? categoryUsers[currentUserIndex - 1].total - user.total
    : 0;

  // Helper function to get tops count based on sort mode
  const getTopCount = (problem) => {
    if (sortByOverallTops) {
      return Object.values(problem.stats || {}).reduce((sum, stat) => sum + (stat.tops || 0), 0);
    }
    return problem.stats?.[user.category]?.tops || 0;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Recommended Problems for {user.name}</h2>
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
            {locationGroups?.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label htmlFor="location-filter">Filter by location:</label>
                <select
                  id="location-filter"
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  style={{ padding: '4px', borderRadius: '4px' }}
                >
                  <option value="">All locations</option>
                  {locationGroups.map(group => (
                    <option key={group.name} value={group.name}>{group.name}</option>
                  ))}
                </select>
              </div>
            )}
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
                <th>{sortByOverallTops ? "Overall" : (user.category || "Category")} Tops</th>
              </tr>
            </thead>
            <tbody>
              {recommendedProblems.length > 0 ? (
                recommendedProblems.map(problem => {
                  const isExpanded = expandedRows.has(problem.climbNo);
                  const totalColumns = isMobile ? 5 : 6;

                  return (
                    <React.Fragment key={problem.climbNo}>
                      <tr
                        onClick={() => toggleRow(problem.climbNo)}
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
                            <div>
                              <h4 style={{margin: '5px'}}>Others who topped Problem {problem.climbNo}</h4>
                              <SendsSubTable
                                sends={problem.sends}
                                categoryCode={sortByOverallTops ? "" : user.category}
                                isMobile={isMobile}
                                emptyText="No one yet. Could you be the first? 👀"
                              />
                            </div>
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
          <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
            <p>
              <strong>How does this work?</strong><br/>
              Recommended problems are sorted by most tops, then greatest rank change, then most points.
              Clicking a row will show other competitors who have topped that problem.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RecommendModal;