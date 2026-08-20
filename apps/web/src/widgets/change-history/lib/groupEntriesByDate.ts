import type { ChangeLogEntry } from "@entities/ui-project";

export interface ChangeLogDateGroup {
  label: string;
  entries: ChangeLogEntry[];
}

export function groupEntriesByDate(
  entries: ChangeLogEntry[],
  now: Date = new Date(),
): ChangeLogDateGroup[] {
  const groups = new Map<string, ChangeLogEntry[]>();
  for (const entry of entries) {
    const label = dateGroupLabel(new Date(entry.createdAt), now);
    const bucket = groups.get(label);
    if (bucket) {
      bucket.push(entry);
    } else {
      groups.set(label, [entry]);
    }
  }
  return [...groups.entries()].map(([label, grouped]) => ({ label, entries: grouped }));
}

function dateGroupLabel(date: Date, now: Date): string {
  const startOfToday = startOfLocalDay(now);
  const startOfDate = startOfLocalDay(date);
  const diffDays = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return formatDayMonthYear(date);
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDayMonthYear(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${date.getFullYear()}`;
}

export function formatEntryTime(iso: string): string {
  const date = new Date(iso);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}
