import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useCompetition } from '../../contexts/CompetitionContext';
import useExpandableRows from '../../hooks/useExpandableRows';
import { formatDateForHover, toTimeAgoString } from '../../utils/dateFormatters';
import { getMainLocation, getOrganizedLocations } from '../../utils/scoreCalculators';
import { filterBySearchTerm } from '../../utils/searchFilters';
import LocationFilter from '../common/LocationFilter';
import PhotoIndicator from '../common/PhotoIndicator';
import PhotoUploader from '../common/PhotoUploader';
import PhotoViewer from '../common/PhotoViewer';
import SearchInput from '../common/SearchInput';
import SendsSubTable from '../common/SendsSubTable';
import SortableTable from '../common/SortableTable';

/**
 * Component to display the problems table
 * @returns {JSX.Element} ProblemsTable component
 */
function ProblemsTable() {
  const { isMobile, selectedCategoryCode } = useApp();
  const {
    competitionId,
    categories,
    categoryTops,
    problems,
    loading,
    loadingProgress,
    partialDataAvailable,
    countCompetitors,
    problemPhotos
  } = useCompetition();

  const { expandedRows, toggleRow } = useExpandableRows();

  // Create a localStorage key for this competition's location filter
  const locationStorageKey = `location_filter_${competitionId}`;

  // State for filtering and display options
  const [showRawCounts, setShowRawCounts] = useState(true);
  const [hideZeroTops, setHideZeroTops] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(() => {
    try {
      // Try to get saved location for this competition from localStorage
      return localStorage.getItem(locationStorageKey) || '';
    } catch (error) {
      console.warn('Unable to access localStorage:', error);
      return '';
    }
  });

  // Save selected location to localStorage when it changes
  useEffect(() => {
    try {
      if (selectedLocation) {
        localStorage.setItem(locationStorageKey, selectedLocation);
      } else {
        localStorage.removeItem(locationStorageKey);
      }
    } catch (error) {
      console.warn('Unable to save location to localStorage:', error);
    }
  }, [selectedLocation, locationStorageKey]);

  // State for photo viewer and uploader
  const [selectedPhotoClimbNo, setSelectedPhotoClimbNo] = useState(null);
  const [showPhotoUploader, setShowPhotoUploader] = useState(false);

  // Get unique locations from problems and organize them into groups
  const locationGroups = useMemo(() => {
    return getOrganizedLocations(problems);
  }, [problems]);

  // Filter categories to show based on selected category
  const focusCategories = useMemo(() =>
    Object.values(categories)
      .filter((cat) => categoryTops[cat.code]?.length > 0 &&
        (selectedCategoryCode ? cat.code === selectedCategoryCode : true)),
    [categories, categoryTops, selectedCategoryCode]
  );

  // Define columns for the table
  const columns = useMemo(() => {
    const baseColumns = [
      {
        key: 'climbNo',
        label: `Problem${!isMobile ? " No." : ""}`,
        sortable: true,
        render: (item) => (
          <span className="center">
            {item.climbNo}
            <PhotoIndicator
              climbNo={item.climbNo}
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
      {
        key: 'score',
        label: 'Points',
        sortable: true
      },
      {
        key: 'createdAt',
        label: 'Date Set',
        sortable: true,
        render: (item) => (
          <span title={formatDateForHover(item.createdAt)}>
            {toTimeAgoString(item.createdAt)}
          </span>
        )
      }
    ];

    // Add category columns
    const categoryColumns = focusCategories.map(cat => ({
      key: `stat-${cat.code}`,
      label: cat.name || 'TBC',
      sortable: true,
      render: (item) => {
        const statKey = `stat-${cat.code}`;
        if (item[statKey]) {
          return <span>{item[statKey].rawValue}</span>;
        }
        return <span>-</span>;
      }
    }));

    return [...baseColumns, ...categoryColumns];
  }, [focusCategories, isMobile, problemPhotos]);

  // Filter and prepare problems data
  const problemsData = useMemo(() => {
    let filteredData = [...Object.values(problems)];

    // Filter problems with no tops if hideZeroTops is enabled
    if (hideZeroTops) {
      filteredData = filteredData.filter(problem => {
        if (!problem.stats) return false;
        return Object.entries(problem.stats)
          .filter(([k, _]) => categoryTops[k]?.length > 0 &&
            (selectedCategoryCode ? k === selectedCategoryCode : true))
          .some(([_, v]) => v.tops > 0);
      });
    }

    // Filter problems by location if a location is selected
    if (selectedLocation) {
      filteredData = filteredData.filter(problem =>
        getMainLocation(problem.station) === selectedLocation
      );
    }

    // Filter problems by search term (name/grade/problem number)
    if (searchTerm) {
      filteredData = filteredData.filter(problem => {
        // Search in both problem number and marking (which contains name/grade)
        const climbNoMatch = String(problem.climbNo).includes(searchTerm);
        const markingMatch = filterBySearchTerm(problem, searchTerm, 'marking');

        return climbNoMatch || markingMatch;
      });
    }

    return filteredData.map(problem => ({
      ...problem,
      ...focusCategories.reduce((acc, cat) => {
        const statKey = `stat-${cat.code}`;
        const stats = problem.stats && problem.stats[cat.code];
        acc[statKey] = stats ? {
          tops: stats.tops,
          flashes: stats.flashes,
          rawValue: showRawCounts ?
            `${stats.tops} (${stats.flashes})` :
            `${(stats.tops / countCompetitors(cat.code)).toFixed(0)}% (${(stats.flashes / countCompetitors(cat.code)).toFixed(0)}%)`,
          sortValue: showRawCounts ?
            stats.tops :
            stats.tops / countCompetitors(cat.code)
        } : { rawValue: "-", sortValue: 0 };
        return acc;
      }, {})
    }));
  }, [problems, hideZeroTops, focusCategories, categoryTops, selectedCategoryCode, showRawCounts, countCompetitors, selectedLocation, searchTerm]);

  // Render expanded content for a row
  const renderExpandedContent = (item) => (
    <SendsSubTable
      sends={item.sends}
      categoryCode={selectedCategoryCode}
      isMobile={isMobile}
    />
  );

  return (
    <>
      <div className="filters" style={{ maxWidth: '450px' }}>
        <LocationFilter
          locationGroups={locationGroups}
          selectedLocation={selectedLocation}
          onLocationChange={setSelectedLocation}
          id="problems-location-filter"
        />
        <label>
          <input
            type="checkbox"
            checked={showRawCounts}
            onChange={() => setShowRawCounts(!showRawCounts)}
            disabled={loading && loadingProgress < 100}
          />
          Show raw counts for tops and flashes
        </label>
        <label>
          <input
            type="checkbox"
            checked={hideZeroTops}
            onChange={() => setHideZeroTops(!hideZeroTops)}
            disabled={loading && loadingProgress < 100}
          />
          Hide problems with no tops
        </label>
      </div>

      <div className="table-container">
        <SearchInput
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          placeholder="Search a colour here... (e.g. purple)"
          component="ProblemsTable"
          field="search_by_name_grade"
          resultsCount={problemsData.length}
          style={{ marginTop: '8px', marginBottom: '8px' }}
        />
        <SortableTable
          columns={columns}
          data={problemsData}
          initialSort={{ key: 'score', direction: 'desc' }}
          rowKey="climbNo"
          onRowClick={(id) => toggleRow(id)}
          renderExpandedContent={renderExpandedContent}
          expandedRows={expandedRows}
          loading={loading}
          loadingProgress={loadingProgress}
          partialDataAvailable={partialDataAvailable}
          emptyMessage="No problems available"
        />
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
    </>
  );
}

export default ProblemsTable;