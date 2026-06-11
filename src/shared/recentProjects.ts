/** Maximum entries in File → Recent Projects. */
export const RECENT_PROJECTS_MAX = 12

export type RecentProjectEntry = {
  path: string
  savedAt: number
}

export function formatRecentProjectMenuLabel(entry: RecentProjectEntry): string {
  const base = entry.path.replace(/\\/g, '/').split('/').pop() ?? entry.path
  const date = new Date(entry.savedAt)
  if (!Number.isFinite(date.getTime())) {
    return base
  }
  const stamp = date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
  return `${base} — ${stamp}`
}
