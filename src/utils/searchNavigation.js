import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { getUserDashboard } from '../api/authApi';
import { checkModuleAccess, getModules } from '../api/moduleAccessApi';
import {
  PREVIEW_MODULES,
  getPreviewAccessKind,
  getPreviewLimit,
  loadPreviewFreeKeys,
  resolvePreviewAccess,
} from './previewAccess';
import { normalizeExternalUrl, openExternalUrl } from './openExternalUrl';

/**
 * One place that turns a global-search item (GET /api/search result, also used for
 * Career Bee `links`) into a mobile expo-router target, mirroring the web portal's
 * resolveNavigationTarget but with the mobile routes and the params each screen reads.
 */

export const ROUTES = {
  dashboard: '/(drawer)/(tabs)',
  library: '/(drawer)/(tabs)/library',
  assessment: '/(drawer)/(tabs)/assessment',
  learn: '/(drawer)/(tabs)/learn',
  profile: '/(drawer)/(tabs)/profile',
  institute: '/(drawer)/institute',
  entranceExam: '/(drawer)/entrance-exam',
  mentor: '/(drawer)/book-mentor',
  scholarship: '/(drawer)/scholarship',
  abroad: '/(drawer)/abroad',
  quiz: '/(drawer)/quiz',
  newsletter: '/(drawer)/newsletter',
  subscription: '/(drawer)/subscription',
  notifications: '/(drawer)/notifications',
  settings: '/(drawer)/settings',
};

/** Career Bee `pages[].key` -> real mobile route (the API's `mobile` field is only a guess). */
export const PAGE_KEY_ROUTES = {
  dashboard: { pathname: ROUTES.dashboard },
  career_library: { pathname: ROUTES.library },
  assessment: { pathname: ROUTES.assessment },
  // /(drawer)/psychometric-test only redirects to the assessment tab, so go there directly.
  psychometric_test: { pathname: ROUTES.assessment },
  quiz: { pathname: ROUTES.quiz },
  entrance_exams: { pathname: ROUTES.entranceExam },
  institutes: { pathname: ROUTES.institute },
  scholarships: { pathname: ROUTES.scholarship },
  mentors: { pathname: ROUTES.mentor },
  masterclasses: { pathname: ROUTES.learn },
  study_abroad: { pathname: ROUTES.abroad },
  newsletter: { pathname: ROUTES.newsletter },
  plans: { pathname: ROUTES.subscription },
  notifications: { pathname: ROUTES.notifications },
  profile: { pathname: ROUTES.profile },
  settings_help: { pathname: ROUTES.settings },
};

const CAREER_TYPES = ['career', 'stream', 'category', 'secondcategory', 'subcategory', 'careerpath'];

const lower = (value) => String(value ?? '').trim().toLowerCase();
const idString = (value) => (value === null || value === undefined || value === '' ? undefined : String(value));

function compactParams(params) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''));
}

/**
 * @param {object} item search item `{ id, title, type, group, navigation: { path, url, type, id, ... } }`
 * @returns {{ pathname?: string, params?: object, url?: string }}
 */
