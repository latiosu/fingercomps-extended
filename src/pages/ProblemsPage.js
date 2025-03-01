import React from 'react';
import ProblemsTable from '../components/problems/ProblemsTable';
import LastScoreDisplay from '../components/common/LastScoreDisplay';

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