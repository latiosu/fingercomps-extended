import React, { useState } from 'react';
import LastScoreDisplay from '../components/common/LastScoreDisplay';
import UserTable from '../components/users/UserTable';
import { useApp } from '../contexts/AppContext';

/**
 * Page component for the users view
 * @returns {JSX.Element} UsersPage component
 */
function UsersPage() {
  const { setRecommendModalUser } = useApp();
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <>
      <UserTable
        onRecommendClick={setRecommendModalUser}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />
      <LastScoreDisplay
        onCompetitorClick={setSearchTerm}
        searchTerm={searchTerm}
      />
    </>
  );
}

export default UsersPage;