import React from 'react';
import LastScoreDisplay from '../components/common/LastScoreDisplay';
import UserTable from '../components/users/UserTable';
import { useApp } from '../contexts/AppContext';

/**
 * Page component for the users view
 * @returns {JSX.Element} UsersPage component
 */
function UsersPage() {
  const { setRecommendModalUser } = useApp();

  return (
    <>
      <UserTable onRecommendClick={setRecommendModalUser} />
      <LastScoreDisplay />
    </>
  );
}

export default UsersPage;