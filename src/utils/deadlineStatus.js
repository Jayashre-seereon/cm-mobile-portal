export function isComingSoonDeadline(value) {
  const deadline = parseLocalDeadline(value);
  if (!deadline) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const latestComingSoonDate = new Date(today);
  latestComingSoonDate.setDate(latestComingSoonDate.getDate() + 30);
  return deadline >= today && deadline <= latestComingSoonDate;
}

export function getDeadlineStatus(value) {
  const deadline = parseLocalDeadline(value);
  if (!deadline) return 'Active';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return deadline < today ? 'Expired' : 'Active';
}

function parseLocalDeadline(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  const deadline = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value);
  if (Number.isNaN(deadline.getTime())) return null;
  deadline.setHours(0, 0, 0, 0);
  return deadline;
}
