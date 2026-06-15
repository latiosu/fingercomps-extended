import React, { useEffect, useState } from "react";
import FilterPill from "../common/FilterPill";

const TOPS_OPTIONS = [
  { value: "hasTops", label: "Has tops" },
  { value: "all", label: "Tops: all" },
  { value: "noTops", label: "No tops" },
];

const PHOTOS_OPTIONS = [
  { value: "all", label: "Photos: all" },
  { value: "hasPhotos", label: "Has photos" },
  { value: "noPhotos", label: "Missing photos" },
];

const DATE_SET_OPTIONS = [
  { value: "all", label: "All dates" },
  { value: "last7Days", label: "Last 7 days" },
  { value: "last30Days", label: "Last 30 days" },
  { value: "olderThan30Days", label: "Older than 30 days" },
];

const findLabel = (options, value) =>
  options.find((option) => option.value === value)?.label;

const renderOption = (option, selectedValue, onChange, close) => (
  <button
    type="button"
    key={option.value}
    className="filter-dropdown-option"
    onClick={() => {
      onChange(option.value);
      close();
    }}
    aria-pressed={selectedValue === option.value}
  >
    <span>{option.label}</span>
    {selectedValue === option.value && <span aria-hidden="true">✓</span>}
  </button>
);

const toDraftPointsValue = (value) => (value == null ? "" : String(value));

const isDraftPointsRangeValid = (min, max) =>
  !min || !max || Number(min) <= Number(max);

/**
 * Local draft controls for points filtering
 * @param {Object} props - Component props
 * @param {string} props.pointsMin - Applied minimum points filter
 * @param {string} props.pointsMax - Applied maximum points filter
 * @param {Function} props.onPointsMinChange - Minimum points change handler
 * @param {Function} props.onPointsMaxChange - Maximum points change handler
 * @param {boolean} props.disabled - Whether controls are disabled
 * @param {Function} props.close - Dropdown close handler
 * @returns {JSX.Element} Points range dropdown component
 */
function PointsRangeDropdown({
  pointsMin,
  pointsMax,
  onPointsMinChange,
  onPointsMaxChange,
  disabled,
  close,
}) {
  const [draftPointsMin, setDraftPointsMin] = useState(
    toDraftPointsValue(pointsMin)
  );
  const [draftPointsMax, setDraftPointsMax] = useState(
    toDraftPointsValue(pointsMax)
  );
  const isRangeValid = isDraftPointsRangeValid(
    draftPointsMin,
    draftPointsMax
  );
  const hasDraftPointsFilter = Boolean(draftPointsMin || draftPointsMax);

  useEffect(() => {
    setDraftPointsMin(toDraftPointsValue(pointsMin));
    setDraftPointsMax(toDraftPointsValue(pointsMax));
  }, [pointsMin, pointsMax]);

  const handleApply = () => {
    if (!isRangeValid) {
      return;
    }

    onPointsMinChange(draftPointsMin);
    onPointsMaxChange(draftPointsMax);
    close();
  };

  const handleClear = () => {
    setDraftPointsMin("");
    setDraftPointsMax("");
    onPointsMinChange("");
    onPointsMaxChange("");
    close();
  };

  return (
    <>
      <div className="filter-range-fields">
        <label className="filter-range-field">
          <span>Min</span>
          <input
            type="number"
            inputMode="numeric"
            value={draftPointsMin}
            onChange={(event) => setDraftPointsMin(event.target.value)}
            className="filter-range-input"
            placeholder="No min"
            disabled={disabled}
            aria-invalid={!isRangeValid}
          />
        </label>
        <label className="filter-range-field">
          <span>Max</span>
          <input
            type="number"
            inputMode="numeric"
            value={draftPointsMax}
            onChange={(event) => setDraftPointsMax(event.target.value)}
            className="filter-range-input"
            placeholder="No max"
            disabled={disabled}
            aria-invalid={!isRangeValid}
          />
        </label>
      </div>
      {!isRangeValid && (
        <div className="filter-range-error">
          Minimum cannot be greater than maximum.
        </div>
      )}
      <button
        type="button"
        className="filter-dropdown-option"
        onClick={handleClear}
        disabled={disabled || !hasDraftPointsFilter}
      >
        <span>Clear</span>
      </button>
      <button
        type="button"
        className="filter-dropdown-option"
        onClick={handleApply}
        disabled={disabled || !isRangeValid}
      >
        <span>Apply</span>
      </button>
    </>
  );
}