export function resolveSearchTarget(item) {
  if (!item) {
    return { pathname: ROUTES.dashboard, params: {} };
  }

  const nav = item.navigation || {};
  const group = lower(item.group);
  const type = lower(item.type || nav.type);
  const id = idString(item.id ?? nav.id ?? nav.instituteId ?? nav.examId ?? nav.scholarshipId ?? nav.countryId ?? nav.videoId ?? nav.quizId ?? nav.newsletterId ?? nav.mentorId);
  const title = String(item.title || '').trim();
  const rawUrl = String(nav.url || nav.path || item.route || '').trim();

  if (/^https?:\/\//i.test(rawUrl)) {
    return { url: rawUrl };
  }

  if (type === 'module' && rawUrl.startsWith('/(drawer)')) {
    return { pathname: rawUrl, params: {} };
  }

  // 1. Careers (stream / category / subfield / specialization) and career paths -> Career Archive
  if (group === 'careers' || group === 'careerpaths' || CAREER_TYPES.includes(type)) {
    const params = { searchType: type || 'category', searchId: id, searchTitle: title };
    if (type === 'stream') {
      params.streamId = id;
    } else if (type === 'category') {
      params.categoryId = id;
      params.streamId = idString(nav.streamId ?? nav.query?.streamId ?? item.metadata?.streamId);
    } else if (type === 'secondcategory') {
      params.secondCategoryId = id;
      params.categoryId = idString(nav.categoryId ?? item.metadata?.categoryId);
      params.streamId = idString(nav.streamId ?? nav.query?.streamId);
    } else if (type === 'subcategory') {
      params.subCategoryId = id;
      params.categoryId = idString(nav.categoryId ?? item.metadata?.categoryId);
      params.secondCategoryId = idString(nav.secondcategoryId ?? item.metadata?.secondcategoryId);
    } else if (type === 'careerpath') {
      // A career path lives under a specialization: open that specialization's details.
      params.subCategoryId = idString(nav.subcategoryId ?? nav.query?.subcategoryId);
      params.secondCategoryId = idString(nav.secondcategoryId ?? nav.query?.secondcategoryId);
      params.categoryId = idString(nav.categoryId ?? nav.query?.categoryId);
    }
    return { pathname: ROUTES.library, params: compactParams(params) };
  }

  // 2. Institutions / colleges
  if (group === 'institutions' || group === 'colleges' || ['institution', 'institute', 'college'].includes(type)) {
    return {
      pathname: ROUTES.institute,
      params: compactParams({ instituteId: id, searchTitle: title }),
    };
  }

  // 3. Entrance exams
  if (group === 'entranceexams' || group === 'exams' || ['entranceexam', 'entranceexams', 'exam', 'exams'].includes(type)) {
    return { pathname: ROUTES.entranceExam, params: compactParams({ examId: id, search: title }) };
  }

  // 4. Mentors
  if (group === 'mentors' || ['mentor', 'mentors'].includes(type)) {
    return { pathname: ROUTES.mentor, params: compactParams({ mentorId: id, search: title }) };
  }

  // 5. Scholarships
  if (group === 'scholarships' || ['scholarship', 'scholarships'].includes(type)) {
    return { pathname: ROUTES.scholarship, params: compactParams({ scholarshipId: id, search: title }) };
  }

  // 6. Study abroad
  if (group === 'studyabroad' || group === 'study_abroad' || ['studyabroad', 'study_abroad', 'abroad'].includes(type)) {
    return { pathname: ROUTES.abroad, params: compactParams({ countryId: id, search: title }) };
  }

  // 7. Masterclasses -> Career & Personality Videos
  if (group === 'masterclasses' || group === 'videos' || group === 'learn' || ['masterclass', 'masterclasses', 'learn', 'video', 'videos'].includes(type)) {
    return { pathname: ROUTES.learn, params: compactParams({ videoId: id, search: title }) };
  }

  // 8. Quizzes
  if (group === 'quizzes' || ['quiz', 'quizzes'].includes(type)) {
    return { pathname: ROUTES.quiz, params: compactParams({ quizId: id, search: title }) };
  }

  // 9. Newsletters -> Career Insights
  if (group === 'newsletters' || ['newsletter', 'newsletters'].includes(type)) {
    return { pathname: ROUTES.newsletter, params: compactParams({ newsletterId: id, search: title }) };
  }

  // 10. Assessments
  if (['assessment', 'psychometric'].includes(group) || ['assessment', 'psychometric'].includes(type) || rawUrl.includes('assessment')) {
    return { pathname: ROUTES.assessment, params: {} };
  }

  return { pathname: ROUTES.dashboard, params: {} };
}

/** Career Bee page chip -> mobile target. */
export function resolvePageTarget(page) {
  const key = lower(page?.key);
  const target = PAGE_KEY_ROUTES[key];
  return target ? { pathname: target.pathname, params: { ...(target.params || {}) } } : null;
}

/*
 * Paywall: the dashboard opens a module by checking access first (locked -> unlock sheet,
 * otherwise push with moduleId + accessStatus). Search and Career Bee do the same, so every
 * screen's own preview / lock logic still applies.
 */
