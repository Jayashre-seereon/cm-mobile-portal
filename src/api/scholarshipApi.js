import api from './axios';

function stripHtml(value) {
  if (!value) {
    return '';
  }

  return String(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatDeadline(deadline) {
  if (!deadline) {
    return 'Deadline not available';
  }

  const parsedDate = new Date(deadline);

  if (Number.isNaN(parsedDate.getTime())) {
    return deadline;
  }

  return parsedDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getScholarshipStatus(deadline) {
  if (!deadline) {
    return 'Active';
  }

  const parsedDate = new Date(deadline);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Active';
  }

  return parsedDate.getTime() >= Date.now() ? 'Active' : 'Expired';
}

function formatAmount(price) {
  if (!price) {
    return 'Amount not available';
  }

  return `Rs ${price} / year`;
}

function formatRequirements(requirement) {
  if (!requirement) {
    return ['Requirements not available'];
  }

  return String(requirement)
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}
function formatEligibility(eligibility) {
  const cleaned = stripHtml(eligibility);

  if (!cleaned) {
    return ['Eligibility not available'];
  }

  return cleaned
    .split(/\r?\n|,|\.(?=\s|$)/)
    .map((item) => item.trim())
    .filter(Boolean);
}
function mapSections(sections) {
  if (!Array.isArray(sections)) {
    return [];
  }

  return sections.map((section, index) => ({
    id: String(section?.id ?? `section-${index}`),
    title: section?.title || `Section ${index + 1}`,
    description: stripHtml(section?.description) || '',
    descriptionHtml: section?.description || '',
  }));
}
function mapScholarshipItem(item, index) {
  const scholarshipType = item?.type || 'Scholarship';
  const categoryObj = item?.category ?? item?.categoryObj ?? null;
  const secondcategoryObj = item?.secondcategory ?? item?.secondcategoryObj ?? null;
  const subcategoryObj = item?.subcategory ?? item?.subcategoryObj ?? null;

  return {
    id: String(item?.id ?? `scholarship-${index}`),
    name: item?.name || 'Unnamed Scholarship',
    isFree: Boolean(item?.is_free ?? item?.isFree),
   eligibility: formatEligibility(item?.eligibility),
    amount: formatAmount(item?.price),
    deadline: formatDeadline(item?.deadline),
    tag: scholarshipType,
    status: getScholarshipStatus(item?.deadline),
    provider: scholarshipType,
   description: stripHtml(item?.description) || 'Scholarship details are not available right now.',
    descriptionHtml: item?.description || '',
     sections: mapSections(item?.sections),  requirements: formatRequirements(item?.requirement),
    link: item?.url || '#',
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

export async function getScholarships() {
  const response = await api.get('/scholarship');
  const items = Array.isArray(response?.data?.data) ? response.data.data : [];

  return items.map((item, index) => mapScholarshipItem(item, index));
}

export async function getScholarshipDetails(id) {
  if (id === null || id === undefined || id === '') {
    throw new Error('Scholarship id is required.');
  }

  const response = await api.get(`/scholarship/${id}`);
  const data = response?.data?.data ?? response?.data ?? null;
  return data ? mapScholarshipItem(data, 0) : null;
}

export async function startScholarshipPreview({ moduleId, pageType, pageId }) {
  if (moduleId === null || moduleId === undefined || moduleId === '' || pageType === null || pageType === undefined || pageType === '' || pageId === null || pageId === undefined || pageId === '') {
    throw new Error('moduleId, pageType, and pageId are required.');
  }

  const response = await api.post('/module-access/preview/start', {
    moduleId,
    pageType,
    pageId,
  });

  return response?.data ?? null;
}

export const getCategories = async () => {
  const res = await api.get("/categories/");
  return res.data;
};