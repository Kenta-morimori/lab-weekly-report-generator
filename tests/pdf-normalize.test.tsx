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

const repeatToLength = (seed: string, length: number) =>
  seed.repeat(Math.ceil(length / seed.length)).slice(0, length);

const shortText30 = repeatToLength("文字数上限テスト用の短文。", 30);
const goalText25 = repeatToLength("研究目標を簡潔に書く", 25);
const maxContent = repeatToLength("研究概要を簡潔に記載", 20);

const buildContent = (prefix: string) => repeatToLength(`${prefix} 研究概要`, 20);

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
  assert.equal(shortText30.length, 30);
  assert.equal(goalText25.length, 25);
  assert.equal(buildContent("prefix").length, 20);

  const makeDay = (label: string, idx: number): DayRecord => {
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
      content: buildContent(`日${idx + 1}`),
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
    prevGoal: goalText25,
    prevGoalResultPercent: 80,
    achievedPoints: shortText30,
    issues: shortText30,
    currentGoal: goalText25,
    notes: shortText30,
  };

  payload.totalPrevMinutes = payload.prevWeekDays.reduce((sum, d) => sum + d.minutes, 0);
  payload.totalPrevHoursRounded = Math.round(payload.totalPrevMinutes / 60);

  const doc = <WeeklyReportPdf data={payload} />;
  const buffer = await pdf(doc).toBuffer();
  const body = normalizePdfOutput(buffer);
  const response = new Response(body, { headers: { "Content-Type": "application/pdf" } });

  assert.equal(response.status, 200);
});
