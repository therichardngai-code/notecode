/**
 * Date Formatting Utilities
 */

/**
 * Format an ISO date string to a human-readable format
 * @param dateStr ISO date string or null
 * @returns Formatted date string (e.g., "Feb 10, 14:30")
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a duration in milliseconds to human-readable format
 * @param ms Duration in milliseconds
 * @returns Formatted duration (e.g., "1m 30s", "45s", "2h 15m")
 */
export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '-';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }

  return `${seconds}s`;
}

/**
 * Get relative time from now (e.g., "2 hours ago", "in 5 minutes")
 * @param dateStr ISO date string
 * @returns Relative time string
 */
export function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '-';

  const now = Date.now();
  const diff = now - date.getTime();
  const absDiff = Math.abs(diff);

  const seconds = Math.floor(absDiff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const suffix = diff > 0 ? 'ago' : 'from now';

  if (days > 0) return `${days}d ${suffix}`;
  if (hours > 0) return `${hours}h ${suffix}`;
  if (minutes > 0) return `${minutes}m ${suffix}`;
  return `${seconds}s ${suffix}`;
}
