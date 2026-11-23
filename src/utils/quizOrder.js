// The order the Quiz screen lists quizzes in. Shared with global search so both agree
// on which quizzes are "first" (the free preview items). Same as the user portal.
export const QUIZ_ORDER = [
  'science',
  'commerce',
  'arts and humanities',
  'neutral',
  'competitive',
  'vocational',
];

export function normalizeQuizTitle(title) {
  return String(title || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\s+/g, ' ');
}

export function sortQuizzes(quizzes = []) {
  return [...quizzes].sort((a, b) => {
    const titleA = normalizeQuizTitle(a.title);
    const titleB = normalizeQuizTitle(b.title);
    const indexA = QUIZ_ORDER.indexOf(titleA);
    const indexB = QUIZ_ORDER.indexOf(titleB);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return titleA.localeCompare(titleB);
  });
}
