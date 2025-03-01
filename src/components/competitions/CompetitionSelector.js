import React from 'react';
import { useApp } from '../../contexts/AppContext';

/**
 * Component for selecting competitions
 * @returns {JSX.Element} CompetitionSelector component
 */
function CompetitionSelector() {
  const { 
    comps, 
    selectedCompId, 
    loading, 
    handleCompetitionChange 
  } = useApp();

  const handleChange = (e) => {
    const newComp = e.target.options[e.target.selectedIndex].text;
    const newCompId = e.target.value;
    handleCompetitionChange(newComp, newCompId);
  };

  // Sort competitions alphabetically by name
  const sortedComps = [...comps].sort((a, b) =>
    (a.document?.fields?.name?.stringValue || '').localeCompare(b.document?.fields?.name?.stringValue || '')
  );

  return (
    <div>
      <label htmlFor="selectComp">Select Competition:</label>
      <select
        id="selectComp"
        value={selectedCompId}
        onChange={handleChange}
        disabled={loading}
      >
        <option value="">Select a competition</option>
        {sortedComps.map((item, index) => (
          <option key={index} value={item.document?.name.split('/').pop()}>
            {item.document?.fields?.name?.stringValue}
          </option>
        ))}
      </select>
    </div>
  );
}

export default CompetitionSelector;