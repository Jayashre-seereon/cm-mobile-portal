import api from './axios';

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

  return {
    id: String(item?.id ?? `notification-${index}`),
    title: item?.title || 'Notification',
    message: stripHtml(item?.message) || 'No notification message available.',
    target: item?.target || 'All users',
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

  return items.map((item, index) => mapNotificationItem(item, index));
}
