import api, { ensureAccessToken } from './axios';
import { palette } from '../careermap-data';

const mentorAccentPalette = [palette.primary, palette.blue, palette.orange, palette.secondary, palette.green, palette.purple, palette.pink, palette.teal];

function formatMentorPrice(value) {
  if (value === null || value === undefined || value === '') {
    return 'Price not available';
  }

  const rawValue = String(value).trim();
  const numericValue = Number(rawValue.replace(/[^\d.]/g, ''));

  if (Number.isFinite(numericValue) && numericValue > 0) {
    return `Rs ${numericValue.toLocaleString('en-IN')} / session`;
  }

  if (rawValue.toLowerCase().includes('rs')) {
    return rawValue;
  }

  return `Rs ${rawValue} / session`;
}

function buildAvatar(name = '') {
  const initials = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return initials || 'M';
}

function formatExperience(value) {
  if (value === null || value === undefined || value === '') {
    return 'Experience not available';
  }

  const numericValue = Number(value);

  if (Number.isFinite(numericValue)) {
    return `${numericValue} ${numericValue === 1 ? 'yr' : 'yrs'}`;
  }

  const rawValue = String(value).trim();

  // If API already sends "1 yr", "2 years", etc.
  return rawValue;
}

function stripHtml(value) {
  if (!value) {
    return '';
  }

  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseSkillList(value) {
  if (!value) {
    return [];
  }

  return String(value)
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatAvailabilityDate(value) {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return {
      key: String(value || ''),
      day: 'Day',
      date: String(value || ''),
      month: '',
    };
  }

  return {
    key: parsedDate.toISOString().split('T')[0],
    day: parsedDate.toLocaleDateString('en-IN', { weekday: 'short' }),
    date: String(parsedDate.getDate()),
    month: parsedDate.toLocaleDateString('en-IN', { month: 'short' }),
  };
}

function normalizeAvailability(availability) {
  if (!Array.isArray(availability)) {
    return [];
  }

  return availability
    .map((item, index) => {
      const dateInfo = formatAvailabilityDate(item?.date);
      const timeSlots = Array.isArray(item?.timeSlots) ? item.timeSlots.filter(Boolean) : [];

      return {
        id: String(item?.id ?? `${dateInfo.key || 'availability'}-${index}`),
        mentorId: item?.mentorId ?? null,
        key: dateInfo.key || String(item?.date || index),
        day: dateInfo.day,
        date: dateInfo.date,
        month: dateInfo.month,
        slots: timeSlots,
        rawDate: item?.date || null,
      };
    })
    .filter((item) => Boolean(item.key));
}

function normalizeBookedSlots(payload) {
  if (Array.isArray(payload)) {
    return payload.filter(Boolean).map((item) => String(item).trim());
  }

  if (Array.isArray(payload?.data)) {
    return payload.data.filter(Boolean).map((item) => String(item).trim());
  }

  return [];
}

export function mapMentorItem(item, index = 0) {
  const name = item?.name || 'Unknown Mentor';
  const availability = normalizeAvailability(item?.availability);
  const categoryObj = item?.category ?? item?.categoryObj ?? null;
  const secondcategoryObj = item?.secondcategory ?? item?.secondcategoryObj ?? null;
  const subcategoryObj = item?.subcategory ?? item?.subcategoryObj ?? null;

  return {
    id: String(item?.id ?? `mentor-${index}`),
    name,
    specialty: item?.designation || item?.specialty || item?.category || 'Career Guidance',
    rating: item?.rank ? String(item.rank) : '0',
    averageRating: Number.isFinite(Number(item?.averageRating)) ? Number(item.averageRating) : 0,
    totalReviews: Number.isFinite(Number(item?.totalReviews)) ? Number(item.totalReviews) : 0,
    experience: formatExperience(item?.experience),
    price: formatMentorPrice(item?.mentor_fees ?? item?.mentorFees ?? item?.price),
    designation: item?.designation || '',
    placeOfWork: item?.placeof_word || item?.placeOfWork || '',
    skill: item?.skill || '',
    skills: parseSkillList(item?.skill),
    tags: [
  subcategoryObj?.title ||
  secondcategoryObj?.name ||
  categoryObj?.title ||
  ''
].filter(Boolean),
   bio: stripHtml(item?.description) || 'Mentor profile information is not available right now.',
    bioHtml: item?.description || '',  accent: mentorAccentPalette[index % mentorAccentPalette.length],
    avatar: buildAvatar(name),
    email: item?.email || '',
    phoneNumber: item?.phone_number || item?.phoneNumber || '',
    dob: item?.dateof_birth || item?.dateOfBirth || '',
    education: item?.education || '',
    placeOfWork: item?.placeof_word || item?.placeOfWork || '',
    linkedin: item?.linkedin || '',
    facebook: item?.facebook || '',
    status: Boolean(item?.status),
    image: item?.image || null,
    resume: item?.resume || null,
    categoryId: item?.categoryId ?? null,
    secondcategoryId: item?.secondcategoryId ?? null,
    subCategoryId: item?.subCategoryId ?? null,
    subcategoryId: item?.subcategoryId ?? item?.subCategoryId ?? null,
    categoryObj,
    secondcategoryObj,
    subcategoryObj,
    categoryName: categoryObj?.title || categoryObj?.name || categoryObj?.label || item?.categoryName || item?.category || '',
    secondcategoryName:
      secondcategoryObj?.title || secondcategoryObj?.name || secondcategoryObj?.label || item?.secondcategoryName || item?.secondcategory || '',
    subcategoryName:
      subcategoryObj?.title || subcategoryObj?.name || subcategoryObj?.label || item?.subcategoryName || item?.subcategory || '',
    availability,
    raw: item,
  };
}

function extractMentorItems(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.mentors)) {
    return payload.mentors;
  }

  if (payload?.data && typeof payload.data === 'object') {
    return [payload.data];
  }

  if (payload && typeof payload === 'object') {
    return [payload];
  }

  return [];
}

export async function getMentors() {
  const response = await api.get('/mentor/');
  const items = extractMentorItems(response?.data);

  return items.map((item, index) => mapMentorItem(item, index));
}

export async function getMentorById(id) {
  if (id === null || id === undefined || id === '') {
    throw new Error('Mentor id is required.');
  }

  const response = await api.get(`/mentor/${id}`);
  const items = extractMentorItems(response?.data);
  const mentorItem = items[0] || response?.data?.data || response?.data;

  return mentorItem ? mapMentorItem(mentorItem, 0) : null;
}

export async function createMentorOrder(data) {
  const response = await api.post('/mentor-booking/create-order', data);
  return response?.data;
}

export async function verifyMentorPayment(data) {
  const response = await api.post('/mentor-booking/verify-payment', data);
  return response?.data;
}

export async function getBookedMentorSlots(mentorId, date) {
  if (mentorId === null || mentorId === undefined || mentorId === '') {
    throw new Error('Mentor id is required.');
  }

  if (!date) {
    throw new Error('Date is required.');
  }

  const accessToken = await ensureAccessToken();
  const response = await api.get('/mentor-booking/booked-slots', {
    params: {
      mentorId,
      date,
    },
    headers: accessToken
      ? {
          Authorization: `Bearer ${accessToken}`,
        }
      : undefined,
  });

  return normalizeBookedSlots(response?.data);
}

export async function createMentorReview(payload) {
  const response = await api.post('/mentorreview/', payload);
  return response?.data;
}

export const getCategories = async () => {
  const res = await api.get("/categories/");
  return res.data;
};