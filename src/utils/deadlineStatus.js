/*
 * Deadlines (scholarship deadline, exam last date) are calendar dates. The backend stores them
 * as midnight UTC ("2025-03-31T00:00:00.000Z"), so reading them in the device time zone shows
 * the day before for users west of UTC. Everything here works on the India (IST, UTC+05:30)
 * calendar date, both for what is displayed and for the Active / Expired / Coming soon status,
 * so the printed date and the status always agree whatever the device time zone is.
 */

const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Status for an item that has no (or an unreadable) deadline. */
export const NO_DEADLINE_STATUS = 'Unknown';

/**
 * IST calendar date of a deadline value as { year, month (0-11), day }, or null.
 * A plain "YYYY-MM-DD" is taken as is; a timestamp is converted to its IST date.
 */
export function getIstDateParts(value) {
  if (value === null || value === undefined || value === '') return null;
  const text = String(value).trim();
  const dateOnly = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    return { year: Number(dateOnly[1]), month: Number(dateOnly[2]) - 1, day: Number(dateOnly[3]) };
  }
  const parsed = value instanceof Date ? value : new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  const ist = new Date(parsed.getTime() + IST_OFFSET_MS);
  return { year: ist.getUTCFullYear(), month: ist.getUTCMonth(), day: ist.getUTCDate() };
}

// Day number (days since epoch) of a calendar date, for comparisons.
function toDayNumber(parts) {
  return Math.floor(Date.UTC(parts.year, parts.month, parts.day) / DAY_MS);
}

function todayIstDayNumber() {
  return toDayNumber(getIstDateParts(new Date()));
}

/** "31 Mar 2025" (or "March 2025" with { monthYear: true }) on the IST calendar; null if unreadable. */
export function formatIstDate(value, { monthYear = false } = {}) {
  const parts = getIstDateParts(value);
  if (!parts) return null;
  if (monthYear) return `${MONTHS_LONG[parts.month]} ${parts.year}`;
  return `${String(parts.day).padStart(2, '0')} ${MONTHS_SHORT[parts.month]} ${parts.year}`;
}

export function isComingSoonDeadline(value) {
  const parts = getIstDateParts(value);
  if (!parts) return false;
  const daysLeft = toDayNumber(parts) - todayIstDayNumber();
  return daysLeft >= 0 && daysLeft <= 30;
}

/**
 * 'Active' (deadline today or later), 'Expired' (deadline passed) or NO_DEADLINE_STATUS
 * when there is no readable deadline - such an item is never reported as open.
 */
export function getDeadlineStatus(value) {
  const parts = getIstDateParts(value);
  if (!parts) return NO_DEADLINE_STATUS;
  return toDayNumber(parts) < todayIstDayNumber() ? 'Expired' : 'Active';
}
