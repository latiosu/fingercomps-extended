import React from 'react';
import ProblemsTable from '../components/problems/ProblemsTable';
import CategorySelector from '../components/common/CategorySelector';
import LastScoreDisplay from '../components/common/LastScoreDisplay';

/**
 * Page component for the problems view
 * @returns {JSX.Element} ProblemsPage component
 */
function ProblemsPage() {
  return (
    <div>
      <div className="filters">
        <CategorySelector />
      </div>
      
      <ProblemsTable />
      
      <LastScoreDisplay />
    </div>
  );
}

export default ProblemsPage;