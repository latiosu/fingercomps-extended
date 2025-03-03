import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { useCompetition } from '../../contexts/CompetitionContext';

/**
 * Component for selecting categories
 * @returns {JSX.Element} CategorySelector component
 */
function CategorySelector() {
  const {
    selectedCategory,
    setSelectedCategory,
    setSelectedCategoryCode
  } = useApp();

  const { categories, loading } = useCompetition();

  const handleChange = (e) => {
    setSelectedCategory(e.target.value);
    setSelectedCategoryCode(e.target.selectedOptions[0].dataset.code || "");
  };

  return (
    <div>
      <label htmlFor="filterCategory">Show Category:</label>
      <select
        id="filterCategory"
        value={selectedCategory}
        onChange={handleChange}
        disabled={loading}
      >
        <option value="">All</option>
        {Object.values(categories).map((item, index) => (
          <option key={index} value={item.name} data-code={item.code}>
            {item.name || 'TBC'}
          </option>
        ))}
      </select>
    </div>
  );
}

export default CategorySelector;