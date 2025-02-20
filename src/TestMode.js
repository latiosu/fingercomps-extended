import React from 'react';

const TestMode = ({ onLoadTestData, onSimulateScore }) => {
  return (
    <div style={{ marginTop: '20px', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>
      <h3>Test Mode</h3>
      <button
        onClick={onLoadTestData}
        style={{ marginRight: '10px' }}
      >
        Load Test Data
      </button>
      <button
        onClick={() => onSimulateScore(2)}
        style={{ marginRight: '10px' }}
      >
        Add Score to User 2
      </button>
      <button
        onClick={() => onSimulateScore(3)}
        style={{ marginRight: '10px' }}
      >
        Add Score to User 3
      </button>
      <p style={{ marginTop: '10px' }}>
        Instructions:<br/>
        1. Click "Load Test Data" to initialize test data<br/>
        2. Note the initial rankings<br/>
        3. Click the buttons to add scores and change ranks<br/>
        4. Refresh the page to see rank changes since last visit
      </p>
    </div>
  );
};

export default TestMode;