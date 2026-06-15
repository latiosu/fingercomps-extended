import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../../contexts/AppContext";
import { useCompetition } from "../../contexts/CompetitionContext";
import useExpandableRows from "../../hooks/useExpandableRows";
import { trackHideZeroTopsFilterChanged } from "../../utils/analytics";
import {
  formatDateForHover,
  toTimeAgoString,
} from "../../utils/dateFormatters";
import {
  DATE_SET_FILTER_DEFAULT,
  PHOTOS_FILTER_DEFAULT,
  TOPS_FILTER_DEFAULT,
  isPointRangeValid,
  matchesDateSetFilter,
  matchesPhotosFilter,
  matchesPointRangeFilter,
  matchesTopsFilter,
  parseNumberRangeBound,
} from "../../utils/problemFilters";
import {
  getMainLocation,
  getOrganizedLocations,
} from "../../utils/scoreCalculators";
import { filterBySearchTerm } from "../../utils/searchFilters";
import PhotoIndicator from "../common/PhotoIndicator";
import PhotoUploader from "../common/PhotoUploader";
import PhotoViewer from "../common/PhotoViewer";
import SearchInput from "../common/SearchInput";
import SendsSubTable from "../common/SendsSubTable";
import SortableTable from "../common/SortableTable";
import ProblemsFilterBar from "./ProblemsFilterBar";

export const TOP_COLUMN_KEY = "tops";
export const FLASH_COLUMN_KEY = "flashes";
export const CLIMB_NO_COLUMN_KEY = "climbNo";
export const MARKING_COLUMN_KEY = "marking";
export const SCORE_COLUMN_KEY = "score";
export const CREATED_AT_COLUMN_KEY = "createdAt";

export const SORT_VALUE_KEY = "sortValue";

const TOPS_FILTER_VALUES = ["all", "hasTops", "noTops"];
const PHOTOS_FILTER_VALUES = ["all", "hasPhotos", "noPhotos"];
const DATE_SET_FILTER_VALUES = [
  "all",
  "last7Days",
  "last30Days",
  "olderThan30Days",
];

const getSavedValue = (storageKey, defaultValue) => {
  try {
    return localStorage.getItem(storageKey) || defaultValue;
  } catch (error) {
    console.warn("Unable to access localStorage:", error);
    return defaultValue;
  }
};

const getSavedEnumValue = (storageKey, defaultValue, allowedValues) => {
  const savedValue = getSavedValue(storageKey, defaultValue);
  return allowedValues.includes(savedValue) ? savedValue : defaultValue;
};

const getSavedTopsFilter = (storageKey, legacyStorageKey) => {
  const savedValue = getSavedEnumValue(
    storageKey,
    "",
    TOPS_FILTER_VALUES
  );

  if (savedValue) {
    return savedValue;
  }

  try {
    const legacyValue = localStorage.getItem(legacyStorageKey);
    if (legacyValue !== null) {
      return legacyValue === "true" ? "hasTops" : "all";
    }
  } catch (error) {
    console.warn("Unable to access localStorage:", error);
  }

  return TOPS_FILTER_DEFAULT;
};

const hasPointRangeFilter = (pointsMin, pointsMax) =>
  parseNumberRangeBound(pointsMin) !== null ||
  parseNumberRangeBound(pointsMax) !== null;

/**
 * Component to display the problems table
 * @returns {JSX.Element} ProblemsTable component
 */
