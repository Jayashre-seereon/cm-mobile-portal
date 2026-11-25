// Subscription plans in global search: match by plan name, price, validity, description and
// included modules. Results open the Subscription page.
const SEARCH_PLANS_TTL_MS = 5 * 60 * 1000;
let plansCache = { at: 0, promise: null };

const textOf = (value) =>
  String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
const digitsOf = (value) => String(value ?? '').replace(/[^\d.]/g, '').replace(/\.0+$/, '');

/** Loads plans once (cached for 5 minutes). Never throws: returns [] on failure. */
export function loadSearchPlans(getPlans) {
  if (!plansCache.promise || Date.now() - plansCache.at > SEARCH_PLANS_TTL_MS) {
    plansCache = {
      at: Date.now(),
      promise: Promise.resolve()
        .then(() => getPlans())
        .then((plans) => (Array.isArray(plans) ? plans : []))
        .catch(() => {
          plansCache = { at: 0, promise: null }; // retry on next search
          return [];
        }),
    };
  }
  return plansCache.promise;
}

/** Returns search results (module-type, labelled 'Plan') for plans matching the query. */
export function matchPlans(plans, query, route) {
  const q = textOf(query);
  if (!q) return [];
  const qDigits = digitsOf(q);
  const tokens = q.split(' ').filter(Boolean);

  return (Array.isArray(plans) ? plans : [])
    .filter((plan) => {
      const raw = plan?.raw || {};
      const price = digitsOf(raw.price ?? plan?.price);
      const modules = (plan?.modules || []).map((m) => (typeof m === 'string' ? m : m?.title));
      const haystack = textOf(
        [plan?.name, raw.plan_type, plan?.badge, plan?.validity, plan?.description, ...modules, price].join(' ')
      );
      if (/^\d+(\.\d+)?$/.test(qDigits) && qDigits === q.replace(/[^\d.]/g, '') && price && price.startsWith(qDigits)) {
        return true;
      }
      return tokens.every((token) => haystack.includes(token));
    })
    .map((plan) => {
      const raw = plan?.raw || {};
      const price = digitsOf(raw.price ?? plan?.price);
      const priceText = price ? `₹${Number(price).toLocaleString('en-IN')}` : '';
      const validity = String(raw.validity ?? plan?.validity ?? '').trim();
      const id = String(raw.id ?? plan?.apiId ?? plan?.id ?? plan?.name);
      return {
        id: `plan:${id}`,
        title: plan?.name || 'Subscription plan',
        subtitle: [priceText, validity ? `Validity: ${validity}` : ''].filter(Boolean).join(' · ') || 'Subscription plan',
        type: 'module',
        group: 'modules',
        badge: 'Plan',
        isPlan: true,
        navigation: { path: route },
      };
    });
}
