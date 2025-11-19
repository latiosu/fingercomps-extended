import React from 'react';
import { AppProvider, useApp } from "./contexts/AppContext";
import { CompetitionProvider } from "./contexts/CompetitionContext";
import FinalsScoreboard from './components/common/FinalsScoreboard';

/**
 * Page component for the users view
 * @returns {JSX.Element} UsersPage component
 */
function AppContent() {
  const {
    selectedCompId,
  } = useApp();
  
  const category = new URLSearchParams(window.location.search).get('category');
  const allowedUsers = new URLSearchParams(window.location.search).get('allowedUsers') ?? null;

  return (
    <>
      <CompetitionProvider competitionId={selectedCompId}>
        <FinalsScoreboard
          category={category}
          allowedUsers={allowedUsers}
        />
      </CompetitionProvider>
    </>
  );
}

function FinalsScoreboardApp() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default FinalsScoreboardApp;