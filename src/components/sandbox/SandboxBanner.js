import React from 'react';
import { useSandbox } from '../../contexts/SandboxContext';
import './Sandbox.css';

/**
 * Banner shown while sandbox (what-if) mode is active.
 * @param {Object} props - Component props
 * @param {Function} props.onAddTops - Function to open the add-tops modal
 * @returns {JSX.Element|null} SandboxBanner component
 */
function SandboxBanner({ onAddTops }) {
  const {
    sandboxMode,
    theoreticalTopsCount,
    modifiedCompetitorCount,
    clearTheoreticalScores,
    exitSandbox,
  } = useSandbox();

  if (!sandboxMode) {
    return null;
  }

  return (
    <div className="sandbox-banner">
      <div className="sandbox-banner-title">
        🧪 Sandbox mode — rankings below are theoretical
      </div>
      <div>
        {theoreticalTopsCount > 0 ? (
          <span>
            {theoreticalTopsCount} theoretical top{theoreticalTopsCount !== 1 ? 's' : ''} across{' '}
            {modifiedCompetitorCount} competitor{modifiedCompetitorCount !== 1 ? 's' : ''}.
            Real competition results are not affected.
          </span>
        ) : (
          <span>
            Add theoretical tops to one or more competitors to see how rankings would change.
            Real competition results are not affected.
          </span>
        )}
      </div>
      <div className="sandbox-banner-actions">
        <button className="sandbox-add-btn" onClick={onAddTops}>
          ➕ Add theoretical tops
        </button>
        <button
          className="sandbox-clear-btn"
          onClick={clearTheoreticalScores}
          disabled={theoreticalTopsCount === 0}
        >
          Clear all theoretical tops
        </button>
        <button className="sandbox-exit-btn" onClick={exitSandbox}>
          Exit sandbox
        </button>
      </div>
    </div>
  );
}

export default SandboxBanner;
