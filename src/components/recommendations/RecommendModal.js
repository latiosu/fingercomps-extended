import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useCompetition } from '../../contexts/CompetitionContext';
import useExpandableRows from '../../hooks/useExpandableRows';
import { getOrganizedLocations, getRecommendedProblems } from '../../utils/scoreCalculators';
import { filterBySearchTerm } from '../../utils/searchFilters';
import LocationFilter from '../common/LocationFilter';
import PhotoIndicator from '../common/PhotoIndicator';
import PhotoUploader from '../common/PhotoUploader';
import PhotoViewer from '../common/PhotoViewer';
import SearchInput from '../common/SearchInput';
import SendsSubTable from '../common/SendsSubTable';
import SortableTable from '../common/SortableTable';
import RankChangeIndicator from '../users/RankChangeIndicator';
import './RecommendModal.css';

/**
 * Modal component for recommending problems to a user
 * @param {Object} props - Component props
 * @param {Function} props.onClose - Function to call when the modal is closed
 * @param {Object} props.user - User to recommend problems for
 * @returns {JSX.Element} RecommendModal component
 */
function RecommendModal({ onClose, user }) {
  const { isMobile } = useApp();
  const {
    problems,
    scores,
    categories,
    userTableData,
    problemPhotos
  } = useCompetition();

  const { expandedRows, toggleRow } = useExpandableRows();

  // Get category users and current user's rank
  const categoryUsers = userTableData.filter(u => u.category === user.category);
  const currentUserIndex = categoryUsers.findIndex(u => u.competitorNo === user.competitorNo);

  // Check if there are any problems that increase rank
  const hasRankIncreasingProblems = useMemo(() => {
    // Get user's scores
    const userScores = scores[user.competitorNo] || [];

    // Get category data
    const category = categories[user.category];

    // Get all recommended problems without filtering by showNonRankingProblems
    const allRecommendedProblems = getRecommendedProblems(
      problems,
      userScores,
      user,
      categoryUsers,
      category,
      false, // sortByOverallTops
      true,  // showNonRankingProblems (show all problems)
      ''     // selectedLocation
    );

    // Check if any problem increases rank
    return allRecommendedProblems.some(problem => problem.rankImprovement > 0);
  }, [problems, scores, user, categoryUsers, categories]);

  const [showNonRankingProblems, setShowNonRankingProblems] = useState(() => {
    try {
      const savedValue = localStorage.getItem('recommendModal.showNonRankingProblems');
      return savedValue !== null
        ? savedValue === 'true'
        : (currentUserIndex === 0 || !hasRankIncreasingProblems); // Default value
    } catch (e) {
      console.error('Error accessing localStorage:', e);
      return currentUserIndex === 0 || !hasRankIncreasingProblems;
    }
  });

  const [sortByOverallTops, setSortByOverallTops] = useState(() => {
    try {
      const savedValue = localStorage.getItem('recommendModal.sortByOverallTops');
      return savedValue !== null ? savedValue === 'true' : false; // Default to false
    } catch (e) {
      console.error('Error accessing localStorage:', e);
      return false;
    }
  });

  const [searchTerm, setSearchTerm] = useState(() => {
    try {
      return localStorage.getItem('recommendModal.searchTerm') || '';
    } catch (e) {
      console.error('Error accessing localStorage:', e);
      return '';
    }
  });

  useEffect(() => {
    try {
      if (searchTerm) {
        localStorage.setItem('recommendModal.searchTerm', searchTerm);
      } else {
        localStorage.removeItem('recommendModal.searchTerm');
      }
    } catch (e) {
      console.error('Error saving search term to localStorage:', e);
    }
  }, [searchTerm]);

  useEffect(() => {
    try {
      localStorage.setItem('recommendModal.showNonRankingProblems', showNonRankingProblems.toString());
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }
  }, [showNonRankingProblems]);

  useEffect(() => {
    try {
      localStorage.setItem('recommendModal.sortByOverallTops', sortByOverallTops.toString());
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }
  }, [sortByOverallTops]);

  const [selectedLocation, setSelectedLocation] = useState(() => {
    try {
      return localStorage.getItem('recommendModal.selectedLocation') || '';
    } catch (e) {
      console.error('Error accessing localStorage:', e);
      return '';
    }
  });

  // Handler to update selectedLocation and save to localStorage
  const handleLocationChange = (location) => {
    setSelectedLocation(location);
    try {
      localStorage.setItem('recommendModal.selectedLocation', location);
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }
  };

  // State for photo viewer and uploader
  const [selectedPhotoClimbNo, setSelectedPhotoClimbNo] = useState(null);
  const [showPhotoUploader, setShowPhotoUploader] = useState(false);

  // Get user's scores
  const userScores = scores[user.competitorNo] || [];

  // Get category data
  const category = categories[user.category];

  // Get unique locations from problems and organize them into groups
  const locationGroups = useMemo(() => {
    return getOrganizedLocations(problems);
  }, [problems]);

  // Get recommended problems
  const allRecommendedProblems = getRecommendedProblems(
    problems,
    userScores,
    user,
    categoryUsers,
    category,
    sortByOverallTops,
    showNonRankingProblems,
    selectedLocation
  );

  // Filter problems by search term (name/grade)
  const recommendedProblems = useMemo(() => {
    if (!searchTerm) return allRecommendedProblems;

    return allRecommendedProblems.filter(problem => {
      // Search in both problem number and marking (which contains name/grade)
      const climbNoMatch = String(problem.climbNo).includes(searchTerm);
      const markingMatch = filterBySearchTerm(problem, searchTerm, 'marking');

      return climbNoMatch || markingMatch;
    });
  }, [allRecommendedProblems, searchTerm]);

  // Calculate points needed for next rank
  const pointsNeededForNextRank = currentUserIndex > 0
    ? categoryUsers[currentUserIndex - 1].total - user.total
    : 0;

  // Define columns for the sortable table
  const columns = useMemo(() => {
    const getTopCount = (problem) => {
      if (sortByOverallTops) {
        return Object.values(problem.stats || {}).reduce((sum, stat) => sum + (stat.tops || 0), 0);
      }
      return problem.stats?.[user.category]?.tops || 0;
    };

    return [
      {
        key: 'climbNo',
        label: `Problem${!isMobile ? " No." : ""}`,
        sortable: true,
        render: (problem) => (
          <span>
            {problem.climbNo}
            <PhotoIndicator
              climbNo={problem.climbNo}
              problemPhotos={problemPhotos}
              onViewPhoto={setSelectedPhotoClimbNo}
              onUploadPhoto={(climbNo) => {
                setShowPhotoUploader(true);
                setSelectedPhotoClimbNo(climbNo);
              }}
              showUploadButton={true}
            />
          </span>
        )
      },
      {
        key: 'marking',
        label: `Name${!isMobile ? "/Grade" : ""}`,
        sortable: true
      },
      ...(isMobile ? [] : [{
        key: 'score',
        label: 'Points',
        sortable: true
      }]),
      {
        key: 'additionalPoints',
        label: `${!isMobile ? "Additional " : ""}Points`,
        sortable: true,
        render: (problem) => `+${problem.additionalPoints}`
      },
      {
        key: 'rankImprovement',
        label: 'Rank Change',
        sortable: true,
        render: (problem) => (
          <RankChangeIndicator change={problem.rankImprovement} />
        )
      },
      {
        key: 'tops',
        label: `${sortByOverallTops ? "Overall" : (user.category || "Category")} Tops`,
        sortable: true,
        render: (problem) => getTopCount(problem)
      }
    ]
  }, [isMobile, problemPhotos, sortByOverallTops, user.category]);

  // Render expanded content for a problem
  const renderExpandedContent = (problem) => (
    <div>
      <h4 style={{margin: '5px'}}>Others who topped Problem {problem.climbNo}</h4>
      <SendsSubTable
        sends={problem.sends}
        categoryCode={sortByOverallTops ? "" : user.category}
        isMobile={isMobile}
        emptyText="No one yet. Could you be the first? 👀"
      />
    </div>
  );

  return (
    <div className="modal-overlay" onClick={(e) => {
      e.stopPropagation();
      if (!showPhotoUploader) onClose();
    }}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Recommended Problems for {user.name}</h2>
          <button onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={showNonRankingProblems}
                onChange={(e) => setShowNonRankingProblems(e.target.checked)}
              />
              Show problems that don't change rank
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={sortByOverallTops}
                onChange={(e) => setSortByOverallTops(e.target.checked)}
              />
              Use overall tops instead of category tops
            </label>
            <LocationFilter
              locationGroups={locationGroups}
              selectedLocation={selectedLocation}
              onLocationChange={handleLocationChange}
            />
          </div>

          {currentUserIndex > 0 && (
            <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
              <strong>{pointsNeededForNextRank} points</strong> till next rank (#{currentUserIndex})
            </div>
          )}

            <SearchInput
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              placeholder='Search by number or colour... (e.g. 42 or purple)'
              component="RecommendModal"
              field="search_by_name_grade"
              resultsCount={recommendedProblems.length}
              style={{ marginTop: '8px' }}
            />

          <SortableTable
            columns={columns}
            data={recommendedProblems}
            initialSort={{ key: 'tops', direction: 'desc' }}
            rowKey="climbNo"
            onRowClick={(id) => toggleRow(id)}
            renderExpandedContent={renderExpandedContent}
            expandedRows={expandedRows}
            emptyMessage="No recommendations available"
          />
          <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
            <p>
              <strong>How does this work?</strong><br/>
              Recommended problems are sorted by most tops, then greatest rank change, then most points.
              Clicking a row will show other competitors who have topped that problem.
            </p>
          </div>
        </div>
      </div>

      {/* Photo Viewer Modal */}
      {selectedPhotoClimbNo && problemPhotos[selectedPhotoClimbNo]?.length > 0 && (
        <PhotoViewer
          photos={problemPhotos[selectedPhotoClimbNo]}
          onClose={() => setSelectedPhotoClimbNo(null)}
        />
      )}

      {/* Photo Uploader Modal */}
      {showPhotoUploader && selectedPhotoClimbNo && (
        <PhotoUploader
          climbNo={selectedPhotoClimbNo}
          onClose={() => {
            setShowPhotoUploader(false);
            setSelectedPhotoClimbNo(null);
          }}
        />
      )}
    </div>
  );
}

export default RecommendModal;