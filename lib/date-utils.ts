/**
 * Format a Date object to YYYY-MM-DD string in local timezone
 * This avoids timezone issues when using toISOString() which converts to UTC
 */
export function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
