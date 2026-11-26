import { router } from 'expo-router';

export function encodeReturnTarget(target) {
    return JSON.stringify(target);
}

// Return targets arrive through route params (and so can come from a deep link): only in-app
// screens under the drawer are accepted, with plain string params.
const ALLOWED_RETURN_PREFIX = '/(drawer)/';

function isAllowedPathname(pathname) {
    return typeof pathname === 'string'
        && pathname.startsWith(ALLOWED_RETURN_PREFIX)
        && !pathname.includes('..')
        && !/^[a-z][a-z0-9+.-]*:/i.test(pathname);
}

function sanitizeParams(params) {
    if (!params || typeof params !== 'object' || Array.isArray(params)) {
        return undefined;
    }
    const clean = {};
    for (const [key, value] of Object.entries(params)) {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            clean[key] = String(value);
        }
    }
    return Object.keys(clean).length ? clean : undefined;
}

export function decodeReturnTarget(value) {
    if (!value || Array.isArray(value)) {
        return null;
    }
    let target = value;
    if (typeof value === 'string' && !value.startsWith('/')) {
        try {
            target = JSON.parse(value);
        }
        catch {
            return null;
        }
    }
    if (typeof target === 'string') {
        return isAllowedPathname(target) ? target : null;
    }
    if (target && typeof target === 'object' && isAllowedPathname(target.pathname)) {
        const params = sanitizeParams(target.params);
        return params ? { pathname: target.pathname, params } : { pathname: target.pathname };
    }
    return null;
}

export function openSubscriptionPrompt(returnTarget) {
    router.push({
        pathname: '/(drawer)/subscription',
        params: returnTarget ? { returnTo: encodeReturnTarget(returnTarget) } : undefined,
    });
}
