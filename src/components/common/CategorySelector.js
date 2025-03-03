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
    setSelectedCategoryCode,
    selectedCompId
  } = useApp();

  const { categories } = useCompetition();

  const handleChange = (e) => {
    const category = e.target.value;
    const categoryCode = e.target.selectedOptions[0].dataset.code || "";
    
    setSelectedCategory(category);
    setSelectedCategoryCode(categoryCode);
    
    // Only save to localStorage if a competition is selected
    if (selectedCompId) {
      // Save category with competition ID as part of the key
      localStorage.setItem(`category_${selectedCompId}`, category);
      localStorage.setItem(`categoryCode_${selectedCompId}`, categoryCode);
    }
  };

  return (
    <div>
      <label htmlFor="filterCategory">Show Category:</label>
      <select
        id="filterCategory"
        value={selectedCategory}
        onChange={handleChange}
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