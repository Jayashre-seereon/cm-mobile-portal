import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import { verifyPayment } from './api/planApi';

// Razorpay has already captured the money once checkout resolves. The ids/signature are kept on the
// device until the backend confirms them, so a timeout, a 5xx, or the app being closed before
// verification no longer loses the payment: it is verified again later (verify-payment is idempotent).
const STORAGE_KEY = 'careermap-pending-subscription-payments';
const NATIVE_FILE = 'careermap-pending-subscription-payments.json';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function readAll() {
    try {
        let raw = '';
        if (Platform.OS === 'web') {
            if (typeof window === 'undefined' || !window.localStorage) return [];
            raw = window.localStorage.getItem(STORAGE_KEY) || '';
        }
        else {
            const file = new File(Paths.document, NATIVE_FILE);
            if (!file.exists) return [];
            raw = file.textSync();
        }
        const parsed = raw ? JSON.parse(raw) : [];
        const now = Date.now();
        return Array.isArray(parsed)
            ? parsed.filter((item) => item?.razorpay_order_id && item?.razorpay_payment_id && now - Number(item.createdAt || 0) < MAX_AGE_MS)
            : [];
    }
    catch {
        return [];
    }
}

function writeAll(items) {
    try {
        const serialized = JSON.stringify(items);
        if (Platform.OS === 'web') {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.setItem(STORAGE_KEY, serialized);
            }
            return;
        }
        const file = new File(Paths.document, NATIVE_FILE);
        if (!file.exists) file.create();
        file.write(serialized);
    }
    catch {
        // Storage is best effort; the in-flight verify still runs.
    }
}

export function savePendingPayment(entry) {
    const items = readAll().filter((item) => item.razorpay_order_id !== entry.razorpay_order_id);
    items.push({ ...entry, userId: String(entry.userId ?? ''), createdAt: Date.now() });
    writeAll(items);
}

export function removePendingPayment(orderId) {
    writeAll(readAll().filter((item) => item.razorpay_order_id !== orderId));
}

export function getPendingPayments(userId) {
    const id = String(userId ?? '');
    return readAll().filter((item) => item.userId === id);
}

// A 4xx from verify-payment is a definite answer from the server (e.g. signature mismatch, order
// not found); network errors, timeouts and 5xx are worth retrying.
export function isRetryableVerifyError(error) {
    const status = Number(error?.response?.status || 0);
    return !status || status >= 500 || status === 408 || status === 429;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Verifies one stored payment, retrying transient failures with a growing delay.
export async function verifyPendingPayment(entry, { attempts = 3, delays = [2000, 5000] } = {}) {
    let lastError = null;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
        try {
            await verifyPayment({
                planId: entry.planId,
                planKey: entry.planKey,
                razorpay_order_id: entry.razorpay_order_id,
                razorpay_payment_id: entry.razorpay_payment_id,
                razorpay_signature: entry.razorpay_signature,
            });
            removePendingPayment(entry.razorpay_order_id);
            return { ok: true };
        }
        catch (error) {
            lastError = error;
            if (!isRetryableVerifyError(error)) {
                removePendingPayment(entry.razorpay_order_id);
                return { ok: false, permanent: true, error };
            }
            if (attempt < attempts - 1) {
                await wait(delays[Math.min(attempt, delays.length - 1)] || 3000);
            }
        }
    }
    return { ok: false, permanent: false, error: lastError };
}

let flushInFlight = null;

// Retries every stored payment of this user once (used on app start / sign-in and before a new purchase).
// Returns how many were activated and how many are still pending.
export function flushPendingPayments(userId) {
    if (flushInFlight) return flushInFlight;
    flushInFlight = (async () => {
        let activated = 0;
        let stillPending = 0;
        for (const entry of getPendingPayments(userId)) {
            const result = await verifyPendingPayment(entry, { attempts: 2, delays: [3000] });
            if (result.ok) activated += 1;
            else if (!result.permanent) stillPending += 1;
        }
        return { activated, stillPending };
    })().finally(() => {
        flushInFlight = null;
    });
    return flushInFlight;
}
