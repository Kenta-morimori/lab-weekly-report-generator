import { addDays, format, startOfWeek } from "date-fns";

const WEEKDAY_JA = ["日", "月", "火", "水", "木", "金", "土"] as const;

export type DayTemplate = {
  /** yyyy-MM-dd 形式 */
  iso: string;
  /** yyyy-MM-dd (月) 形式 */
  label: string;
};

export type WeekComputation = {
  prevWeekLabel: string;
  currentWeekLabel: string;
  prevWeekDays: DayTemplate[];
  currentWeekDays: DayTemplate[];
  /** デフォルトの提出日（今週月曜日） */
  submissionDate: string;
};

export function deriveFiscalYearLabel(baseDate = new Date()): string {
  const month = baseDate.getMonth(); // 0 = Jan
  const fiscalYear = month >= 3 ? baseDate.getFullYear() : baseDate.getFullYear() - 1;
  return String(fiscalYear);
}

export function calculateStayMinutes(
  stayStart: string,
  stayEnd: string,
  breakStart: string,
  breakEnd: string,
): number {
  if (!stayStart || !stayEnd) return 0;

  const start = toMinutes(stayStart);
  const end = toMinutes(stayEnd);
  if (start === null || end === null) return 0;

  const breakMinutes = calculateBreakMinutes(breakStart, breakEnd);
  const diff = end - start - breakMinutes;
  return Math.max(diff, 0);
}

export function calculateBreakMinutes(breakStart: string, breakEnd: string): number {
  if (!breakStart || !breakEnd) return 0;
  const start = toMinutes(breakStart);
  const end = toMinutes(breakEnd);
  if (start === null || end === null) return 0;
  return Math.max(end - start, 0);
}

export function roundHoursFromMinutes(totalMinutes: number): number {
  return Math.round(Math.max(totalMinutes, 0) / 60);
}

export function computeWeeksFromReference(referenceDate: string): WeekComputation {
  const base = new Date(referenceDate);
  if (Number.isNaN(base.getTime())) {
    throw new Error("Invalid reference date");
  }

  const prevWeekStart = startOfWeek(base, { weekStartsOn: 1 });
  const currentWeekStart = addDays(prevWeekStart, 7);

  const prevWeekLabel = `${format(prevWeekStart, "yyyy/MM/dd")}〜${format(
    addDays(prevWeekStart, 6),
    "yyyy/MM/dd",
  )}`;
  const currentWeekLabel = `${format(currentWeekStart, "yyyy/MM/dd")}〜${format(
    addDays(currentWeekStart, 6),
    "yyyy/MM/dd",
  )}`;

  return {
    prevWeekLabel,
    currentWeekLabel,
    prevWeekDays: buildWeekDays(prevWeekStart),
    currentWeekDays: buildWeekDays(currentWeekStart),
    submissionDate: format(currentWeekStart, "yyyy-MM-dd"),
  };
}

export function sanitizeNameForFilename(name: string): string {
  if (!name) return "";
  return name.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_");
}

function buildWeekDays(startDate: Date): DayTemplate[] {
  return Array.from({ length: 7 }).map((_, index) => {
    const date = addDays(startDate, index);
    const iso = format(date, "yyyy-MM-dd");
    const label = `${iso} (${WEEKDAY_JA[date.getDay()]})`;
    return { iso, label };
  });
}

function toMinutes(value: string): number | null {
  const [h, m] = value.split(":").map((v) => Number(v));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}
