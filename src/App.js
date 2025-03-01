import React from "react";
import { useFeatureFlagEnabled } from 'posthog-js/react';
import { AppProvider, useApp } from "./contexts/AppContext";
import { CompetitionProvider } from "./contexts/CompetitionContext";
import CompetitionSelector from "./components/competitions/CompetitionSelector";
import ViewToggle from "./components/common/ViewToggle";
import UsersPage from "./pages/UsersPage";
import ProblemsPage from "./pages/ProblemsPage";
import RecommendModal from "./components/recommendations/RecommendModal";
import loadPosthog from "./utils/analytics";

/**
 * Main application component
 * @returns {JSX.Element} App component
 */
function AppContent() {
  // Load PostHog for analytics
  loadPosthog();
  
  // Get app state from context
  const { 
    selectedCompId, 
    compNotFoundMessage, 
    focusView,
    recommendModalUser,
    setRecommendModalUser
  } = useApp();

  return (
    <div className="app">
      <h1>FingerComps Extended</h1>
      
      <div className="filters">
        <CompetitionSelector />
        
        {selectedCompId && (
          <ViewToggle />
        )}
      </div>
      
      {/* Competition not found message */}
      {compNotFoundMessage && (
        <div style={{ margin: '20px 0', padding: '10px', backgroundColor: '#fff3cd', color: '#856404', borderRadius: '4px' }}>
          {compNotFoundMessage}
        </div>
      )}
      
      {/* Main content */}
      {selectedCompId && (
        <CompetitionProvider competitionId={selectedCompId}>
          {focusView === 'user' ? (
            <UsersPage />
          ) : (
            <ProblemsPage />
          )}
          
          {/* Recommendation modal */}
          {recommendModalUser && (
            <RecommendModal
              onClose={() => setRecommendModalUser(null)}
              user={recommendModalUser}
            />
          )}
        </CompetitionProvider>
      )}
    </div>
  );
}

/**
 * App component with context providers
 * @returns {JSX.Element} App with providers
 */
function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;