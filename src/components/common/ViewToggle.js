import React from 'react';
import { useApp } from '../../contexts/AppContext';

/**
 * Component for toggling between user and problem views
 * @returns {JSX.Element} ViewToggle component
 */
function ViewToggle() {
  const { focusView, setFocusView, loading } = useApp();

  const handleChange = (e) => {
    setFocusView(e.target.value);
  };

  return (
    <div>
      <label htmlFor="focusView">Focus on:</label>
      <select
        id="focusView"
        value={focusView}
        onChange={handleChange}
        disabled={loading}
      >
        <option value="user" id="users-option">
          Users
        </option>
        <option value="problems" id="problems-option">
          Problems
        </option>
      </select>
    </div>
  );
}

export default ViewToggle;