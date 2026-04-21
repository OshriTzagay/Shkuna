/**
 * Format a date to Hebrew-friendly display (Israel timezone)
 */
export function formatMatchDate(iso: string): string {
  return new Intl.DateTimeFormat("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jerusalem",
  }).format(new Date(iso));
}

export function formatMatchTime(iso: string): string {
  return new Intl.DateTimeFormat("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jerusalem",
  }).format(new Date(iso));
}

/**
 * Format stopwatch seconds to mm:ss
 */
export function formatStopwatch(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Compute current elapsed seconds from DB stopwatch state
 */
export function computeElapsed(
  elapsedSec: number,
  startedAt: string | null,
  running: boolean
): number {
  if (!running || !startedAt) return elapsedSec;
  const extra = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  return elapsedSec + extra;
}
