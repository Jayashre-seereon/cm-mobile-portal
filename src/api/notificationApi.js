import api from './axios';
import { useAuthStore } from '../store/auth-store';

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
    unread: status === 'pending',
    raw: item,
  };
}

export async function getNotifications() {
  const response = await api.get('/notification/user/all');
  const items = Array.isArray(response?.data?.data) ? response.data.data : [];
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
