import { strict as assert } from "node:assert";
import test from "node:test";
import type { DayRecord, WeeklyReportPayload } from "@/types/weeklyReport";

// Enable dry-run to avoid external calls during tests (set before imports)
process.env.PERSIST_DRY_RUN = "true";

async function setup() {
  const weekly = await import("@/lib/weeklyReport");
  const storage = await import("@/lib/reportStorage");
  return { weekly, persist: storage.persistWeeklyReportToDriveAndSheet };
}

test("persistWeeklyReportToDriveAndSheet returns dry-run result when enabled", async () => {
  const { weekly, persist } = await setup();
  const weekInfo = weekly.computeWeeksFromReference("2025-04-07");

  const makeDay = (label: string, idx: number): DayRecord => {
    const breakStart = "12:00";
    const breakEnd = "13:00";
    const breakMinutes = weekly.calculateBreakMinutes(breakStart, breakEnd);
    const stayStart = "09:00";
    const stayEnd = "18:00";
    return {
      date: label,
      stayStart,
      stayEnd,
      breakStart,
      breakEnd,
      breakMinutes,
      minutes: weekly.calculateStayMinutes(stayStart, stayEnd, breakStart, breakEnd),
      content: `test-${idx}`,
    };
  };

  const payload: WeeklyReportPayload = {
    yearLabel: "2025",
    name: "テスト太郎",
    submissionDate: weekInfo.submissionDate,
    prevWeekLabel: weekInfo.prevWeekLabel,
    currentWeekLabel: weekInfo.currentWeekLabel,
    prevWeekDays: weekInfo.prevWeekDays.map((d, idx) => makeDay(d.label, idx)),
    currentWeekDays: weekInfo.currentWeekDays.map((d, idx) => makeDay(d.label, idx)),
    totalPrevMinutes: 0,
    totalPrevHoursRounded: 0,
    prevGoal: "dry-run",
    prevGoalResultPercent: 50,
    achievedPoints: "dry-run",
    issues: "dry-run",
    currentGoal: "dry-run",
    notes: "dry-run",
  };

  payload.totalPrevMinutes = payload.prevWeekDays.reduce((sum, d) => sum + d.minutes, 0);
  payload.totalPrevHoursRounded = Math.round(payload.totalPrevMinutes / 60);

  const pdfBuffer = new Uint8Array([1, 2, 3]).buffer;
  const res = await persist(payload, pdfBuffer);
  assert.ok(res, "result should not be null in dry-run");
  assert.equal(res?.fileId, "dry-run");
  assert.equal(res?.webViewLink, "dry-run");
});
