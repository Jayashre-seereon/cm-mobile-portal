// Preview ("first N free") rules shared by the module screens and global search.
// Ported from the user portal's src/utils/previewAccess.js so mobile follows the same rules:
//  - In preview, a module's free items are the first N (4) entries of its FULL, unfiltered list
//    in the order the module shows it by default. Filters / search / sort never change them.
//  - Scholarships and videos go by the admin "free" flag instead; a video with no lock flag is locked.
//  - Career Archive: a career is free in preview only when its category is marked free.
import { getEntranceExams } from '../api/entranceExamApi';
import { getInstitutes } from '../api/instituteApi';
import { getMentors } from '../api/mentorApi';
import { getNewsletters } from '../api/newsletterApi';
import { getQuizzes } from '../api/quizApi';
import { getStudyAbroadCountries } from '../api/studyabroadApi';
import { sortQuizzes } from './quizOrder';

// How many items a module lists as free in preview.
export const PREVIEW_FREE_ITEM_LIMIT = 4;

// Module keys used by the screens and by global search.
export const PREVIEW_MODULES = {
  institutes: 'institutes',
  entranceExam: 'entrance-exam',
  quiz: 'quiz',
  mentor: 'book-mentor',
  videos: 'learn',
  newsletter: 'newsletter',
  abroad: 'abroad',
  scholarships: 'scholarships',
  library: 'library',
};

// Scholarships and videos are decided by the admin (each item's free flag), not by "first 4 free".
const FLAG_MODULES = new Set([PREVIEW_MODULES.scholarships, PREVIEW_MODULES.videos]);
const CACHE_TTL_MS = 5 * 60 * 1000;

// Some mobile API wrappers keep the server's date only on `raw` (e.g. mentors), so look there too.
const createdAtOf = (entry) =>
  entry?.createdAt || entry?.created_at || entry?.raw?.createdAt || entry?.raw?.created_at || null;

// Newest first by createdAt, falling back to the highest id when dates are missing.
export function sortNewestFirst(list = []) {
  return [...list].sort((a, b) => {
    const aDate = createdAtOf(a);
    const bDate = createdAtOf(b);
    if (aDate && bDate) return new Date(bDate) - new Date(aDate);
    return Number(b.id) - Number(a.id);
  });
}
export const sortMentorsNewestFirst = sortNewestFirst;

const asArray = (value) =>
  Array.isArray(value) ? value : Array.isArray(value?.data) ? value.data : Array.isArray(value?.items) ? value.items : [];

// Each loader returns the module's FULL list in the order its screen shows it by default.
// IMPORTANT: if a screen's default order changes, change its loader here too.
export const previewListLoaders = {
  // Institutes: page 1 of the directory, in server order.
  [PREVIEW_MODULES.institutes]: async () => asArray(await getInstitutes({ page: 1, limit: 30 })),
  // Entrance exams: API order.
  [PREVIEW_MODULES.entranceExam]: async () => asArray(await getEntranceExams()),
  // Quiz: the shared quiz order.
  [PREVIEW_MODULES.quiz]: async () => sortQuizzes(asArray(await getQuizzes())),
  // Book mentor: active mentors, newest first.
  [PREVIEW_MODULES.mentor]: async () =>
    sortMentorsNewestFirst(asArray(await getMentors()).filter((mentor) => mentor?.raw?.status !== false)),
  // Newsletter (Career Insights): newest first.
  [PREVIEW_MODULES.newsletter]: async () =>
    [...asArray(await getNewsletters())].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
  // Study abroad: highest id first.
  [PREVIEW_MODULES.abroad]: async () => [...asArray(await getStudyAbroadCountries())].sort((a, b) => b.id - a.id),
};

// Unicode property escapes (\p{L}) aren't supported by every JS engine React Native ships with,
// so build that regex defensively and fall back to an ASCII-only one.
const NON_ALNUM = (() => {
  try {
    return new RegExp('[^\\p{L}\\p{N}]+', 'gu');
  } catch {
    return /[^a-z0-9]+/g;
  }
})();

