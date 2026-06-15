import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useCompetition } from '../../contexts/CompetitionContext';
import { useSandbox } from '../../contexts/SandboxContext';
import useExpandableRows from '../../hooks/useExpandableRows';
import { getOrganizedLocations, getRecommendedProblems } from '../../utils/scoreCalculators';
import {
  DATE_SET_FILTER_DEFAULT,
  PHOTOS_FILTER_DEFAULT,
  isPointRangeValid,
  matchesDateSetFilter,
  matchesPhotosFilter,
  matchesPointRangeFilter,
  matchesTopsFilter,
  parseNumberRangeBound,
} from '../../utils/problemFilters';
import { filterBySearchTerm } from '../../utils/searchFilters';
import PhotoIndicator from '../common/PhotoIndicator';
import PhotoUploader from '../common/PhotoUploader';
import PhotoViewer from '../common/PhotoViewer';
import SearchInput from '../common/SearchInput';
import SendsSubTable from '../common/SendsSubTable';
import SortableTable from '../common/SortableTable';
import RankChangeIndicator from '../users/RankChangeIndicator';
import ProblemsFilterBar from '../problems/ProblemsFilterBar';
import './RecommendModal.css';
import '../sandbox/Sandbox.css';

const TOPS_FILTER_VALUES = ['all', 'hasTops', 'noTops'];
const PHOTOS_FILTER_VALUES = ['all', 'hasPhotos', 'noPhotos'];
const DATE_SET_FILTER_VALUES = [
  'all',
  'last7Days',
  'last30Days',
  'olderThan30Days',
];
const RECOMMEND_TOPS_FILTER_DEFAULT = 'all';

const getSavedValue = (storageKey, defaultValue) => {
  try {
    return localStorage.getItem(storageKey) || defaultValue;
  } catch (error) {
    console.error('Error accessing localStorage:', error);
    return defaultValue;
  }
};

const getSavedEnumValue = (storageKey, defaultValue, allowedValues) => {
  const savedValue = getSavedValue(storageKey, defaultValue);
  return allowedValues.includes(savedValue) ? savedValue : defaultValue;
};

const hasPointRangeFilter = (pointsMin, pointsMax) =>
  parseNumberRangeBound(pointsMin) !== null ||
  parseNumberRangeBound(pointsMax) !== null;

/**
 * Modal component for recommending problems to a user.
 * In sandbox mode the same view doubles as the what-if editor: recommendations
 * are computed against the theoretical overlay and each problem gets an
 * add-a-send button.
 * @param {Object} props - Component props
 * @param {Function} props.onClose - Function to call when the modal is closed
 * @param {Object} props.user - User to recommend problems for
 * @param {boolean} props.sandboxMode - Whether to act as the what-if sandbox editor
 * @returns {JSX.Element} RecommendModal component
 */