/**
 * Filter pill row for the problems table
 * @param {Object} props - Component props
 * @param {Array} props.locationGroups - Available location groups
 * @param {string} props.selectedLocation - Selected location
 * @param {Function} props.onLocationChange - Location change handler
 * @param {string} props.pointsMin - Minimum points filter
 * @param {string} props.pointsMax - Maximum points filter
 * @param {Function} props.onPointsMinChange - Minimum points change handler
 * @param {Function} props.onPointsMaxChange - Maximum points change handler
 * @param {string} props.topsFilter - Selected tops filter
 * @param {string} [props.defaultTopsFilter="hasTops"] - Default tops filter
 * @param {Function} props.onTopsFilterChange - Tops filter change handler
 * @param {string} props.photosFilter - Selected photos filter
 * @param {string} [props.defaultPhotosFilter="all"] - Default photos filter
 * @param {Function} props.onPhotosFilterChange - Photos filter change handler
 * @param {string} props.dateSetFilter - Selected date set filter
 * @param {string} [props.defaultDateSetFilter="all"] - Default date set filter
 * @param {Function} props.onDateSetFilterChange - Date set filter change handler
 * @param {Function} props.onResetFilters - Reset filter handler
 * @param {boolean} props.hasActiveFilters - Whether any filters are active
 * @param {boolean} props.disabled - Whether controls are disabled
 * @returns {JSX.Element} ProblemsFilterBar component
 */
function ProblemsFilterBar({
  locationGroups,
  selectedLocation,
  onLocationChange,
  pointsMin,
  pointsMax,
  onPointsMinChange,
  onPointsMaxChange,
  topsFilter,
  defaultTopsFilter = "hasTops",
  onTopsFilterChange,
  photosFilter,
  defaultPhotosFilter = "all",
  onPhotosFilterChange,
  dateSetFilter,
  defaultDateSetFilter = "all",
  onDateSetFilterChange,
  onResetFilters,
  hasActiveFilters,
  disabled,
}) {
  const hasLocationOptions = locationGroups && locationGroups.length > 1;
  const hasPointsFilter = Boolean(pointsMin || pointsMax);
  const pointsActiveLabel = pointsMin && pointsMax
    ? `${pointsMin}–${pointsMax} pts`
    : pointsMin
      ? `≥ ${pointsMin} pts`
      : pointsMax
        ? `≤ ${pointsMax} pts`
        : "";

  return (
    <div className="filter-pill-row" aria-label="Problem filters">
      {hasLocationOptions && (
        <FilterPill
          label="Location"
          activeLabel={selectedLocation}
          isActive={Boolean(selectedLocation)}
          disabled={disabled}
        >
          {({ close }) => (
            <>
              <button
                type="button"
                className="filter-dropdown-option"
                onClick={() => {
                  onLocationChange("");
                  close();
                }}
                aria-pressed={!selectedLocation}
              >
                <span>All locations</span>
                {!selectedLocation && <span aria-hidden="true">✓</span>}
              </button>
              {locationGroups.map((group) => (
                <button
                  type="button"
                  key={group.name}
                  className="filter-dropdown-option"
                  onClick={() => {
                    onLocationChange(group.name);
                    close();
                  }}
                  aria-pressed={selectedLocation === group.name}
                >
                  <span>{group.name}</span>
                  {selectedLocation === group.name && (
                    <span aria-hidden="true">✓</span>
                  )}
                </button>
              ))}
            </>
          )}
        </FilterPill>
      )}

      <FilterPill
        label="Points"
        activeLabel={pointsActiveLabel}
        isActive={hasPointsFilter}
        disabled={disabled}
      >
        {({ close }) => (
          <PointsRangeDropdown
            pointsMin={pointsMin}
            pointsMax={pointsMax}
            onPointsMinChange={onPointsMinChange}
            onPointsMaxChange={onPointsMaxChange}
            disabled={disabled}
            close={close}
          />
        )}
      </FilterPill>

      <FilterPill
        label="Tops"
        activeLabel={findLabel(TOPS_OPTIONS, topsFilter)}
        isActive={topsFilter !== defaultTopsFilter}
        disabled={disabled}
      >
        {({ close }) => (
          <>
            {TOPS_OPTIONS.map((option) =>
              renderOption(option, topsFilter, onTopsFilterChange, close)
            )}
          </>
        )}
      </FilterPill>

      <FilterPill
        label="Photos"
        activeLabel={findLabel(PHOTOS_OPTIONS, photosFilter)}
        isActive={photosFilter !== defaultPhotosFilter}
        disabled={disabled}
      >
        {({ close }) => (
          <>
            {PHOTOS_OPTIONS.map((option) =>
              renderOption(option, photosFilter, onPhotosFilterChange, close)
            )}
          </>
        )}
      </FilterPill>

      <FilterPill
        label="Date Set"
        activeLabel={findLabel(DATE_SET_OPTIONS, dateSetFilter)}
        isActive={dateSetFilter !== defaultDateSetFilter}
        disabled={disabled}
      >
        {({ close }) => (
          <>
            {DATE_SET_OPTIONS.map((option) =>
              renderOption(option, dateSetFilter, onDateSetFilterChange, close)
            )}
          </>
        )}
      </FilterPill>

      <button
        type="button"
        className="filter-reset-button"
        onClick={onResetFilters}
        disabled={disabled || !hasActiveFilters}
      >
        Reset filters
      </button>
    </div>
  );
}

export default ProblemsFilterBar;
