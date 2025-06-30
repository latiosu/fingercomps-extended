import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { trackCompetitorViewClicked, trackRoutesetterViewClicked } from '../../utils/analytics';

/**
 * Component for toggling between user and problem views
 * @returns {JSX.Element} ViewToggle component
 */
function ViewToggle() {
  const { focusView, setFocusView, loading, selectedCompId } = useApp();

  const handleClick = (view) => {
    setFocusView(view);

    // Save view preference to localStorage for this competition
    if (selectedCompId) {
      localStorage.setItem(`focusView_${selectedCompId}`, view);
    }

    // Track when user switches to Routesetter View
    if (view === 'problems' && selectedCompId) {
      trackRoutesetterViewClicked(selectedCompId);
    } else if (view === 'user' && selectedCompId) {
      trackCompetitorViewClicked(selectedCompId);
    }
  };

  const buttonStyle = {
    padding: '4px 8px',
    margin: '0px 4px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#FFD68A',
    borderRadius: '4px',
    background: 'white',
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.7 : 1,
  };

  const activeButtonStyle = {
    ...buttonStyle,
    background: '#118eff',
    color: 'white',
    borderColor: '#FFD68A',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <div>
        <button
          id="users-button"
          style={focusView === 'user' ? activeButtonStyle : buttonStyle}
          onClick={() => handleClick('user')}
          disabled={loading}
        >
          Competitor Stats
        </button>
        <button
          id="problems-button"
          style={focusView === 'problems' ? activeButtonStyle : buttonStyle}
          onClick={() => handleClick('problems')}
          disabled={loading}
        >
          Problem Stats
        </button>
      </div>
    </div>
  );
}

export default ViewToggle;