function ProblemsTable() {
  const {
    isMobile,
    selectedCategoryCode,
    showRawCounts,
    showOverallTopsFlashes,
  } = useApp();
  const {
    competitionId,
    categories,
    categoryTops,
    problems,
    loading,
    backgroundLoading,
    fullDataLoaded,
    loadingProgress,
    partialDataAvailable,
    countCompetitors,
    problemPhotos,
  } = useCompetition();

  const { expandedRows, toggleRow } = useExpandableRows();

  const locationStorageKey = `location_filter_${competitionId}`;
  const pointsMinStorageKey = `points_min_filter_${competitionId}`;
  const pointsMaxStorageKey = `points_max_filter_${competitionId}`;
  const topsFilterStorageKey = `tops_filter_${competitionId}`;
  const photosFilterStorageKey = `photos_filter_${competitionId}`;
  const dateSetFilterStorageKey = `date_set_filter_${competitionId}`;
  const hideZeroTopsStorageKey = `hide_zero_tops_filter_${competitionId}`;
  const searchStorageKey = `problems_search_filter_${competitionId}`;

  const [searchTerm, setSearchTerm] = useState(() => {
    try {
      return localStorage.getItem(searchStorageKey) || "";
    } catch (error) {
      console.warn("Unable to access localStorage:", error);
      return "";
    }
  });

  const [selectedLocation, setSelectedLocation] = useState(() => {
    try {
      return localStorage.getItem(locationStorageKey) || "";
    } catch (error) {
      console.warn("Unable to access localStorage:", error);
      return "";
    }
  });

  const [pointsMin, setPointsMin] = useState(() =>
    getSavedValue(pointsMinStorageKey, "")
  );
  const [pointsMax, setPointsMax] = useState(() =>
    getSavedValue(pointsMaxStorageKey, "")
  );
  const [topsFilter, setTopsFilter] = useState(() =>
    getSavedTopsFilter(topsFilterStorageKey, hideZeroTopsStorageKey)
  );
  const [photosFilter, setPhotosFilter] = useState(() =>
    getSavedEnumValue(
      photosFilterStorageKey,
      PHOTOS_FILTER_DEFAULT,
      PHOTOS_FILTER_VALUES
    )
  );
  const [dateSetFilter, setDateSetFilter] = useState(() =>
    getSavedEnumValue(
      dateSetFilterStorageKey,
      DATE_SET_FILTER_DEFAULT,
      DATE_SET_FILTER_VALUES
    )
  );

  useEffect(() => {
    try {
      if (selectedLocation) {
        localStorage.setItem(locationStorageKey, selectedLocation);
      } else {
        localStorage.removeItem(locationStorageKey);
      }
    } catch (error) {
      console.warn("Unable to save location to localStorage:", error);
    }
  }, [selectedLocation, locationStorageKey]);

  useEffect(() => {
    try {
      if (pointsMin) {
        localStorage.setItem(pointsMinStorageKey, pointsMin);
      } else {
        localStorage.removeItem(pointsMinStorageKey);
      }
    } catch (error) {
      console.warn("Unable to save minimum points filter:", error);
    }
  }, [pointsMin, pointsMinStorageKey]);

  useEffect(() => {
    try {
      if (pointsMax) {
        localStorage.setItem(pointsMaxStorageKey, pointsMax);
      } else {
        localStorage.removeItem(pointsMaxStorageKey);
      }
    } catch (error) {
      console.warn("Unable to save maximum points filter:", error);
    }
  }, [pointsMax, pointsMaxStorageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(topsFilterStorageKey, topsFilter);
      localStorage.setItem(
        hideZeroTopsStorageKey,
        (topsFilter === "hasTops").toString()
      );
      trackHideZeroTopsFilterChanged(topsFilter === "hasTops", competitionId);
    } catch (error) {
      console.warn("Unable to save tops filter:", error);
    }
  }, [topsFilter, topsFilterStorageKey, hideZeroTopsStorageKey, competitionId]);

  useEffect(() => {
    try {
      localStorage.setItem(photosFilterStorageKey, photosFilter);
    } catch (error) {
      console.warn("Unable to save photos filter:", error);
    }
  }, [photosFilter, photosFilterStorageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(dateSetFilterStorageKey, dateSetFilter);
    } catch (error) {
      console.warn("Unable to save date set filter:", error);
    }
  }, [dateSetFilter, dateSetFilterStorageKey]);

  useEffect(() => {
    try {
      if (searchTerm) {
        localStorage.setItem(searchStorageKey, searchTerm);
      } else {
        localStorage.removeItem(searchStorageKey);
      }
    } catch (error) {
      console.warn("Unable to save search term to localStorage:", error);
    }
  }, [searchTerm, searchStorageKey]);

  // State for photo viewer and uploader
  const [selectedPhotoClimbNo, setSelectedPhotoClimbNo] = useState(null);
  const [showPhotoUploader, setShowPhotoUploader] = useState(false);

  // Get unique locations from problems and organize them into groups
  const locationGroups = useMemo(() => {
    return getOrganizedLocations(problems);
  }, [problems]);

  // Filter categories to show based on selected category
  const focusCategories = useMemo(
    () =>
      Object.values(categories).filter(
        (cat) =>
          categoryTops[cat.code]?.length > 0 &&
          (selectedCategoryCode ? cat.code === selectedCategoryCode : true)
      ),
    [categories, categoryTops, selectedCategoryCode]
  );

  // Define columns for the table
  const columns = useMemo(() => {
    const baseColumns = [
      {
        key: "climbNo",
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
        ),
      },
      {
        key: "marking",
        label: `Name${!isMobile ? "/Grade" : ""}`,
        sortable: true,
      },
      {
        key: "station",
        label: "Location",
        sortable: true,
        render: (item) => item.station || "-",
      },
      {
        key: "score",
        label: "Points",
        sortable: true,
      },
      {
        key: "createdAt",
        label: "Date Set",
        sortable: true,
        render: (item) => (
          <span title={formatDateForHover(item.createdAt)}>
            {toTimeAgoString(item.createdAt)}
          </span>
        ),
      },
    ];

    if (showOverallTopsFlashes) {
      // When showing overall tops & flashes, add two columns for aggregated data
      const overallColumns = [
        {
          key: TOP_COLUMN_KEY,
          label: "Overall Tops",
          sortable: true,
          render: (item) => {
            if (!fullDataLoaded) {
              return <span title="Overall stats loading">-</span>;
            }

            if (!item[TOP_COLUMN_KEY]) return <span>-</span>;

            // const totalTops = Object.values(item.stats).reduce(
            //   (sum, stat) => sum + (stat[TOP_COLUMN_KEY] || 0),
            //   0
            // );

            return (
              <span>
                {showRawCounts
                  ? item[TOP_COLUMN_KEY]
                  : `${(
                      item[TOP_COLUMN_KEY] / Object.keys(categories).length
                    ).toFixed(0)}%`}
              </span>
            );
          },
        },
        {
          key: FLASH_COLUMN_KEY,
          label: "Overall Flashes",
          sortable: true,
          render: (item) => {
            if (!fullDataLoaded) {
              return <span title="Overall stats loading">-</span>;
            }

            if (!item[FLASH_COLUMN_KEY]) return <span>-</span>;

            // const totalFlashes = Object.values(item.stats).reduce(
            //   (sum, stat) => sum + (stat[FLASH_COLUMN_KEY] || 0),
            //   0
            // );

            return (
              <span>
                {showRawCounts
                  ? item[FLASH_COLUMN_KEY]
                  : `${(
                      item[FLASH_COLUMN_KEY] / Object.keys(categories).length
                    ).toFixed(0)}%`}
              </span>
            );
          },
        },
      ];

      return [...baseColumns, ...overallColumns];
    } else {
      // Add category columns when not showing overall tops & flashes
      const categoryColumns = focusCategories.map((cat) => ({
        key: `stat-${cat.code}`,
        label: cat.name || "TBC",
        sortable: true,
        render: (item) => {
          const statKey = `stat-${cat.code}`;
          if (item[statKey]) {
            return <span>{item[statKey].rawValue}</span>;
          }
          return <span>-</span>;
        },
      }));

      return [...baseColumns, ...categoryColumns];
    }
  }, [
    focusCategories,
    isMobile,
    problemPhotos,
    showOverallTopsFlashes,
    showRawCounts,
    categories,
    fullDataLoaded,
  ]);

  // Filter and prepare problems data
  const problemsData = useMemo(() => {
    let filteredData = [...Object.values(problems)];
    const hasValidPointRange = isPointRangeValid(pointsMin, pointsMax);

    // Filter problems by points if a valid range is selected
    if (hasPointRangeFilter(pointsMin, pointsMax) && hasValidPointRange) {
      filteredData = filteredData.filter((problem) =>
        matchesPointRangeFilter(problem, pointsMin, pointsMax)
      );
    }

    // Filter problems by location if a location is selected
    if (selectedLocation) {
      filteredData = filteredData.filter(
        (problem) => getMainLocation(problem.station) === selectedLocation
      );
    }

    // Filter problems by tops in the active category scope
    filteredData = filteredData.filter((problem) =>
      matchesTopsFilter(problem, topsFilter, focusCategories)
    );

    // Filter problems by photo availability
    filteredData = filteredData.filter((problem) =>
      matchesPhotosFilter(problem, photosFilter, problemPhotos)
    );

    // Filter problems by date set
    filteredData = filteredData.filter((problem) =>
      matchesDateSetFilter(problem, dateSetFilter)
    );

    // Filter problems by search term (name/grade/problem number)
    if (searchTerm) {
      filteredData = filteredData.filter((problem) => {
        // Search in both problem number and marking (which contains name/grade)
        const climbNoMatch = String(problem.climbNo).includes(searchTerm);
        const markingMatch = filterBySearchTerm(problem, searchTerm, "marking");

        return climbNoMatch || markingMatch;
      });
    }

    return filteredData.map((problem) => {
      const categoryData = focusCategories.reduce((acc, cat) => {
        const statKey = `stat-${cat.code}`;
        const stats = problem.stats && problem.stats[cat.code];
        acc[statKey] = stats
          ? {
              tops: stats[TOP_COLUMN_KEY],
              flashes: stats[FLASH_COLUMN_KEY],
              rawValue: showRawCounts
                ? `${stats[TOP_COLUMN_KEY]} (${stats[FLASH_COLUMN_KEY]})`
                : `${(
                    stats[TOP_COLUMN_KEY] / countCompetitors(cat.code)
                  ).toFixed(0)}% (${(
                    stats[FLASH_COLUMN_KEY] / countCompetitors(cat.code)
                  ).toFixed(0)}%)`,
              // sortValue: showRawCounts
              //   ? stats[TOP_COLUMN_KEY]
              //   : stats[TOP_COLUMN_KEY] / countCompetitors(cat.code),
            }
          : { rawValue: "-", sortValue: 0 };
        return acc;
      }, {});

      const sortData = Object.values(categoryData).reduce(
        (pv, cv) => {
          pv[TOP_COLUMN_KEY] = cv[TOP_COLUMN_KEY] + (pv[TOP_COLUMN_KEY] || 0);
          pv[FLASH_COLUMN_KEY] =
            (cv[FLASH_COLUMN_KEY] || 0) + (pv[FLASH_COLUMN_KEY] || 0);
          return pv;
        },
        {
          [TOP_COLUMN_KEY]: 0,
          [FLASH_COLUMN_KEY]: 0,
        }
      );
      return {
        ...problem,
        ...categoryData,
        ...sortData,
      };
    });
  }, [
    problems,
    pointsMin,
    pointsMax,
    focusCategories,
    showRawCounts,
    countCompetitors,
    selectedLocation,
    topsFilter,
    photosFilter,
    problemPhotos,
    dateSetFilter,
    searchTerm,
  ]);

  // Render expanded content for a row
  const renderExpandedContent = (item) => (
    <SendsSubTable
      sends={item.sends}
      categoryCode={selectedCategoryCode}
      isMobile={isMobile}
    />
  );

  const filtersDisabled = loading && loadingProgress < 100;
  const hasActiveFilters = Boolean(
    selectedLocation ||
      hasPointRangeFilter(pointsMin, pointsMax) ||
      topsFilter !== TOPS_FILTER_DEFAULT ||
      photosFilter !== PHOTOS_FILTER_DEFAULT ||
      dateSetFilter !== DATE_SET_FILTER_DEFAULT
  );

  const resetFilters = () => {
    setSelectedLocation("");
    setPointsMin("");
    setPointsMax("");
    setTopsFilter(TOPS_FILTER_DEFAULT);
    setPhotosFilter(PHOTOS_FILTER_DEFAULT);
    setDateSetFilter(DATE_SET_FILTER_DEFAULT);
  };

  return (
    <>
      <SearchInput
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        placeholder="Search by number or colour... (e.g. 42 or purple)"
        component="ProblemsTable"
        field="search_by_name_grade"
        resultsCount={problemsData.length}
        style={{ marginTop: "8px", marginBottom: "8px" }}
        view="routesetter"
        competitionId={competitionId}
      />

      <ProblemsFilterBar
        locationGroups={locationGroups}
        selectedLocation={selectedLocation}
        onLocationChange={setSelectedLocation}
        pointsMin={pointsMin}
        pointsMax={pointsMax}
        onPointsMinChange={setPointsMin}
        onPointsMaxChange={setPointsMax}
        topsFilter={topsFilter}
        onTopsFilterChange={setTopsFilter}
        photosFilter={photosFilter}
        onPhotosFilterChange={setPhotosFilter}
        dateSetFilter={dateSetFilter}
        onDateSetFilterChange={setDateSetFilter}
        onResetFilters={resetFilters}
        hasActiveFilters={hasActiveFilters}
        disabled={filtersDisabled}
      />

      <div className="table-container">
        <SortableTable
          columns={columns}
          data={problemsData}
          initialSort={{ key: "score", direction: "desc" }}
          rowKey="climbNo"
          onRowClick={(id) => toggleRow(id)}
          renderExpandedContent={renderExpandedContent}
          expandedRows={expandedRows}
          loading={loading || backgroundLoading}
          loadingProgress={loadingProgress}
          partialDataAvailable={partialDataAvailable}
          emptyMessage="No problems available"
        />
      </div>

      {/* Photo Viewer Modal */}
      {selectedPhotoClimbNo &&
        problemPhotos[selectedPhotoClimbNo]?.length > 0 && (
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