const MODULE_GATES = {
  [ROUTES.library]: { title: 'Career Archive', matchers: ['career archive'] },
  [ROUTES.learn]: { title: 'Career & Personality Videos', matchers: ['career & personality videos', 'masterclass'] },
  [ROUTES.entranceExam]: { title: 'Entrance Exam', matchers: ['entrance exam'] },
  [ROUTES.institute]: { title: 'Institutes', matchers: ['institute'] },
  [ROUTES.scholarship]: { title: 'Scholarships', matchers: ['scholarship'] },
  [ROUTES.mentor]: { title: 'Book Your Mentor', matchers: ['book your mentor', 'book mentor', 'mentor'] },
  [ROUTES.quiz]: { title: 'Quiz', matchers: ['quiz'] },
  [ROUTES.abroad]: { title: 'Study Abroad', matchers: ['study abroad'] },
  [ROUTES.newsletter]: { title: 'Career Insights', matchers: ['career insights', 'career newsletter', 'newsletter'] },
};

let modulesCache = { at: 0, items: null };

async function findModuleId(matchers) {
  if (!modulesCache.items || Date.now() - modulesCache.at > 60000) {
    modulesCache = { at: Date.now(), items: await getModules() };
  }
  const modules = Array.isArray(modulesCache.items) ? modulesCache.items : [];
  for (const matcher of matchers) {
    const found = modules.find((module) => lower(module?.title).includes(matcher));
    if (found && Number.isFinite(Number(found.id))) {
      return Number(found.id);
    }
  }
  return null;
}

// Module route -> previewAccess module key (which list / flag decides the free items).
export const ROUTE_PREVIEW_MODULE = {
  [ROUTES.library]: PREVIEW_MODULES.library,
  [ROUTES.institute]: PREVIEW_MODULES.institutes,
  [ROUTES.entranceExam]: PREVIEW_MODULES.entranceExam,
  [ROUTES.quiz]: PREVIEW_MODULES.quiz,
  [ROUTES.mentor]: PREVIEW_MODULES.mentor,
  [ROUTES.learn]: PREVIEW_MODULES.videos,
  [ROUTES.newsletter]: PREVIEW_MODULES.newsletter,
  [ROUTES.abroad]: PREVIEW_MODULES.abroad,
  [ROUTES.scholarship]: PREVIEW_MODULES.scholarships,
};

// Preview modules whose items are all free, so search never locks them item by item.
// Quiz has no first-4 rule: every quiz is free (the quiz screen, like the portal's QuizPage,
// lets anyone take any quiz; the server withholds the score in preview instead).
export const ALWAYS_FREE_PREVIEW_MODULES = new Set([PREVIEW_MODULES.quiz]);

// Same wording as the portal's GlobalSearchBar.
export const MODULE_LOCKED_HEADING = 'Module Locked';
export const MODULE_LOCK_MESSAGE =
  'This module is locked. Please purchase a subscription to continue accessing this module.';
export const PREVIEW_LOCK_MESSAGE = 'This page is locked. Please purchase a subscription to open';
export const VERIFY_FAILED_HEADING = 'Unable to verify access';
export const VERIFY_FAILED_MESSAGE =
  "We couldn't verify your access right now. Please try again in a moment.";

/** "unlocked" | "preview" | "locked" | null (the server's "full" counts as unlocked). */
export function normalizeAccessStatus(status) {
  const value = lower(status);
  if (value === 'unlocked' || value === 'full') return 'unlocked';
  if (value === 'preview') return 'preview';
  if (value === 'locked') return 'locked';
  return null;
}

