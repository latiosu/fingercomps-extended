import React, { useEffect, useState } from 'react';
import LastScoreDisplay from '../components/common/LastScoreDisplay';
import UserTable from '../components/users/UserTable';
import { useApp } from '../contexts/AppContext';
import { useCompetition } from '../contexts/CompetitionContext';

/**
 * Page component for the users view
 * @returns {JSX.Element} UsersPage component
 */
function UsersPage() {
  const { setRecommendModalUser } = useApp();
  const { competitionId } = useCompetition();

  const searchStorageKey = `users_search_filter_${competitionId}`;
  const [searchTerm, setSearchTerm] = useState(() => {
    try {
      return localStorage.getItem(searchStorageKey) || '';
    } catch (error) {
      console.warn('Unable to access localStorage:', error);
      return '';
    }
  });

  useEffect(() => {
    try {
      if (searchTerm) {
        localStorage.setItem(searchStorageKey, searchTerm);
      } else {
        localStorage.removeItem(searchStorageKey);
      }
    } catch (error) {
      console.warn('Unable to save search term to localStorage:', error);
    }
  }, [searchTerm, searchStorageKey]);

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