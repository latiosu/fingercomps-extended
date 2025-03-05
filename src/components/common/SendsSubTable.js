import React from 'react';
import { toTimeAgoString, formatDateForHover } from '../../utils/dateFormatters';

/**
 * Component to display sends for a problem
 * @param {Object} props - Component props
 * @param {Array} props.sends - Array of sends
 * @param {string} props.categoryCode - Category code to filter by
 * @param {string} props.emptyText - Text to show if no results
 * @param {boolean} props.isMobile - Whether the device is mobile
 * @returns {JSX.Element} SendsSubTable component
 */
function SendsSubTable({ sends = [], categoryCode = "", emptyText = "", isMobile = false }) {
  // Filter sends by category if specified
  const filteredSends = categoryCode
    ? sends.filter(send => send.categoryCode === categoryCode)
    : sends;

  // Sort sends by rank
  const sortedSends = [...filteredSends].sort((a, b) => a.rank - b.rank);

  if (emptyText && sortedSends.length === 0) {
    return (
      <table border="1" className="" style={{ width: '100%', padding: '10px', backgroundColor: '#F9F9F9' }}>
        <thead>
          <tr>
            <em>{emptyText}</em>
          </tr>
        </thead>
      </table>
    );
  }

  return (
    <table border="1" className="subTable" style={{ width: '100%' }}>
      <thead>
        <tr className="subTableHeader">
          <th>{!isMobile && "Overall "}Rank</th>
          <th>Category</th>
          <th>Name</th>
          <th>Flashed?</th>
          <th>Sent</th>
        </tr>
      </thead>
      <tbody>
        {sortedSends.length > 0 ? (
          sortedSends.map((send, index) => (
            <tr key={index}>
              <td>{send.rank}</td>
              <td>{send.category || 'TBC'}</td>
              <td>{send.name}</td>
              <td>{send.flashed ? 'Y' : ''}</td>
              <td title={formatDateForHover(send.createdAt)}>
                {toTimeAgoString(send.createdAt)}
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan="5">No sends available</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

export default SendsSubTable;