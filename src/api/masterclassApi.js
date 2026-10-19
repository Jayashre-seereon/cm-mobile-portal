import api from './axios';

function formatCategoryLabel(category) {
  if (!category) {
    return 'General';
  }

  const rawValue =
    typeof category === 'string'
      ? category
      : category?.title || category?.name || category?.label || category?.category;

  if (!rawValue) {
    return 'General';
  }

  return String(rawValue)
    .split('_')
    .join(' ')
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function formatMasterclassTime(time) {
  if (!time) {
    return 'Time not available';
  }

  if (typeof time === 'string') {
    const trimmedTime = time.trim();

    if (!trimmedTime) {
      return 'Time not available';
    }

    if (!trimmedTime.includes('T') && (/[a-z]/i.test(trimmedTime) || trimmedTime.includes(':'))) {
      return trimmedTime;
    }
  }

  const parsedDate = new Date(time);

  if (Number.isNaN(parsedDate.getTime())) {
    return time;
  }

  return parsedDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function resolveMentorName(item) {
  return (
    item?.mentor_name ||
    item?.mentorName ||
    item?.speaker_name ||
    item?.speakerName ||
    item?.name ||
    item?.user?.name ||
    'Unknown Mentor'
  );
}

function resolveViews(item) {
  return Number(item?.views) || Number(item?.view_count) || Number(item?.viewCount) || 0;
}

function resolveVideoUrl(item) {
  return item?.video_url || item?.videoUrl || item?.url || '#';
}

function resolveLocked(item) {
  if (typeof item?.is_locked === 'boolean') {
    return item.is_locked;
  }

  if (typeof item?.locked === 'boolean') {
    return item.locked;
  }

  return true;
}

function resolveIsFree(item) {
  if (typeof item?.is_free === 'boolean') {
    return item.is_free;
  }

  if (typeof item?.isFree === 'boolean') {
    return item.isFree;
  }

  return false;
}

function mapMasterclassItem(item, index) {
  const categoryLabel = formatCategoryLabel(item?.category);

  return {
    id: String(item?.id ?? `${item?.title ?? 'masterclass'}-${index}`),
    title: item?.title || 'Untitled Career & Personality Videos',
    image: item?.image || null,
    mentor: resolveMentorName(item),
    duration: formatMasterclassTime(item?.time || item?.duration),
    views: resolveViews(item),
    career: categoryLabel,
    videoType: categoryLabel,
    locked: resolveLocked(item),
    isFree: resolveIsFree(item),
    accessTier: item?.accessTier || (resolveIsFree(item) ? 'preview' : 'locked'),
    url: resolveVideoUrl(item),
  };
}

export async function getMasterClasses() {
  const response = await api.get('/masterclass');
  const items = Array.isArray(response?.data?.data) ? response.data.data : [];

  return items
    .filter((item) => item?.is_active !== false)
    .map((item, index) => mapMasterclassItem(item, index));
}

export async function getMasterClassDetails(id) {
  if (id === null || id === undefined || id === '') {
    throw new Error('Career & Personality Videos id is required.');
  }

  const response = await api.get(`/masterclass/${id}`);
  const data = response?.data?.data ?? response?.data ?? null;
  return data ? mapMasterclassItem(data, 0) : null;
}

export async function startMasterClassPreview({ moduleId, pageType, pageId }) {
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
