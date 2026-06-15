/**
 * Utility functions for filtering problems in the problems table.
 */

export const TOPS_FILTER_DEFAULT = 'hasTops';
export const PHOTOS_FILTER_DEFAULT = 'all';
export const DATE_SET_FILTER_DEFAULT = 'all';

export const DEFAULT_TOPS_FILTER = TOPS_FILTER_DEFAULT;
export const DEFAULT_PHOTOS_FILTER = PHOTOS_FILTER_DEFAULT;
export const DEFAULT_DATE_SET_FILTER = DATE_SET_FILTER_DEFAULT;

export const PROBLEM_FILTER_DEFAULTS = Object.freeze({
  tops: TOPS_FILTER_DEFAULT,
  photos: PHOTOS_FILTER_DEFAULT,
  dateSet: DATE_SET_FILTER_DEFAULT,
});

/**
 * Parses an optional numeric range bound.
 * @param {string|number|null|undefined} value - The value to parse
 * @returns {number|null} A finite number, null for empty bounds, or NaN for invalid bounds
 */
export const parseNumberRangeBound = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== 'number' && typeof value !== 'string') {
    return NaN;
  }

  if (typeof value === 'string' && value.trim() === '') {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : NaN;
};

export const parseOptionalNumberRangeBound = parseNumberRangeBound;
export const parsePointRangeBound = parseNumberRangeBound;

const isValidRangeBound = (value) => value === null || Number.isFinite(value);

/**
 * Checks whether point range bounds are valid.
 * @param {string|number|null|undefined} minValue - The lower range bound
 * @param {string|number|null|undefined} maxValue - The upper range bound
 * @returns {boolean} True when bounds are finite/empty and min is not greater than max
 */
export const isPointRangeValid = (minValue, maxValue) => {
  const min = parseNumberRangeBound(minValue);
  const max = parseNumberRangeBound(maxValue);

  if (!isValidRangeBound(min) || !isValidRangeBound(max)) {
    return false;
  }

  if (min !== null && max !== null && min > max) {
    return false;
  }

  return true;
};

/**
 * Tests whether points are within an inclusive range.
 * @param {string|number|null|undefined} points - The points value to test
 * @param {string|number|null|undefined} minValue - The lower range bound
 * @param {string|number|null|undefined} maxValue - The upper range bound
 * @returns {boolean} True when points are inside the inclusive range
 */
export const isPointInRange = (points, minValue, maxValue) => {
  const min = parseNumberRangeBound(minValue);
  const max = parseNumberRangeBound(maxValue);

  if (!isPointRangeValid(min, max)) {
    return false;
  }

  if (min === null && max === null) {
    return true;
  }

  const pointValue = parseNumberRangeBound(points);
  if (!Number.isFinite(pointValue)) {
    return false;
  }

  return (min === null || pointValue >= min) && (max === null || pointValue <= max);
};

export const isInPointRange = isPointInRange;
export const matchesPointRangeFilter = (problem, minValue, maxValue) =>
  isPointInRange(problem?.score, minValue, maxValue);

const getCategoryCode = (category) => {
  if (typeof category === 'number' || typeof category === 'string') {
    return String(category);
  }

  return category?.code;
};

const getScopedProblemStats = (problem, categoryOrFocusCategories, focusCategories) => {
  const stats = problem?.stats;
  if (!stats) {
    return [];
  }

  const scope = focusCategories !== undefined ? focusCategories : categoryOrFocusCategories;
  const hasExplicitScope = Array.isArray(scope) || Boolean(scope);
  const categories = Array.isArray(scope) ? scope : scope ? [scope] : [];
  const categoryCodes = categories.map(getCategoryCode).filter(Boolean);

  if (categoryCodes.length === 0) {
    return hasExplicitScope ? [] : Object.values(stats);
  }

  return categoryCodes.map((categoryCode) => stats[categoryCode]).filter(Boolean);
};

/**
 * Tests whether a problem matches the tops filter for the scoped categories.
 * @param {Object} problem - The problem to test
 * @param {string} topsFilter - all, hasTops, or noTops
 * @param {string|Object|Array} categoryOrFocusCategories - Category scope
 * @param {Array} focusCategories - Optional focus category scope
 * @returns {boolean} True when the problem matches the tops filter
 */