/** Search results that open one specific page inside a module (not a module card). */
export function isDirectSearchResult(item = {}) {
  const type = lower(item?.type);
  const group = lower(item?.group);
  if (type === 'module' || group === 'modules') return false;
  return (
    ['careers', 'career', 'careerpaths'].includes(group) ||
    CAREER_TYPES.includes(type) ||
    ['institution', 'institute', 'institutes', 'college', 'colleges'].includes(type) ||
    ['institutions', 'colleges'].includes(group) ||
    ['entranceexam', 'entranceexams', 'exam', 'exams'].includes(type) ||
    ['entranceexams', 'exams'].includes(group) ||
    ['scholarship', 'scholarships'].includes(type) ||
    group === 'scholarships' ||
    ['masterclass', 'masterclasses', 'learn', 'video', 'videos'].includes(type) ||
    ['masterclasses', 'learn', 'videos'].includes(group) ||
    ['quiz', 'quizzes'].includes(type) ||
    group === 'quizzes' ||
    ['newsletter', 'newsletters'].includes(type) ||
    group === 'newsletters' ||
    ['studyabroad', 'study_abroad', 'abroad'].includes(type) ||
    ['studyabroad', 'study_abroad', 'abroad'].includes(group) ||
    ['mentor', 'mentors'].includes(type) ||
    group === 'mentors'
  );
}

/**
 * Dashboard modules (GET /user/dashboard, each with its Unlocked / Preview / Locked
 * `accessStatus`) keyed by mobile route, like the portal's dashboardData.modules.
 * @returns {Promise<Map<string, { id: any, title: string, accessStatus: string }>>}
 */
export async function loadDashboardModulesByRoute() {
  const response = await getUserDashboard();
  const modules = Array.isArray(response?.data?.modules) ? response.data.modules : [];
  const map = new Map();
  const gates = {
    ...MODULE_GATES,
    [ROUTES.assessment]: { title: 'Career Psychometric Assessment', matchers: ['psychometric', 'assessment'] },
  };
  Object.entries(gates).forEach(([route, gate]) => {
    for (const matcher of gate.matchers) {
      const found = modules.find((module) => lower(module?.title).includes(matcher));
      if (found) {
        map.set(route, { id: found.id, title: found.title || gate.title, accessStatus: lower(found.accessStatus) });
        break;
      }
    }
  });
  return map;
}

/*
 * External links come from admin content (search) or the chatbot's answer (Career Bee), so
 * they are never opened silently: the user sees the site's host name and confirms first.
 * Invalid links and failures are reported (openExternalUrl shows an alert).
 * Resolves to true when the link was opened.
 */
