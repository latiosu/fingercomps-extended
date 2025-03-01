import React from 'react';
import { useApp } from '../contexts/AppContext';
import UserTable from '../components/users/UserTable';
import LastScoreDisplay from '../components/common/LastScoreDisplay';

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