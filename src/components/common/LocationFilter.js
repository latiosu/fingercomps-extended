import React from 'react';

/**
 * Reusable location filter component
 * @param {Object} props - Component props
 * @param {Array} props.locationGroups - Array of location groups
 * @param {string} props.selectedLocation - Currently selected location
 * @param {Function} props.onLocationChange - Function to call when location changes
 * @param {string} [props.id="location-filter"] - ID for the select element
 * @param {string} [props.label="Filter by location:"] - Label text
 * @returns {JSX.Element|null} LocationFilter component or null if no locations
 */
function LocationFilter({ locationGroups, selectedLocation, onLocationChange, id = "location-filter", label = "Filter by location:" }) {
  // Don't render if there's only one or no location groups
  if (!locationGroups || locationGroups.length <= 1) {
    return null;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={selectedLocation}
        onChange={(e) => onLocationChange(e.target.value)}
        style={{ padding: '4px', borderRadius: '4px' }}
      >
        <option value="">All locations</option>
        {locationGroups.map(group => (
          <option key={group.name} value={group.name}>{group.name}</option>
        ))}
      </select>
    </div>
  );
}

export default LocationFilter;