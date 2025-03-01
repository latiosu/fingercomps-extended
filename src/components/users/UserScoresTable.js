import React from 'react';
import { toTimeAgoString, formatDateForHover } from '../../utils/dateFormatters';

/**
 * Component to display a user's scores
 * @param {Object} props - Component props
 * @param {Array} props.scores - Array of user scores
 * @param {boolean} props.limitScores - Whether to limit scores to those that affect the total
 * @param {number} props.categoryPumpfestTopScores - Number of top scores to count for the category
 * @param {number} props.flashExtraPoints - Extra points for flashing a problem
 * @param {boolean} props.isMobile - Whether the device is mobile
 * @returns {JSX.Element} UserScoresTable component
 */
function UserScoresTable({ 
  scores = [], 
  limitScores = true, 
  categoryPumpfestTopScores = 0, 
  flashExtraPoints = 0, 
  isMobile = false 
}) {
  // Limit the number of scores based on the checkbox state
  const displayedScores = limitScores 
    ? scores.slice(0, categoryPumpfestTopScores) 
    : scores;

  return (
    <table border="1" className="subTable" style={{ width: '100%' }}>
      <thead>
        <tr className="subTableHeader">
          <th>Problem{!isMobile && " No."}</th>
          <th>Name{!isMobile && "/Grade"}</th>
          <th>Flashed?</th>
          <th>Points{!isMobile && " (+ Flash Bonus)"}</th>
          <th>Sent</th>
        </tr>
      </thead>
      <tbody>
        {displayedScores.length > 0 ? (
          displayedScores.map((score, index) => (
            <tr key={index}>
              <td>{score.climbNo}</td>
              <td>{score.marking}</td>
              <td>{score.flashed ? 'Y' : ''}</td>
              <td>
                {score.score} 
                {score.flashed ? ` (+${flashExtraPoints})` : ''}
              </td>
              <td title={formatDateForHover(score.createdAt)}>
                {toTimeAgoString(score.createdAt)}
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan="5">No scores available</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

export default UserScoresTable;