function RecommendModal({ onClose, user, sandboxMode = false }) {
  const { isMobile } = useApp();
  const {
    problems,
    qualificationScores,
    categories,
    userTableData,
    problemPhotos
  } = useCompetition();
  const {
    sandboxUserTableData,
    sandboxQualificationScores,
    theoreticalScores,
    addTheoreticalTops,
    removeTheoreticalTop,
  } = useSandbox();

  const { expandedRows, toggleRow } = useExpandableRows();

  const [addAsFlash, setAddAsFlash] = useState(false);

  // In sandbox mode, work against the theoretical overlay so points/rank
  // predictions update live as what-if sends are added
  const effectiveUserTableData = sandboxMode ? sandboxUserTableData : userTableData;
  const effectiveScores = sandboxMode ? sandboxQualificationScores : qualificationScores;
  const effectiveUser = sandboxMode
    ? (sandboxUserTableData.find(u => u.competitorNo === user.competitorNo) || user)
    : user;

  // Get category users and current user's rank
  const categoryUsers = effectiveUserTableData.filter(u => u.category === user.category);
  const currentUserIndex = categoryUsers.findIndex(u => u.competitorNo === user.competitorNo);

  // Check if there are any problems that increase rank
  const hasRankIncreasingProblems = useMemo(() => {
    // Get user's scores
    const userScores = effectiveScores[user.competitorNo] || [];

    // Get category data
    const category = categories[user.category];

    // Get all recommended problems without filtering by showNonRankingProblems
    const allRecommendedProblems = getRecommendedProblems(
      problems,
      userScores,
      effectiveUser,
      categoryUsers,
      category,
      false, // sortByOverallTops
      true,  // showNonRankingProblems (show all problems)
      ''     // selectedLocation
    );

    // Check if any problem increases rank
    return allRecommendedProblems.some(problem => problem.rankImprovement > 0);
  }, [problems, effectiveScores, user, effectiveUser, categoryUsers, categories]);

  const [showNonRankingProblems, setShowNonRankingProblems] = useState(() => {
    try {
      const savedValue = localStorage.getItem('recommendModal.showNonRankingProblems');
      return savedValue !== null
        ? savedValue === 'true'
        : (currentUserIndex === 0 || !hasRankIncreasingProblems); // Default value
    } catch (error) {
      console.error('Error accessing localStorage:', error);
      return currentUserIndex === 0 || !hasRankIncreasingProblems;
    }
  });

  const [sortByOverallTops, setSortByOverallTops] = useState(() => {
    try {
      const savedValue = localStorage.getItem('recommendModal.sortByOverallTops');
      return savedValue !== null ? savedValue === 'true' : false; // Default to false
    } catch (error) {
      console.error('Error accessing localStorage:', error);
      return false;
    }
  });

  const [searchTerm, setSearchTerm] = useState(() => {
    try {
      return localStorage.getItem('recommendModal.searchTerm') || '';
    } catch (error) {
      console.error('Error accessing localStorage:', error);
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
    } catch (error) {
      console.error('Error saving search term to localStorage:', error);
    }
  }, [searchTerm]);

  useEffect(() => {
    try {
      localStorage.setItem('recommendModal.showNonRankingProblems', showNonRankingProblems.toString());
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, [showNonRankingProblems]);

  useEffect(() => {
    try {
      localStorage.setItem('recommendModal.sortByOverallTops', sortByOverallTops.toString());
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, [sortByOverallTops]);

  const [selectedLocation, setSelectedLocation] = useState(() => {
    try {
      return localStorage.getItem('recommendModal.selectedLocation') || '';
    } catch (error) {
      console.error('Error accessing localStorage:', error);
      return '';
    }
  });

  const [pointsMin, setPointsMin] = useState(() =>
    getSavedValue('recommendModal.pointsMin', '')
  );
  const [pointsMax, setPointsMax] = useState(() =>
    getSavedValue('recommendModal.pointsMax', '')
  );
  const [topsFilter, setTopsFilter] = useState(() =>
    getSavedEnumValue(
      'recommendModal.topsFilter',
      RECOMMEND_TOPS_FILTER_DEFAULT,
      TOPS_FILTER_VALUES
    )
  );
  const [photosFilter, setPhotosFilter] = useState(() =>
    getSavedEnumValue(
      'recommendModal.photosFilter',
      PHOTOS_FILTER_DEFAULT,
      PHOTOS_FILTER_VALUES
    )
  );
  const [dateSetFilter, setDateSetFilter] = useState(() =>
    getSavedEnumValue(
      'recommendModal.dateSetFilter',
      DATE_SET_FILTER_DEFAULT,
      DATE_SET_FILTER_VALUES
    )
  );

  useEffect(() => {
    try {
      if (selectedLocation) {
        localStorage.setItem('recommendModal.selectedLocation', selectedLocation);
      } else {
        localStorage.removeItem('recommendModal.selectedLocation');
      }
    } catch (error) {
      console.error('Error saving location to localStorage:', error);
    }
  }, [selectedLocation]);

  useEffect(() => {
    try {
      if (pointsMin) {
        localStorage.setItem('recommendModal.pointsMin', pointsMin);
      } else {
        localStorage.removeItem('recommendModal.pointsMin');
      }
    } catch (error) {
      console.error('Error saving minimum points filter:', error);
    }
  }, [pointsMin]);

  useEffect(() => {
    try {
      if (pointsMax) {
        localStorage.setItem('recommendModal.pointsMax', pointsMax);
      } else {
        localStorage.removeItem('recommendModal.pointsMax');
      }
    } catch (error) {
      console.error('Error saving maximum points filter:', error);
    }
  }, [pointsMax]);

  useEffect(() => {
    try {
      localStorage.setItem('recommendModal.topsFilter', topsFilter);
    } catch (error) {
      console.error('Error saving tops filter:', error);
    }
  }, [topsFilter]);

  useEffect(() => {
    try {
      localStorage.setItem('recommendModal.photosFilter', photosFilter);
    } catch (error) {
      console.error('Error saving photos filter:', error);
    }
  }, [photosFilter]);

  useEffect(() => {
    try {
      localStorage.setItem('recommendModal.dateSetFilter', dateSetFilter);
    } catch (error) {
      console.error('Error saving date set filter:', error);
    }
  }, [dateSetFilter]);

  // State for photo viewer and uploader
  const [selectedPhotoClimbNo, setSelectedPhotoClimbNo] = useState(null);
  const [showPhotoUploader, setShowPhotoUploader] = useState(false);

  // Get user's scores
  const userScores = effectiveScores[user.competitorNo] || [];

  // Get category data
  const category = categories[user.category];

  // Get unique locations from problems and organize them into groups
  const locationGroups = useMemo(() => {
    return getOrganizedLocations(problems);
  }, [problems]);

  // Get recommended problems. In sandbox mode, show every unsent problem so
  // any climb can be added as a what-if send.
  const allRecommendedProblems = getRecommendedProblems(
    problems,
    userScores,
    effectiveUser,
    categoryUsers,
    category,
    sortByOverallTops,
    sandboxMode || showNonRankingProblems,
    selectedLocation,
    sandboxMode
  );

  const pointsRangeIsValid = isPointRangeValid(pointsMin, pointsMax);
  const topsFilterScope = sortByOverallTops ? undefined : user.category;

  // Filter problems by pill filters and search term (name/grade)
  const recommendedProblems = useMemo(() => {
    let filteredProblems = allRecommendedProblems;

    if (hasPointRangeFilter(pointsMin, pointsMax) && pointsRangeIsValid) {
      filteredProblems = filteredProblems.filter((problem) =>
        matchesPointRangeFilter(problem, pointsMin, pointsMax)
      );
    }

    filteredProblems = filteredProblems.filter((problem) =>
      matchesTopsFilter(problem, topsFilter, topsFilterScope)
    );

    filteredProblems = filteredProblems.filter((problem) =>
      matchesPhotosFilter(problem, photosFilter, problemPhotos)
    );

    filteredProblems = filteredProblems.filter((problem) =>
      matchesDateSetFilter(problem, dateSetFilter)
    );

    if (!searchTerm) return filteredProblems;

    return filteredProblems.filter(problem => {
      // Search in both problem number and marking (which contains name/grade)
      const climbNoMatch = String(problem.climbNo).includes(searchTerm);
      const markingMatch = filterBySearchTerm(problem, searchTerm, 'marking');

      return climbNoMatch || markingMatch;
    });
  }, [
    allRecommendedProblems,
    pointsMin,
    pointsMax,
    pointsRangeIsValid,
    topsFilter,
    topsFilterScope,
    photosFilter,
    problemPhotos,
    dateSetFilter,
    searchTerm,
  ]);

  // Calculate points needed for next rank
  const pointsNeededForNextRank = currentUserIndex > 0
    ? categoryUsers[currentUserIndex - 1].total - effectiveUser.total
    : 0;

  const hasActiveFilters = Boolean(
    selectedLocation ||
      hasPointRangeFilter(pointsMin, pointsMax) ||
      topsFilter !== RECOMMEND_TOPS_FILTER_DEFAULT ||
      photosFilter !== PHOTOS_FILTER_DEFAULT ||
      dateSetFilter !== DATE_SET_FILTER_DEFAULT
  );

  const resetFilters = () => {
    setSelectedLocation('');
    setPointsMin('');
    setPointsMax('');
    setTopsFilter(RECOMMEND_TOPS_FILTER_DEFAULT);
    setPhotosFilter(PHOTOS_FILTER_DEFAULT);
    setDateSetFilter(DATE_SET_FILTER_DEFAULT);
  };

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
        className: 'recommend-problem-col',
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
        sortable: true,
        className: 'recommend-name-col'
      },
      {
        key: 'station',
        label: 'Location',
        sortable: true,
        className: 'recommend-location-col',
        render: (problem) => problem.station || '-'
      },
      {
        key: 'score',
        label: 'Points',
        sortable: true,
        className: 'recommend-points-col',
        render: (problem) => (
          <span className="recommend-points-cell">
            <span>{problem.score}</span>
            {' '}
            <span className="recommend-additional-points">
              (+{problem.additionalPoints})
            </span>
          </span>
        )
      },
      {
        key: 'rankImprovement',
        label: 'Rank Change',
        sortable: true,
        className: 'recommend-rank-col',
        render: (problem) => (
          <RankChangeIndicator change={problem.rankImprovement} />
        )
      },
      {
        key: 'tops',
        label: `${sortByOverallTops ? "Overall" : (user.category || "Category")} Tops`,
        sortable: true,
        className: 'recommend-tops-col',
        render: (problem) => getTopCount(problem)
      },
      // What-if column: add a theoretical send for this problem
      ...(sandboxMode ? [{
        key: 'whatIf',
        label: 'What-if',
        sortable: false,
        className: 'recommend-whatif-col',
        render: (problem) => (
          <button
            className="sandbox-add-top-btn"
            title={`Add a theoretical ${addAsFlash ? 'flash' : 'top'} of problem ${problem.climbNo}`}
            onClick={(e) => {
              e.stopPropagation();
              addTheoreticalTops([user.competitorNo], [problem.climbNo], addAsFlash);
            }}
          >
            ➕ {addAsFlash ? 'Flash' : 'Top'}
          </button>
        )
      }] : [])
    ]
  }, [isMobile, problemPhotos, sortByOverallTops, user.category, user.competitorNo, sandboxMode, addAsFlash, addTheoreticalTops]);

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
          <h2>
            {sandboxMode
              ? `🧪 What-if Sends for ${user.name}`
              : `Recommended Problems for ${user.name}`}
          </h2>
          <button onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Sandbox mode always shows all problems, so the filter is hidden */}
            {!sandboxMode && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={showNonRankingProblems}
                  onChange={(e) => setShowNonRankingProblems(e.target.checked)}
                />
                Show problems that don't change rank
              </label>
            )}
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={sortByOverallTops}
                onChange={(e) => setSortByOverallTops(e.target.checked)}
              />
              Use overall tops instead of category tops
            </label>
            {sandboxMode && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={addAsFlash}
                  onChange={(e) => setAddAsFlash(e.target.checked)}
                />
                Add what-if sends as flashes
              </label>
            )}
            <ProblemsFilterBar
              locationGroups={locationGroups}
              selectedLocation={selectedLocation}
              onLocationChange={setSelectedLocation}
              pointsMin={pointsMin}
              pointsMax={pointsMax}
              onPointsMinChange={setPointsMin}
              onPointsMaxChange={setPointsMax}
              topsFilter={topsFilter}
              defaultTopsFilter={RECOMMEND_TOPS_FILTER_DEFAULT}
              onTopsFilterChange={setTopsFilter}
              photosFilter={photosFilter}
              onPhotosFilterChange={setPhotosFilter}
              dateSetFilter={dateSetFilter}
              onDateSetFilterChange={setDateSetFilter}
              onResetFilters={resetFilters}
              hasActiveFilters={hasActiveFilters}
            />
          </div>

          {currentUserIndex > 0 && (
            <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
              <strong>{pointsNeededForNextRank} points</strong> till next rank (#{currentUserIndex})
            </div>
          )}

          {/* Current what-if sends for this competitor */}
          {sandboxMode && (theoreticalScores[user.competitorNo]?.length > 0) && (
            <div className="sandbox-modal-summary">
              <strong>
                🧪 {theoreticalScores[user.competitorNo].length} what-if send
                {theoreticalScores[user.competitorNo].length !== 1 ? 's' : ''}:
              </strong>
              {theoreticalScores[user.competitorNo].map(score => (
                <span key={score.climbNo} className="sandbox-send-chip">
                  #{score.climbNo} {problems[score.climbNo]?.marking}
                  {score.flashed ? ' ⚡' : ''}
                  <button
                    className="sandbox-remove-btn"
                    title="Remove this what-if send"
                    onClick={() => removeTheoreticalTop(user.competitorNo, score.climbNo)}
                  >
                    ✕
                  </button>
                </span>
              ))}
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
              {sandboxMode && (
                <>
                  <br/>
                  Pressing ➕ adds a theoretical send for {user.name} — rankings and the
                  numbers above update instantly, and the problem moves out of this list
                  into their what-if sends. Nothing is saved to the real competition.
                </>
              )}
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
