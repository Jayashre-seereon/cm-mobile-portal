import api from './axios';
import { formatIstDate } from '../utils/deadlineStatus';
import { normalizeExternalUrl } from '../utils/openExternalUrl';

function stripHtml(value) {
  if (!value) {
    return '';
  }

  return String(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatLabel(value) {
  const cleaned = stripHtml(value);

  if (!cleaned) {
    return '';
  }

  return cleaned
    .toLowerCase()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDate(value) {
  if (!value) {
    return 'Date not available';
  }

  // IST calendar date, the same date the Upcoming / Closed status is computed from.
  return formatIstDate(value) || String(value);
}

function formatApplicationDate(value, eligibility) {
  if (String(eligibility || '').trim().toLowerCase() !== 'true' || !value || value === 'Date not available') {
    return formatDate(value);
  }
  return formatIstDate(value, { monthYear: true }) || String(value);
}

function formatSubjects(subjects) {
  if (!Array.isArray(subjects) || subjects.length === 0) {
    return 'Subjects not available';
  }

  return subjects.join(', ');
}

function formatPattern(pattern) {
  const cleaned = stripHtml(pattern);

  if (!cleaned) {
    return ['Exam pattern not available'];
  }

  return cleaned
    .split(/(?<=\.)\s+|\s{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatTopColleges(colleges) {
  if (!Array.isArray(colleges) || colleges.length === 0) {
    return ['Top colleges not available'];
  }

  return colleges.filter(Boolean);
}

function mapEntranceExam(item, index) {
  const categoryObj = item?.category ?? item?.categoryObj ?? null;
  const secondcategoryObj = item?.secondcategory ?? item?.secondcategoryObj ?? null;
  const subcategoryObj = item?.subcategory ?? item?.subcategoryObj ?? null;

  return {
    id: String(item?.id ?? `entrance-exam-${index}`),
    name: item?.examname || 'Unnamed Exam',
    authority: formatLabel(item?.stream?.name) || formatLabel(item?.category?.title) || 'Entrance Exam',
    date: formatDate(item?.exam_date),
    issueDate: formatApplicationDate(item?.issuedate, item?.eligibility),
    lastDate: formatApplicationDate(item?.lastdate, item?.eligibility),
    lastDateRaw: item?.lastdate || null,
    eligibility: item?.eligibility || 'Eligibility not available',
    type: formatLabel(item?.stream?.name) || 'All',
    category: formatLabel(item?.category?.title) || 'General',
    mode: item?.mode || 'Mode not available',
    duration: item?.duration ? `${item.duration} min` : 'Duration not available',
    subjects: formatSubjects(item?.subject),
    totalMarks: item?.total_mark || 'Marks not available',
    frequency: item?.frequncy || 'Frequency not available',
    about: stripHtml(item?.about) || 'About information is not available right now.',
    aboutHtml: item?.about || '',
    examPattern: formatPattern(item?.exam_pattern),
    topColleges: formatTopColleges(item?.top_institution),
    // Only a valid http(s) link (scheme added when missing); '#' means "no website" and hides the button.
    website: normalizeExternalUrl(item?.url) || '#',
    categoryId: item?.categoryId ?? categoryObj?.id ?? null,
    secondcategoryId: item?.secondcategoryId ?? secondcategoryObj?.id ?? null,
    subcategoryId: item?.subcategoryId ?? subcategoryObj?.id ?? null,
    categoryObj,
    secondcategoryObj,
    subcategoryObj,
    categoryName: categoryObj?.title || categoryObj?.name || categoryObj?.label || item?.categoryName || '',
    secondcategoryName:
      secondcategoryObj?.title || secondcategoryObj?.name || secondcategoryObj?.label || item?.secondcategoryName || '',
    subcategoryName:
      subcategoryObj?.title || subcategoryObj?.name || subcategoryObj?.label || item?.subcategoryName || '',
    // The lean list (see getEntranceExams) has no `about` / `details`. Such an exam still
    // needs getEntranceExamById before its detail screen can show the full text.
    isLean: item?.about === undefined && item?.details === undefined,
  };
}

// The cards and filters only need a few fields. `lean=true` asks the server to leave out the
// long description text, which is most of the full list (several MB for 400+ exams, past the
// 20 s request timeout). An older server ignores the flag and returns everything, which still
// works - just slower. Order is the server's (API) order, which the preview "first 4 free" uses.
export async function getEntranceExams() {
  const response = await api.get('/entranceexam', { params: { lean: true } });
  const items = Array.isArray(response?.data?.data) ? response.data.data : [];

  return items.map((item, index) => mapEntranceExam(item, index));
}

// The full record of one exam (long description), loaded when it is opened.
export async function getEntranceExamById(id) {
  const response = await api.get(`/entranceexam/${encodeURIComponent(id)}`);
  const item = response?.data?.data;
  if (!item) {
    throw new Error('Exam details are not available right now.');
  }
  return mapEntranceExam(item, 0);
}

export const getCategories = async () => {
  const res = await api.get("/categories/");
  return res.data;
};
