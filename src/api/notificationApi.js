import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import api from './axios';
import { useAuthStore } from '../store/auth-store';

/*
 * Read / unread is tracked per user on this device (the backend has no per-user read
 * endpoint) - the same approach as the web portal. Stored as { [userId]: [ids] }.
 */
const READ_STORAGE_KEY = 'careermap-read-notifications';
const READ_FILE = 'careermap-read-notifications.json';
let readCache = null;

function currentUserKey() {
  const user = useAuthStore.getState().user;
  return String(user?.id ?? user?._id ?? user?.userId ?? 'anon');
}

function loadReadStore() {
  if (readCache) return readCache;
  try {
    let raw = '';
    if (Platform.OS === 'web') {
      raw = (typeof window !== 'undefined' && window.localStorage?.getItem(READ_STORAGE_KEY)) || '';
    } else {
      const file = new File(Paths.document, READ_FILE);
      raw = file.exists ? file.textSync() : '';
    }
    const parsed = raw ? JSON.parse(raw) : {};
    readCache = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    readCache = {};
  }
  return readCache;
}

function saveReadStore(store) {
  readCache = store;
  try {
    const serialized = JSON.stringify(store);
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') window.localStorage?.setItem(READ_STORAGE_KEY, serialized);
      return;
    }
    const file = new File(Paths.document, READ_FILE);
    if (!file.exists) file.create();
    file.write(serialized);
  } catch {
    // storage unavailable: the read state still applies until the app restarts
  }
}

function getReadIds() {
  const ids = loadReadStore()[currentUserKey()];
  return new Set(Array.isArray(ids) ? ids.map(String) : []);
}

/** Remembers these notifications as read for the logged-in user on this device. */
export function markNotificationsRead(ids = []) {
  const store = { ...loadReadStore() };
  const current = getReadIds();
  ids.forEach((id) => current.add(String(id)));
  store[currentUserKey()] = [...current].slice(-500);
  saveReadStore(store);
}

// Saves this phone's push token for the logged-in user, so the backend can send phone notifications.
export async function savePushToken(token) {
  await api.post('/notification/push-token', { token, platform: Platform.OS }, { timeout: 15000 });
}

// Removes this phone's push token (called on logout). Short timeout: logging out must never feel stuck.
export async function removePushToken(token) {
  await api.delete('/notification/push-token', { params: { token }, timeout: 5000 });
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

function formatNotificationDate(value) {
  if (!value) {
    return '';
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return String(value);
  }

  return parsedDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function mapNotificationItem(item, index) {
  const status = String(item?.status || '').trim().toLowerCase();
  const message = stripHtml(item?.message).replace(
    /Meeting link:\s*\S+/i,
    'The meeting link was sent to your email. Please check your inbox.'
  );

  return {
    id: String(item?.id ?? `notification-${index}`),
    title: item?.title || 'Notification',
    message: message || 'No notification message available.',
    target: String(item?.target || '').startsWith('user:') ? 'For you' : (item?.target || 'All users'),
    status: status || 'pending',
    type: item?.type || 'General',
    createdAt: formatNotificationDate(item?.createdAt),
    updatedAt: formatNotificationDate(item?.updatedAt),
    unread: status === 'pending' && !getReadIds().has(String(item?.id ?? `notification-${index}`)),
    raw: item,
  };
}

export async function getNotifications() {
  const response = await api.get('/notification/user/all');
  // The backend answers a failure with HTTP 200 + { success: false, message }: treat that (or
  // a missing list) as an error so the screen shows it instead of "No notifications yet".
  if (response?.data?.success === false || !Array.isArray(response?.data?.data)) {
    throw new Error(response?.data?.message || 'Failed to load notifications');
  }
  const items = response.data.data;
  const user = useAuthStore.getState().user;
  const userId = user?.id ?? user?._id ?? user?.userId;
  const userTarget = userId == null ? '' : `user:${userId}`.toLowerCase();
  const sharedTargets = new Set(['all', 'all users', 'everyone', 'global', 'users', 'students', 'user']);
  const scopedItems = items.filter((item) => {
    const target = String(item?.target || '').trim().toLowerCase();
    if (target.startsWith('user:')) return Boolean(userTarget) && target === userTarget;
    return sharedTargets.has(target);
  });

  const seen = new Set();
  const uniqueItems = scopedItems.filter((item) => {
    const key = `${String(item?.target || '').toLowerCase()}|${String(item?.title || '').trim().toLowerCase()}|${stripHtml(item?.message).replace(/Meeting link:\s*\S+/i, 'meeting link sent by email').trim().toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return uniqueItems.map((item, index) => mapNotificationItem(item, index));
}
