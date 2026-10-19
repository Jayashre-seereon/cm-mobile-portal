import api from './axios';
import { palette } from '../careermap-data';

const fallbackPlanKeyMap = {
  'Psychometric Test': 'psychometric',
  'Psychometric + Counselling': 'premium',
  'Infocentre Access': 'infocentre',
  'Study Abroad Access': 'abroad',
};

const fallbackFeatureCatalog = {
  psychometric: ['1 Psychometric Test', 'Basic report', 'Career suggestions'],
  premium: ['Detailed report', '1-on-1 counselling', 'Mentor booking access', 'Career & Personality Videos access'],
  infocentre: ['Psychometric test', 'Career Archive', 'Career & Personality Videos', 'Mentor booking', 'Scholarship info'],
  abroad: ['Study Abroad module', 'Country details', 'Consultation request access'],
};

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

function formatPrice(value) {
  if (value === null || value === undefined || value === '') {
    return 'Rs 0';
  }

  const rawValue = String(value).trim();
  const digitsOnly = rawValue.replace(/[^\d.]/g, '');
  const numericValue = Number(digitsOnly);

  if (Number.isFinite(numericValue) && numericValue > 0) {
    return `Rs ${numericValue.toLocaleString('en-IN')}`;
  }

  if (rawValue.toLowerCase().includes('rs')) {
    return rawValue;
  }

  return `Rs ${rawValue}`;
}

function resolvePlanKey(item) {
  const name = String(item?.name || '').trim();
  const planType = String(item?.plan_type || '').trim().toLowerCase();

  if (fallbackPlanKeyMap[name]) {
    return fallbackPlanKeyMap[name];
  }

  if (planType.includes('best seller')) {
    return 'premium';
  }

  if (planType.includes('recommended')) {
    return 'infocentre';
  }

  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || String(item?.id ?? 'plan');
}

function resolvePlanLabel(item) {
  const planType = String(item?.plan_type || '').trim().toLowerCase();

  if (planType.includes('best seller')) {
    return 'Highest Seller';
  }

  if (planType.includes('recommended')) {
    return 'Recommended';
  }

  return '';
}

function resolveFeatures(item, key) {
  const moduleTitles = Array.isArray(item?.modules)
    ? item.modules
        .map((module) => module?.title)
        .filter(Boolean)
    : [];

  if (moduleTitles.length > 0) {
    return moduleTitles;
  }

  const plainFeatures = stripHtml(item?.features);

  const textFeatures = plainFeatures
    ? plainFeatures
      .split(/[,\n|]+/)
      .map((entry) => entry.trim())
      .filter(Boolean)
    : [];

  const fallbackFeatures = fallbackFeatureCatalog[key] || [];

  return [...new Set([...fallbackFeatures, ...textFeatures])].filter(Boolean);
}

function mapPlanItem(item, index = 0) {
  const name = item?.name || 'Untitled Plan';
  const id = resolvePlanKey(item);
  const features = resolveFeatures(item, id);

  return {
    id,
    apiId: String(item?.id ?? ''),
    name,
    price: formatPrice(item?.price),
   description: stripHtml(item?.description) || 'Plan description is not available.',
    descriptionHtml: item?.description || '', features,
    validity: item?.validity || '12 month',
    planType: item?.plan_type || '',
    badge: resolvePlanLabel(item),
    recommended: String(item?.plan_type || '').trim().toLowerCase().includes('recommended'),
    highestseller: String(item?.plan_type || '').trim().toLowerCase().includes('best seller'),
    accent: [palette.primary, palette.blue, palette.orange, palette.secondary, palette.green][index % 5],
    modules: Array.isArray(item?.modules)
      ? item.modules.map((module) => ({
          id: String(module?.id ?? ''),
          title: module?.title || '',
          markAsFree: Boolean(module?.markas_free),
        }))
      : [],
    raw: item,
  };
}

function extractPlanItems(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (payload?.data && typeof payload.data === 'object') {
    return [payload.data];
  }

  if (payload && typeof payload === 'object') {
    return [payload];
  }

  return [];
}

export async function getPlans() {
  const response = await api.get('/plans/');
  const items = extractPlanItems(response?.data);

  return items.map((item, index) => mapPlanItem(item, index));
}

export async function getPlanByKey(key) {
  if (!key) {
    throw new Error('Plan key is required.');
  }

  const plans = await getPlans();
  return plans.find((plan) => plan.id === String(key)) || null;
}

export async function createOrder(planOrId) {
  const resolvedPlanId =
    typeof planOrId === 'object' && planOrId !== null
      ? planOrId.apiId || planOrId.raw?.id || planOrId.id
      : planOrId;

  if (!resolvedPlanId) {
    throw new Error('Plan id is required.');
  }

  const response = await api.post('/user/payment/create-order', {
    planId: resolvedPlanId,
    plan_id: resolvedPlanId,
    planKey: typeof planOrId === 'object' && planOrId !== null ? planOrId.id : undefined,
  });

  return response?.data;
}

export async function verifyPayment(paymentData) {
  const response = await api.post('/user/payment/verify-payment', paymentData);
  return response?.data;
}
