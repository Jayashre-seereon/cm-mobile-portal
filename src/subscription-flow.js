import { router } from 'expo-router';

export function encodeReturnTarget(target) {
    return JSON.stringify(target);
}

export function decodeReturnTarget(value) {
    if (!value || Array.isArray(value)) {
        return null;
    }
    try {
        return JSON.parse(value);
    }
    catch {
        return null;
    }
}

export function openSubscriptionPrompt(returnTarget) {
    router.push({
        pathname: '/(drawer)/subscription',
        params: returnTarget ? { returnTo: encodeReturnTarget(returnTarget) } : undefined,
    });
}
