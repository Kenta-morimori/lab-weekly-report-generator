import { strict as assert } from "node:assert";
import test from "node:test";
import { pdf } from "@react-pdf/renderer";
import { normalizePdfOutput } from "@/app/api/weekly-report/route";
import {
  calculateBreakMinutes,
  calculateStayMinutes,
  computeWeeksFromReference,
} from "@/lib/weeklyReport";
import { WeeklyReportPdf } from "@/pdf/WeeklyReportPdf";
import type { DayRecord, WeeklyReportPayload } from "@/types/weeklyReport";

test("normalizePdfOutput converts ArrayBufferView into BodyInit", () => {
  const body = normalizePdfOutput(new Uint8Array([1, 2, 3]));
  const res = new Response(body);
  assert.equal(res.status, 200);
});

test("normalizePdfOutput throws on unexpected value", () => {
  assert.throws(() => normalizePdfOutput(null as unknown), TypeError);
});

test("PDF generation produces a downloadable body", async () => {
  const weekInfo = computeWeeksFromReference("2025-04-07");
  const makeDay = (label: string): DayRecord => {
    const breakStart = "12:00";
    const breakEnd = "13:00";
    const breakMinutes = calculateBreakMinutes(breakStart, breakEnd);
    const stayStart = "09:00";
    const stayEnd = "18:00";
    return {
      date: label,
      stayStart,
      stayEnd,
      breakStart,
      breakEnd,
      breakMinutes,
      minutes: calculateStayMinutes(stayStart, stayEnd, breakStart, breakEnd),
      content: "テスト用の研究内容",
    };
  };

  const payload: WeeklyReportPayload = {
    yearLabel: "2025",
    name: "テスト太郎",
    prevWeekLabel: weekInfo.prevWeekLabel,
    currentWeekLabel: weekInfo.currentWeekLabel,
    prevWeekDays: weekInfo.prevWeekDays.map((d) => makeDay(d.label)),
    currentWeekDays: weekInfo.currentWeekDays.map((d) => makeDay(d.label)),
    totalPrevMinutes: 0,
    totalPrevHoursRounded: 0,
    prevGoal: "サンプル",
    prevGoalResultPercent: 80,
    achievedPoints: "達成点サンプル",
    issues: "課題サンプル",
    currentGoal: "今週目標サンプル",
    notes: "備考サンプル",
  };

  payload.totalPrevMinutes = payload.prevWeekDays.reduce((sum, d) => sum + d.minutes, 0);
  payload.totalPrevHoursRounded = Math.round(payload.totalPrevMinutes / 60);

  const doc = <WeeklyReportPdf data={payload} />;
  const buffer = await pdf(doc).toBuffer();
  const body = normalizePdfOutput(buffer);
  const response = new Response(body, { headers: { "Content-Type": "application/pdf" } });

  assert.equal(response.status, 200);
});
