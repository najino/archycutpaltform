/** ISO week key like "2026-W46" */
export function toWeekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export function currentWeekKey(): string {
  return toWeekKey(new Date());
}

export function weekKeyFromDueOrCreated(
  dueDate: string | null | undefined,
  createdAt: Date = new Date(),
): string {
  if (dueDate) {
    return toWeekKey(new Date(dueDate + "T00:00:00Z"));
  }
  return toWeekKey(createdAt);
}