function confirmAndOpenExternal(rawUrl) {
  const url = normalizeExternalUrl(rawUrl);
  if (!url || !/^https?:\/\//i.test(url)) {
    Alert.alert('Link unavailable', 'This link is not available right now.');
    return Promise.resolve(false);
  }
  let host = url;
  try {
    host = new URL(url).hostname;
  } catch {
    // keep the full url as the label
  }
  const message = `This link opens ${host} outside the app.`;
  if (Platform.OS === 'web') {
    // react-native-web's Alert has no buttons; use the browser's confirm dialog.
    const ok = typeof window !== 'undefined' && typeof window.confirm === 'function'
      ? window.confirm(`Open external website?\n${message}`)
      : false;
    return ok ? openExternalUrl(url) : Promise.resolve(false);
  }
  return new Promise((resolve) => {
    Alert.alert(
      'Open external website?',
      message,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Open', onPress: () => { openExternalUrl(url).then(resolve, () => resolve(false)); } },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

/**
 * Navigate to a resolved target the way the dashboard does.
 * With `searchItem` (a global-search result that opens one page inside a module) it also
 * follows the portal's search rules: a locked module, or a preview module's locked item,
 * shows the lock prompt, and when access can't be verified the page stays closed.
 * @param {{ pathname?: string, params?: object, url?: string }} target
 * @param {{ onLocked?: (info: { title: string, message: string, returnTarget: object }) => void, fromGlobalSearch?: boolean, searchItem?: object }} options
 * @returns {Promise<'external'|'opened'|'locked'|'cancelled'>} 'cancelled' = external link not opened
 */
export async function openTarget(target, { onLocked, fromGlobalSearch = false, searchItem } = {}) {
  if (!target) {
    return 'opened';
  }
  if (target.url) {
    const opened = await confirmAndOpenExternal(target.url);
    return opened ? 'external' : 'cancelled';
  }

  const pathname = target.pathname || ROUTES.dashboard;
  const hasItem = Object.keys(target.params || {}).length > 0;
  // searchKey makes the target screen act on the item even when the same result is opened twice.
  const params = {
    ...(target.params || {}),
    ...(hasItem ? { searchKey: String(Date.now()) } : {}),
    ...(fromGlobalSearch ? { fromGlobalSearch: '1' } : {}),
  };
  // The assessment screen has no gate: it is always enterable and handles its own lock.
  const gate = MODULE_GATES[pathname];
  const isDirectResult = Boolean(searchItem) && isDirectSearchResult(searchItem);

  if (!gate) {
    router.push({ pathname, params });
    return 'opened';
  }

  const verifyFailed = () => {
    onLocked?.({
      title: VERIFY_FAILED_HEADING,
      message: VERIFY_FAILED_MESSAGE,
      returnTarget: { pathname, params: {} },
    });
    return 'locked';
  };

  let moduleId = null;
  try {
    moduleId = await findModuleId(gate.matchers);
  } catch {
    moduleId = null;
  }

  if (!Number.isFinite(moduleId)) {
    // Module access unknown -> don't let search open a page inside it.
    if (isDirectResult) return verifyFailed();
    router.push({ pathname, params });
    return 'opened';
  }

  try {
    const response = await checkModuleAccess(moduleId);
    if (!response?.allowed) {
      onLocked?.({
        title: MODULE_LOCKED_HEADING,
        message: `${MODULE_LOCK_MESSAGE} ${gate.title}`,
        returnTarget: { pathname, params: { moduleId: String(moduleId) } },
      });
      return 'locked';
    }
    const mode = lower(response?.mode);
    // In preview, a specific page opens from search only if the module's own list shows
    // that item as free (first N of the full list / admin free flag / career category flag).
    const previewModuleKey = ROUTE_PREVIEW_MODULE[pathname];
    if (isDirectResult && mode !== 'full' && previewModuleKey && !ALWAYS_FREE_PREVIEW_MODULES.has(previewModuleKey)) {
      const moduleKey = previewModuleKey;
      const freeKeys =
        getPreviewAccessKind(moduleKey) === 'list'
          ? await loadPreviewFreeKeys(moduleKey, getPreviewLimit(moduleKey, response))
          : undefined;
      if (resolvePreviewAccess(searchItem, moduleKey, { freeKeys }) === 'locked') {
        onLocked?.({
          title: MODULE_LOCKED_HEADING,
          message: `${PREVIEW_LOCK_MESSAGE} ${String(searchItem?.title || '').trim()}`.trim(),
          returnTarget: { pathname, params: { moduleId: String(moduleId) } },
        });
        return 'locked';
      }
    }
    router.push({
      pathname,
      params: { ...params, moduleId: String(moduleId), accessStatus: mode === 'full' ? 'unlocked' : 'preview' },
    });
  } catch {
    if (isDirectResult) return verifyFailed();
    router.push({ pathname, params });
  }
  return 'opened';
}

/**
 * Screen side: runs `apply()` once per new `searchKey` param, after `ready` is true.
 * `apply` may return false to be retried on the next render (e.g. list not loaded yet).
 * Returns the id currently "focused" by search; it is cleared when the screen loses focus.
 */
export function useSearchDeepLink(searchKey, ready, apply) {
  const handledRef = useRef(null);
  const [active, setActive] = useState(false);
  const key = typeof searchKey === 'string' ? searchKey : '';

  useEffect(() => {
    if (!key || handledRef.current === key || !ready) {
      return undefined;
    }
    // Run after the navigator's own focus handlers (some screens reset their state on focus).
    const timer = setTimeout(() => {
      if (handledRef.current === key) {
        return;
      }
      const result = apply();
      if (result !== false) {
        handledRef.current = key;
        setActive(true);
      }
    }, 0);
    return () => clearTimeout(timer);
  });

  useFocusEffect(useCallback(() => () => setActive(false), []));

  return active;
}
