import React from 'react';
import LastScoreDisplay from '../components/common/LastScoreDisplay';
import ProblemsTable from '../components/problems/ProblemsTable';

/**
 * Page component for the problems view
 * @returns {JSX.Element} ProblemsPage component
 */
function ProblemsPage() {
  return (
    <>
      <ProblemsTable />
      <LastScoreDisplay />
    </>
  );
}

export default ProblemsPage;