import React from 'react';

import { formatDateForHover, toTimeAgoString } from './utils/dateFormatters';

function SendsSubTable({ sends, categoryCode, isMobile }) {
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
        {sends && sends
          .filter((send) => categoryCode ? send.categoryCode === categoryCode : true)
          .sort((a, b) => a.rank - b.rank)
          .map((send, subIndex) => (
            <tr key={subIndex}>
              <td>{send.rank}</td>
              <td>{send.category || 'TBC'}</td>
              <td>{send.name}</td>
              <td>{send.flashed ? 'Y' : ''}</td>
              <td title={formatDateForHover(send.createdAt)}>{toTimeAgoString(send.createdAt)}</td>
            </tr>
          ))}
      </tbody>
    </table>
  );
}

export default SendsSubTable;