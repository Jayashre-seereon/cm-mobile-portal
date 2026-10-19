import api from './axios';

function stripHtml(value) {
  if (!value) {
    return '';
  }

  return String(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatList(value, fallback) {
  if (Array.isArray(value)) {
    const items = value.map((item) => String(item).trim()).filter(Boolean);
    return items.length ? items : [fallback];
  }

  if (!value) {
    return [fallback];
  }

  const items = String(value)
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length ? items : [fallback];
}

function formatCost(value, fallback) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  return String(value).trim() || fallback;
}

function mapStudyAbroadItem(item, index) {
  const title = item?.title || item?.country_name || 'Study Abroad';

  return {
    id: String(item?.id ?? `study-abroad-${index}`),
    title,
    countryName: item?.country_name || title,
   description: item?.description || '',
     overview: stripHtml(item?.overview) || 'Overview not available.',
    visaWork: stripHtml(item?.visa_work) || 'Visa guidance not available.',
    livingCost: formatCost(item?.living_cost, 'Living cost not available.'),
    tuitionCost: formatCost(item?.tution_cost, 'Tuition cost not available.'),
    topUniversities: formatList(item?.top_university, 'University details not available.'),
    scholarships: formatList(item?.scholarship, 'Scholarship details not available.'),
    requirements: formatList(item?.requirment, 'Requirement details not available.'),
    popularCourses: formatList(item?.popular_course, 'Course details not available.'),
  };
}

export async function getStudyAbroadCountries() {
  const response = await api.get('/studyabroad/');
  const items = Array.isArray(response?.data?.data) ? response.data.data : [];

  return items.map((item, index) => mapStudyAbroadItem(item, index));
}

export async function createStudyAbroadConsultation(payload) {
  const asList = (value) => Array.isArray(value) ? value : value ? [value] : [];
  const requestBody = {
    ...payload,
    studyAbroadId: Number(payload?.studyAbroadId),
    // Match the shared user-portal API contract: these are Prisma scalar lists.
    primaryFundingSource: asList(payload?.primaryFundingSource),
    preferredCountries: asList(payload?.preferredCountries),
    otherEntranceExams: asList(payload?.otherEntranceExams),
    topPriorities: asList(payload?.topPriorities),
    documentsAvailable: asList(payload?.documentsAvailable),
    servicesRequired: asList(payload?.servicesRequired),
    preferredIntake: Array.isArray(payload?.preferredIntake)
      ? payload.preferredIntake[0] || null
      : payload?.preferredIntake || null,
    englishTest: Array.isArray(payload?.englishTest)
      ? payload.englishTest[0] || null
      : payload?.englishTest || null,
  };
  const response = await api.post('/studyabroad/consult/create', requestBody);
  return response?.data?.data ?? null;
}
