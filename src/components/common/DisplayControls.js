import React from "react";
import { useApp } from "../../contexts/AppContext";
import { useCompetition } from "../../contexts/CompetitionContext";

/**
 * Component for changing problems display settings
 * @returns {JSX.Element|null} DisplayControls component
 */
function DisplayControls() {
  const {
    focusView,
    selectedCompId,
    showRawCounts,
    setShowRawCounts,
    showOverallTopsFlashes,
    setShowOverallTopsFlashes,
  } = useApp();
  const { loading, loadingProgress } = useCompetition();

  if (focusView !== "problems" || !selectedCompId) {
    return null;
  }

  const disabled = loading && loadingProgress < 100;

  return (
    <div role="group" aria-label="Display settings">
      <span>Display:</span>
      <label>
        <input
          type="checkbox"
          checked={showRawCounts}
          onChange={() => setShowRawCounts(!showRawCounts)}
          disabled={disabled}
        />
        Show raw counts
      </label>
      <label>
        <input
          type="checkbox"
          checked={showOverallTopsFlashes}
          onChange={() =>
            setShowOverallTopsFlashes(!showOverallTopsFlashes)
          }
          disabled={disabled}
        />
        Show overall tops & flashes
      </label>
    </div>
  );
}

export default DisplayControls;
