import api from './axios';

const EMPTY_GROUPS = {
  careers: [],
  careerPaths: [],
  institutions: [],
  entranceExams: [],
  mentors: [],
  scholarships: [],
  studyAbroad: [],
  masterclasses: [],
  quizzes: [],
  newsletters: [],
};

/**
 * Global search across careers, institutions, exams, mentors, scholarships, etc.
 * Same contract as the web portal: GET /api/search?q=&type=&limit=
 * (the shared axios base URL already ends in /api and adds the user's token when present).
 */
export async function globalSearch({ query = '', type = 'all', limit = 25, signal } = {}) {
  const trimmed = String(query).trim();
  if (!trimmed) {
    return { success: true, query: '', total: 0, results: [], grouped: { ...EMPTY_GROUPS } };
  }

  const response = await api.get('/search', {
    params: { q: trimmed, type: type || 'all', limit },
    signal,
  });

  return response?.data ?? null;
}

/** Quick suggestions: GET /api/search/suggestions?q=&limit= */
export async function getSearchSuggestions({ query = '', limit = 8, signal } = {}) {
  const trimmed = String(query).trim();
  if (!trimmed) {
    return { success: true, suggestions: [] };
  }

  const response = await api.get('/search/suggestions', {
    params: { q: trimmed, limit },
    signal,
  });

  return response?.data ?? null;
}