export const matchesTopsFilter = (
  problem,
  topsFilter = TOPS_FILTER_DEFAULT,
  categoryOrFocusCategories,
  focusCategories
) => {
  const filter = topsFilter || TOPS_FILTER_DEFAULT;
  if (filter === 'all') {
    return true;
  }

  const hasTops = getScopedProblemStats(
    problem,
    categoryOrFocusCategories,
    focusCategories
  ).some((stats) => (stats?.tops || 0) > 0);

  if (filter === 'hasTops') {
    return hasTops;
  }

  if (filter === 'noTops' || filter === 'withoutTops' || filter === 'zeroTops') {
    return !hasTops;
  }

  return true;
};

/**
 * Tests whether a problem matches the photos filter.
 * @param {Object} problem - The problem to test
 * @param {string|Object} photosFilter - all, hasPhotos, or noPhotos
 * @param {Object|string} problemPhotos - Photos keyed by climbNo
 * @returns {boolean} True when the problem matches the photos filter
 */
export const matchesPhotosFilter = (
  problem,
  photosFilter = PHOTOS_FILTER_DEFAULT,
  problemPhotos = {}
) => {
  const hasPhotosMapSecond = Boolean(photosFilter) && typeof photosFilter === 'object';
  const filter = hasPhotosMapSecond
    ? (typeof problemPhotos === 'string' ? problemPhotos : PHOTOS_FILTER_DEFAULT)
    : photosFilter || PHOTOS_FILTER_DEFAULT;
  const photosByClimbNo = hasPhotosMapSecond ? photosFilter : problemPhotos;
  const hasPhotos = (photosByClimbNo?.[problem?.climbNo]?.length || 0) > 0;

  if (filter === 'all') {
    return true;
  }

  if (filter === 'hasPhotos' || filter === 'withPhotos') {
    return hasPhotos;
  }

  if (filter === 'noPhotos' || filter === 'withoutPhotos') {
    return !hasPhotos;
  }

  return true;
};

const toValidDate = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const startOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date, days) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

const isWithinDateRange = (date, startDate, endDate) =>
  date >= startDate && date < endDate;

/**
 * Tests whether a problem matches the date set filter.
 * @param {Object} problem - The problem to test
 * @param {string} dateSetFilter - all, hasDate, noDate, today, last7Days, last30Days, or olderThan30Days
 * @param {Date|string|number} referenceDate - Date used for relative filters
 * @returns {boolean} True when the problem matches the date filter
 */
export const matchesDateSetFilter = (
  problem,
  dateSetFilter = DATE_SET_FILTER_DEFAULT,
  referenceDate = new Date()
) => {
  const filter = dateSetFilter || DATE_SET_FILTER_DEFAULT;
  if (filter === 'all') {
    return true;
  }

  const createdAt = toValidDate(problem?.createdAt);

  if (filter === 'hasDate' || filter === 'hasDateSet' || filter === 'dateSet') {
    return Boolean(createdAt);
  }

  if (filter === 'noDate' || filter === 'noDateSet' || filter === 'withoutDate') {
    return !createdAt;
  }

  if (!createdAt) {
    return false;
  }

  const now = toValidDate(referenceDate) || new Date();
  const todayStart = startOfDay(now);

  if (filter === 'today') {
    return isWithinDateRange(createdAt, todayStart, addDays(todayStart, 1));
  }

  if (filter === 'yesterday') {
    return isWithinDateRange(createdAt, addDays(todayStart, -1), todayStart);
  }

  if (filter === 'last7Days' || filter === 'lastWeek') {
    return isWithinDateRange(createdAt, addDays(todayStart, -6), addDays(todayStart, 1));
  }

  if (filter === 'last30Days' || filter === 'lastMonth') {
    return isWithinDateRange(createdAt, addDays(todayStart, -29), addDays(todayStart, 1));
  }

  if (filter === 'olderThan30Days') {
    return createdAt < addDays(todayStart, -29);
  }

  return true;
};
