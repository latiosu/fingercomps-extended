import React from 'react';
import './LoadingProgressBar.css';

/**
 * Progress bar component for loading states
 * @param {Object} props - Component props
 * @param {number} props.progress - Progress percentage (0-100)
 * @param {boolean} props.hideOnComplete - Whether to hide the bar when at 100%
 * @returns {JSX.Element} LoadingProgressBar component
 */
function LoadingProgressBar({ progress, hideOnComplete = true }) {
  if (hideOnComplete && progress === 100) {
    return <></>;
  }

  return (
    <div className="loading-progress-container">
      <div className="loading-progress-bar">
        <div 
          className="loading-progress-fill" 
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="loading-progress-text">
        {progress}% loaded
      </div>
    </div>
  );
}

export default LoadingProgressBar;