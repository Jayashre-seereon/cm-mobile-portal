import api from './axios';

function buildLocation(address) {
  return address || 'Address not available';
}

function stripHtml(value) {
  if (!value) {
    return '';
  }

  return String(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function getInstituteIcon(instituteType) {
  const normalizedType = String(instituteType || '').toLowerCase();

  if (normalizedType.includes('medical')) {
    return 'medkit-outline';
  }

  if (normalizedType.includes('law')) {
    return 'scale-outline';
  }

  if (normalizedType.includes('design')) {
    return 'color-palette-outline';
  }

  if (normalizedType.includes('business')) {
    return 'briefcase-outline';
  }

  return 'business-outline';
}

function mapInstituteItem(item, index) {
  const country = item?.countruy || '';   
  const state = item?.state || '';
  const city = item?.city || '';
  const instituteType = item?.institute_type || 'Institute';
  const courses = Array.isArray(item?.course_offered) ? item.course_offered.filter(Boolean) : [];
  const categoryObj = item?.category ?? item?.categoryObj ?? null;
  const secondcategoryObj = item?.secondcategory ?? item?.secondcategoryObj ?? null;
  const subcategoryObj = item?.subcategory ?? item?.subcategoryObj ?? null;

  return {
    id: String(item?.id ?? `institute-${index}`),
    name: item?.name || 'Unnamed Institute',
  location: buildLocation(item?.address),  courses,
    type: instituteType,
    country,
    state,
    city,
    icon: getInstituteIcon(instituteType),
    logo: item?.logo || null,
    about: stripHtml(item?.about) || 'About information is not available right now.',
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

export async function getInstitutes({
  page = 1,
  limit = 30,
  category = '',
  country = '',
  state = '',
  type = '',
} = {}) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });

  if (category && category !== 'All') params.append('category', category);
  if (country && country !== 'All') params.append('country', country);
  if (state && state !== 'All') params.append('state', state);
  if (type && type !== 'All') params.append('type', type);

  const response = await api.get(`/institutes/paginated?${params.toString()}`);
  const items = Array.isArray(response?.data?.data) ? response.data.data : [];

  return {
    items: items.map((item, index) => mapInstituteItem(item, index)),
    pagination: response?.data?.pagination || null,
  };
}

export async function getInstituteById(id) {
  const response = await api.get(`/institutes/${encodeURIComponent(id)}`);
  const item = response?.data?.data;
  return item && typeof item === 'object' ? mapInstituteItem(item, 0) : null;
}

export async function getCategories() {
  const response = await api.get('/categories/');
  return response?.data;
}
