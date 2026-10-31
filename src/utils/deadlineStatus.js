export function isComingSoonDeadline(value) {
  if (!value) return false;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  const deadline = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value);
  if (Number.isNaN(deadline.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);
  const previousMonth = new Date(deadline.getFullYear(), deadline.getMonth() - 1, 1);
  const monthBefore = new Date(
    previousMonth.getFullYear(),
    previousMonth.getMonth(),
    Math.min(deadline.getDate(), new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 0).getDate())
  );
  return today >= monthBefore && today < deadline;
}
