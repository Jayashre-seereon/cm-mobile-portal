import api from './axios';

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

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
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
    issueDate: formatDate(item?.issuedate),
    lastDate: formatDate(item?.lastdate),
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
    website: item?.url || '#',
    categoryId: item?.categoryId ?? null,
    secondcategoryId: item?.secondcategoryId ?? null,
    subcategoryId: item?.subcategoryId ?? null,
    categoryObj,
    secondcategoryObj,
    subcategoryObj,
    categoryName: categoryObj?.title || categoryObj?.name || categoryObj?.label || item?.categoryName || '',
    secondcategoryName:
      secondcategoryObj?.title || secondcategoryObj?.name || secondcategoryObj?.label || item?.secondcategoryName || '',
    subcategoryName:
      subcategoryObj?.title || subcategoryObj?.name || subcategoryObj?.label || item?.subcategoryName || '',
  };
}

export async function getEntranceExams() {
  const response = await api.get('/entranceexam');
  const items = Array.isArray(response?.data?.data) ? response.data.data : [];

  return items.map((item, index) => mapEntranceExam(item, index));
}

export const getCategories = async () => {
  const res = await api.get("/categories/");
  return res.data;
};