function normalizeName(value = '') {
  let text = String(value);
  try {
    text = text.normalize('NFKD');
  } catch {
    // normalize() unavailable: keep the text as is
  }
  return text.replace(/[̀-ͯ]/g, '').toLowerCase().replace(NON_ALNUM, '');
}

// An item is matched by its id. Only an entry with no id falls back to its name.
export function itemKeys(entry = {}) {
  if (entry.id !== undefined && entry.id !== null && entry.id !== '') {
    return [`id:${String(entry.id)}`];
  }
  return [entry.name, entry.title]
    .map((label) => normalizeName(label))
    .filter(Boolean)
    .map((normalized) => `name:${normalized}`);
}

// The free items of a module: the first `limit` entries of its FULL, unfiltered list.
export function buildFreeKeys(list = [], limit = PREVIEW_FREE_ITEM_LIMIT) {
  const keys = new Set();
  list.slice(0, limit).forEach((entry) => itemKeys(entry).forEach((key) => keys.add(key)));
  return keys;
}

// Is this item one of the free ones? (`freeKeys` comes from buildFreeKeys)
export function isPreviewFree(freeKeys, entry) {
  return Boolean(freeKeys) && itemKeys(entry).some((key) => freeKeys.has(key));
}

// Videos: unlocked only with full access, or when the ADMIN marked the video free (no "first 4 free"
// rule for videos). A video with NO lock flag at all is NOT unlocked.
export function isVideoUnlocked(video, { fullAccess = false } = {}) {
  return fullAccess || video?.accessTier === 'full' || Boolean(video?.isFree);
}

export function getPreviewAccessKind(moduleKey) {
  if (FLAG_MODULES.has(moduleKey)) return 'flag';
  if (previewListLoaders[moduleKey]) return 'list';
  return 'server';
}

// Newsletters let the server set the preview size; everything else is 4.
export function getPreviewLimit(moduleKey, accessResponse) {
  if (moduleKey !== PREVIEW_MODULES.newsletter) return PREVIEW_FREE_ITEM_LIMIT;
  const limit = Number(accessResponse?.previewItemLimit);
  return Number.isFinite(limit) && limit > 0 ? limit : PREVIEW_FREE_ITEM_LIMIT;
}

const cache = new Map();

// Resolves to the set of keys of the free items for a "list" module (cached for a few minutes).
export function loadPreviewFreeKeys(moduleKey, limit = PREVIEW_FREE_ITEM_LIMIT) {
  const loader = previewListLoaders[moduleKey];
  if (!loader) return Promise.resolve(new Set());
  const cacheKey = `${moduleKey}|${limit}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.promise;
  const promise = loader().then((list) => buildFreeKeys(Array.isArray(list) ? list : [], limit));
  cache.set(cacheKey, { at: Date.now(), promise });
  promise.catch(() => cache.delete(cacheKey)); // never cache a failure
  return promise;
}

/**
 * "free"    - the module lists this item as free in preview
 * "locked"  - the module lists it as locked
 * "pending" - a list module whose free items haven't been loaded yet
 * "server"  - the module's screen checks with the server when the item is opened
 */
export function resolvePreviewAccess(item, moduleKey, { freeKeys } = {}) {
  // Career Archive: free in preview only when its category is marked free (server sends the flag
  // on each career search result). No flag -> let the screen ask the server.
  if (moduleKey === PREVIEW_MODULES.library) {
    const careerFlag = item?.metadata?.isFree;
    if (typeof careerFlag === 'boolean') return careerFlag ? 'free' : 'locked';
    return 'server';
  }
  const kind = getPreviewAccessKind(moduleKey);
  if (kind === 'server') return 'server';
  if (kind === 'flag') {
    const isFree = item?.metadata?.isFree ?? item?.isFree;
    return isFree ? 'free' : 'locked';
  }
  // Videos: an admin-marked free item is free even before the list has loaded.
  if (moduleKey === PREVIEW_MODULES.videos && (item?.metadata?.isFree ?? item?.isFree)) return 'free';
  if (!freeKeys) return 'pending';
  return isPreviewFree(freeKeys, item) ? 'free' : 'locked';
}
