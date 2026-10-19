import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import { checkModuleAccess, getModules } from '../api/moduleAccessApi';

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
  const id = idString(item.id ?? nav.id);
  const title = String(item.title || '').trim();
  const rawUrl = String(nav.url || nav.path || item.route || '').trim();

  if (/^https?:\/\//i.test(rawUrl)) {
    return { url: rawUrl };
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
    return { pathname: ROUTES.institute, params: compactParams({ instituteId: id, search: title }) };
  }

  // 3. Entrance exams
  if (group === 'entranceexams' || group === 'exams' || ['entranceexam', 'exam'].includes(type)) {
    return { pathname: ROUTES.entranceExam, params: compactParams({ examId: id, search: title }) };
  }

  // 4. Mentors
  if (group === 'mentors' || type === 'mentor') {
    return { pathname: ROUTES.mentor, params: compactParams({ mentorId: id, search: title }) };
  }

  // 5. Scholarships
  if (group === 'scholarships' || type === 'scholarship') {
    return { pathname: ROUTES.scholarship, params: compactParams({ scholarshipId: id, search: title }) };
  }

  // 6. Study abroad
  if (group === 'studyabroad' || group === 'study_abroad' || ['studyabroad', 'study_abroad', 'abroad'].includes(type)) {
    return { pathname: ROUTES.abroad, params: compactParams({ countryId: id, search: title }) };
  }

  // 7. Masterclasses -> Career & Personality Videos
  if (group === 'masterclasses' || group === 'videos' || ['masterclass', 'video'].includes(type)) {
    return { pathname: ROUTES.learn, params: compactParams({ videoId: id, search: title }) };
  }

  // 8. Quizzes
  if (group === 'quizzes' || type === 'quiz') {
    return { pathname: ROUTES.quiz, params: compactParams({ quizId: id }) };
  }

  // 9. Newsletters -> Career Insights
  if (group === 'newsletters' || type === 'newsletter') {
    return { pathname: ROUTES.newsletter, params: compactParams({ newsletterId: id }) };
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

/**
 * Navigate to a resolved target the way the dashboard does.
 * @param {{ pathname?: string, params?: object, url?: string }} target
 * @param {{ onLocked?: (info: { title: string, message: string, returnTarget: object }) => void }} options
 * @returns {Promise<'external'|'opened'|'locked'>}
 */
export async function openTarget(target, { onLocked } = {}) {
  if (!target) {
    return 'opened';
  }
  if (target.url) {
    await Linking.openURL(target.url).catch(() => {});
    return 'external';
  }

  const pathname = target.pathname || ROUTES.dashboard;
  const hasItem = Object.keys(target.params || {}).length > 0;
  // searchKey makes the target screen act on the item even when the same result is opened twice.
  const params = { ...(target.params || {}), ...(hasItem ? { searchKey: String(Date.now()) } : {}) };
  const gate = MODULE_GATES[pathname];

  if (!gate) {
    router.push({ pathname, params });
    return 'opened';
  }

  let moduleId = null;
  try {
    moduleId = await findModuleId(gate.matchers);
  } catch {
    moduleId = null;
  }

  if (!Number.isFinite(moduleId)) {
    router.push({ pathname, params });
    return 'opened';
  }

  try {
    const response = await checkModuleAccess(moduleId);
    if (!response?.allowed) {
      onLocked?.({
        title: `Unlock ${gate.title}`,
        message: response?.message || 'Please purchase a subscription to continue accessing this module.',
        returnTarget: { pathname, params: { moduleId: String(moduleId) } },
      });
      return 'locked';
    }
    const mode = lower(response?.mode);
    router.push({
      pathname,
      params: { ...params, moduleId: String(moduleId), accessStatus: mode === 'full' ? 'unlocked' : 'preview' },
    });
  } catch {
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
