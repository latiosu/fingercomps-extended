import React from 'react';
import { useApp } from '../../contexts/AppContext';

/**
 * Component for selecting categories
 * @param {Object} props - Component props
 * @param {Array} props.categories - Array of categories
 * @param {boolean} props.loading - Whether the table is loading
 * @returns {JSX.Element} CategorySelector component
 */
function CategorySelector({ categories = [], loading = false}) {
  const { 
    selectedCategory, 
    setSelectedCategory, 
    setSelectedCategoryCode 
  } = useApp();

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