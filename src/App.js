import React from "react";
import CategorySelector from './components/common/CategorySelector';
import ViewToggle from "./components/common/ViewToggle";
import CompetitionSelector from "./components/competitions/CompetitionSelector";
import RecommendModal from "./components/recommendations/RecommendModal";
import { AppProvider, useApp } from "./contexts/AppContext";
import { CompetitionProvider } from "./contexts/CompetitionContext";
import { HighlightedProblemsProvider } from "./contexts/HighlightedProblemsContext";
import { RankHistoryProvider } from "./contexts/RankHistoryContext";
import ProblemsPage from "./pages/ProblemsPage";
import UsersPage from "./pages/UsersPage";
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
      <h1>FingerComps+</h1>

      <div className="filters">
        <ViewToggle />
      </div>

      <div className="filters">
        <CompetitionSelector />
      </div>

      {/* Competition not found message */}
      {compNotFoundMessage && (
        <div style={{ margin: '20px 0', padding: '10px', backgroundColor: '#fff3cd', color: '#856404', borderRadius: '4px' }}>
          {compNotFoundMessage}
        </div>
      )}

      {selectedCompId && (
        <CompetitionProvider competitionId={selectedCompId}>
          <RankHistoryProvider>
            <HighlightedProblemsProvider>
              <div className="filters">
                <CategorySelector />
              </div>

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
            </HighlightedProblemsProvider>
          </RankHistoryProvider>
        </CompetitionProvider>
      )}

      {/* Footer */}
      <footer className="footer">
        <p>
          <a href="https://github.com/latiosu/fingercomps-extended" target="_blank" rel="noopener noreferrer">Open-source</a> and made
          with love by <a href="https://www.instagram.com/eric.c.liu/" target="_blank" rel="noopener noreferrer">Eric Liu</a> ❤️
        </p>
      </footer>
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