// src/app/page.tsx

"use client";

import React, { useEffect, useState } from "react";
import {
  useFieldArray,
  useForm,
  type FieldArrayWithId,
  type UseFormRegister,
} from "react-hook-form";
import { format } from "date-fns";
import {
  calculateStayMinutes,
  calculateBreakMinutes,
  computeWeeksFromReference,
  deriveFiscalYearLabel,
  roundHoursFromMinutes,
  sanitizeNameForFilename,
} from "@/lib/weeklyReport";
import type { DayTemplate } from "@/lib/weeklyReport";
import type { DayRecord, WeeklyReportPayload } from "@/types/weeklyReport";

type DayFormValue = {
  /** 画面表示用の日付（例: 2025-04-07 (月)） */
  date: string;
  stayStart: string;
  stayEnd: string;
  breakStart: string;
  breakEnd: string;
  content: string;
};

type FormValues = {
  name: string;
  yearLabel: string;
  referenceDate: string;
  prevGoal: string;
  prevGoalResultPercent: number;
  achievedPoints: string;
  issues: string;
  currentGoal: string;
  notes: string;
  prevWeekDays: DayFormValue[];
  currentWeekDays: DayFormValue[];
};

type DerivedDay = {
  breakMinutes: number;
  minutes: number;
  errors: string[];
};

const SHORT_TEXT_LIMIT = 30;
const GOAL_TEXT_LIMIT = 25;
const DAY_CONTENT_LIMIT = 20;
const ERROR_PREFIX = "入力エラー:";

const repeatToLength = (seed: string, limit: number) =>
  seed.repeat(Math.ceil(limit / seed.length)).slice(0, limit);

const baseDayContentSeed = "研究概要と予定を簡潔に記述";
const baseDayContent = repeatToLength(baseDayContentSeed, DAY_CONTENT_LIMIT);

const buildShortText = (prefix: string, limit: number) =>
  repeatToLength(`${prefix} 数値目標や達成度を端的に示すテスト用文面。`, limit);
const buildDayContent = (prefix: string) =>
  repeatToLength(`${prefix} ${baseDayContentSeed}`, DAY_CONTENT_LIMIT);

function parseTime(value: string): number | null {
  if (!value) return null;
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function computeDayDerived(day: DayFormValue): DerivedDay {
  const errors: string[] = [];
  const start = parseTime(day.stayStart);
  const end = parseTime(day.stayEnd);
  const breakStart = parseTime(day.breakStart);
  const breakEnd = parseTime(day.breakEnd);
  const contentLength = (day.content ?? "").length;

  if (contentLength > DAY_CONTENT_LIMIT) {
    errors.push(`${ERROR_PREFIX} ${day.date} 研究内容は${DAY_CONTENT_LIMIT}文字以内で入力してください`);
  }

  if (start !== null && end !== null && end <= start) {
    errors.push(`${ERROR_PREFIX} ${day.date} 終了は開始より後にしてください`);
  }

  if (breakStart !== null && breakEnd !== null && breakEnd <= breakStart) {
    errors.push(`${ERROR_PREFIX} ${day.date} 離席終了は離席開始より後にしてください`);
  }

  if (
    start !== null &&
    end !== null &&
    breakStart !== null &&
    breakEnd !== null &&
    (breakStart < start || breakEnd > end)
  ) {
    errors.push(`${ERROR_PREFIX} ${day.date} 離席時間は滞在時間内に設定してください`);
  }

  const breakMinutes = calculateBreakMinutes(day.breakStart, day.breakEnd);
  const minutes =
    start !== null && end !== null
      ? Math.max(calculateStayMinutes(day.stayStart, day.stayEnd, day.breakStart, day.breakEnd), 0)
      : 0;

  return { breakMinutes, minutes: errors.length ? 0 : minutes, errors };
}
const todayIso = format(new Date(), "yyyy-MM-dd");
const initialWeekInfo = computeWeeksFromReference(todayIso);

const createDayValue = (label: string): DayFormValue => ({
  date: label,
  stayStart: "",
  stayEnd: "",
  breakStart: "",
  breakEnd: "",
  content: "",
});

function mergeDayValues(source: DayFormValue[] | undefined, templates: DayTemplate[]) {
  return templates.map((template, index) => {
    const existing = source?.[index];
    return existing ? { ...existing, date: template.label } : createDayValue(template.label);
  });
}

const defaultValues: FormValues = {
  name: "",
  yearLabel: deriveFiscalYearLabel(),
  referenceDate: todayIso,
  prevGoal: "",
  prevGoalResultPercent: 0,
  achievedPoints: "",
  issues: "",
  currentGoal: "",
  notes: "",
  prevWeekDays: initialWeekInfo.prevWeekDays.map((d) => createDayValue(d.label)),
  currentWeekDays: initialWeekInfo.currentWeekDays.map((d) => createDayValue(d.label)),
};

export default function HomePage() {
  const [weekInfo, setWeekInfo] = useState(initialWeekInfo);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { isDirty },
  } = useForm<FormValues>({
    defaultValues,
    mode: "onChange",
  });

  const { fields: prevFields, replace: replacePrev } = useFieldArray({
    control,
    name: "prevWeekDays",
  });
  const { fields: currentFields, replace: replaceCurrent } = useFieldArray({
    control,
    name: "currentWeekDays",
  });

  const prevWeekDays = watch("prevWeekDays");
  const currentWeekDays = watch("currentWeekDays");
  const referenceDate = watch("referenceDate");
  const prevGoalResultPercent = watch("prevGoalResultPercent");

  const textCounts = {
    prevGoal: (watch("prevGoal") ?? "").length,
    achievedPoints: (watch("achievedPoints") ?? "").length,
    issues: (watch("issues") ?? "").length,
    currentGoal: (watch("currentGoal") ?? "").length,
    notes: (watch("notes") ?? "").length,
  };

  useEffect(() => {
    if (!referenceDate) return;
    try {
      const info = computeWeeksFromReference(referenceDate);
      const prevValues = getValues("prevWeekDays");
      const currentValues = getValues("currentWeekDays");
      setWeekInfo(info);
      replacePrev(mergeDayValues(prevValues, info.prevWeekDays));
      replaceCurrent(mergeDayValues(currentValues, info.currentWeekDays));
    } catch (err) {
      console.error(err);
      setError("日付の計算中に問題が発生しました。日付を確認してください。");
    }
  }, [referenceDate, replacePrev, replaceCurrent, getValues]);

  const prevComputedDays = (prevWeekDays ?? []).map(computeDayDerived);
  const currentComputedDays = (currentWeekDays ?? []).map(computeDayDerived);

  const totalPrevMinutes = prevComputedDays.reduce((sum, day) => sum + (day.minutes || 0), 0);
  const totalPrevHoursRounded = roundHoursFromMinutes(totalPrevMinutes);
  const totalCurrentMinutes = currentComputedDays.reduce((sum, day) => sum + (day.minutes || 0), 0);

  const onSubmit = async (values: FormValues) => {
    setError(null);
    if (!values.name.trim()) {
      setError("氏名は必須です。");
      return;
    }

    const errors = [...prevComputedDays, ...currentComputedDays].flatMap((d) => d.errors);
    if (errors.length > 0) {
      setError(errors[0]);
      return;
    }

    const mapDay = (day: DayFormValue, derived: DerivedDay): DayRecord => {
      return {
        date: day.date,
        stayStart: day.stayStart,
        stayEnd: day.stayEnd,
        breakStart: day.breakStart,
        breakEnd: day.breakEnd,
        breakMinutes: derived.breakMinutes,
        minutes: derived.minutes,
        content: day.content,
      };
    };

    const payload: WeeklyReportPayload = {
      yearLabel: values.yearLabel.trim() || deriveFiscalYearLabel(),
      name: values.name.trim(),
      submissionDate: weekInfo.submissionDate,
      prevWeekLabel: weekInfo.prevWeekLabel,
      currentWeekLabel: weekInfo.currentWeekLabel,
      prevWeekDays: values.prevWeekDays.map((day, idx) => mapDay(day, prevComputedDays[idx])),
      currentWeekDays: values.currentWeekDays.map((day, idx) => mapDay(day, currentComputedDays[idx])),
      totalPrevMinutes,
      totalPrevHoursRounded,
      prevGoal: values.prevGoal,
      prevGoalResultPercent: values.prevGoalResultPercent,
      achievedPoints: values.achievedPoints,
      issues: values.issues,
      currentGoal: values.currentGoal,
      notes: values.notes,
    };

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/weekly-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("PDF の生成に失敗しました。入力内容を確認してください。");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeName = sanitizeNameForFilename(payload.name) || "noname";
      link.href = url;
      link.download = `週報_${safeName}_${payload.submissionDate}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "PDF の生成でエラーが発生しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillSample = () => {
    const samplePrev = weekInfo.prevWeekDays.map((d, idx) => ({
      date: d.label,
      stayStart: "09:00",
      stayEnd: "19:00",
      breakStart: "12:00",
      breakEnd: "13:00",
      content: buildDayContent(`前週${idx + 1}日目`),
    }));
    const sampleCurrent = weekInfo.currentWeekDays.map((d, idx) => ({
      date: d.label,
      stayStart: "09:30",
      stayEnd: "18:30",
      breakStart: "12:30",
      breakEnd: "13:15",
      content: buildDayContent(`今週${idx + 1}日目`),
    }));

    setValue("name", "テスト太郎");
    setValue("yearLabel", deriveFiscalYearLabel());
    setValue("prevGoal", buildShortText("前週の目標", GOAL_TEXT_LIMIT));
    setValue("prevGoalResultPercent", 80);
    setValue("achievedPoints", buildShortText("達成点", SHORT_TEXT_LIMIT));
    setValue("issues", buildShortText("課題と反省", SHORT_TEXT_LIMIT));
    setValue("currentGoal", buildShortText("今週の目標", GOAL_TEXT_LIMIT));
    setValue("notes", buildShortText("教員共有事項", SHORT_TEXT_LIMIT));
    replacePrev(samplePrev.map((d) => ({ ...createDayValue(d.date), ...d })));
    replaceCurrent(sampleCurrent.map((d) => ({ ...createDayValue(d.date), ...d })));
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-emerald-50 text-slate-800">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <header className="mb-8">
          <p className="text-sm uppercase tracking-[0.2em] text-sky-700">Weekly Report</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            研究室・週報 PDF ジェネレーター
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            日付を選ぶと前週・今週の週範囲を自動計算します。入力完了後に PDF を出力してください。
          </p>
        </header>

        <form className="space-y-8" onSubmit={handleSubmit(onSubmit)} noValidate>
          <section className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Week window</p>
                <p className="text-lg font-semibold text-slate-900">
                  前週 {weekInfo.prevWeekLabel} ／ 今週 {weekInfo.currentWeekLabel}
                </p>
              </div>
              <div className="rounded-full bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700">
                前週の研究報告：{totalPrevHoursRounded} 時間
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <LabeledField label="氏名" required>
                <input
                  type="text"
                  {...register("name", { required: true })}
                  placeholder="山田 太郎"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-inner focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                />
              </LabeledField>
              <LabeledField label="年度">
                <input
                  type="text"
                  {...register("yearLabel")}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-inner focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                />
              </LabeledField>
              <LabeledField label="週選択用日付" hint="前週に含まれる任意の日付">
                <input
                  type="date"
                  {...register("referenceDate", { required: true })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-inner focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                />
              </LabeledField>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500 mb-2">前週に関して</p>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <TextAreaField
                  label="前週の研究達成目標"
                  {...register("prevGoal", { maxLength: GOAL_TEXT_LIMIT })}
                  count={textCounts.prevGoal}
                  limit={GOAL_TEXT_LIMIT}
                />
                <GoalSlider
                  label="前週の目標達成度"
                  value={prevGoalResultPercent}
                  onChange={(value) => setValue("prevGoalResultPercent", value, { shouldDirty: true })}
                />
                <TextAreaField
                  label="●達成点"
                  {...register("achievedPoints", { maxLength: SHORT_TEXT_LIMIT })}
                  count={textCounts.achievedPoints}
                  limit={SHORT_TEXT_LIMIT}
                />
                <TextAreaField
                  label="●課題・反省点"
                  {...register("issues", { maxLength: SHORT_TEXT_LIMIT })}
                  count={textCounts.issues}
                  limit={SHORT_TEXT_LIMIT}
                />
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500 mb-2">今週に関して</p>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <TextAreaField
                  label="今週の研究達成目標"
                  {...register("currentGoal", { maxLength: GOAL_TEXT_LIMIT })}
                  count={textCounts.currentGoal}
                  limit={GOAL_TEXT_LIMIT}
                />
                <TextAreaField
                  label="備考"
                  {...register("notes", { maxLength: SHORT_TEXT_LIMIT })}
                  count={textCounts.notes}
                  limit={SHORT_TEXT_LIMIT}
                />
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <DayTable
              title="前週（実績）"
              weekLabel={weekInfo.prevWeekLabel}
              fields={prevFields}
              prefix="prevWeekDays"
              dayValues={prevWeekDays}
              derivedDays={prevComputedDays}
              totalMinutes={totalPrevMinutes}
              register={register}
              contentLabel="研究内容"
            />
            <DayTable
              title="今週（予定）"
              weekLabel={weekInfo.currentWeekLabel}
              fields={currentFields}
              prefix="currentWeekDays"
              dayValues={currentWeekDays}
              derivedDays={currentComputedDays}
              totalMinutes={totalCurrentMinutes}
              register={register}
              contentLabel="研究内容 / 予定内容"
            />
          </section>

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              PDF 生成時のファイル名：週報_[氏名]_[今週月曜日の日付].pdf
            </p>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-full bg-sky-700 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-200 transition hover:-translate-y-0.5 hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:translate-y-0 disabled:bg-slate-400 disabled:shadow-none"
            >
              {isSubmitting ? "生成中..." : "PDF 出力"}
            </button>
            <button
              type="button"
              onClick={fillSample}
              className="inline-flex items-center gap-2 rounded-full border border-sky-200 px-4 py-2 text-sm font-semibold text-sky-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-200"
            >
              テストデータ自動入力
            </button>
          </div>

          {!isDirty && (
            <p className="text-xs text-slate-500">
              初期値は本日 {todayIso} を基準にしています。必要に応じて編集してください。
            </p>
          )}
        </form>
      </div>
    </main>
  );
}

type DayTableProps<T extends "prevWeekDays" | "currentWeekDays"> = {
  title: string;
  weekLabel: string;
  fields: FieldArrayWithId<FormValues, T, "id">[];
  prefix: T;
  dayValues?: DayFormValue[];
  derivedDays: DerivedDay[];
  totalMinutes: number;
  register: UseFormRegister<FormValues>;
  contentLabel: string;
};

function DayTable<T extends "prevWeekDays" | "currentWeekDays">({
  title,
  weekLabel,
  fields,
  prefix,
  dayValues,
  derivedDays,
  totalMinutes,
  register,
  contentLabel,
}: DayTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-sm backdrop-blur">
      <div className="flex items-baseline justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-600">{weekLabel}</p>
        </div>
        <div className="text-right text-[11px] text-slate-600">
          <p>合計滞在時間: {totalMinutes} 分</p>
          <p className="text-slate-500">{formatMinutes(totalMinutes)}</p>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {fields.map((field, index) => {
          const day = dayValues?.[index];
          const derived = derivedDays[index];
          const minutes = derived?.minutes ?? 0;
          const breakMinutes = derived?.breakMinutes ?? 0;
          const contentCount = day?.content?.length ?? 0;
          const contentOver = contentCount > DAY_CONTENT_LIMIT;
          const hasError = (derived?.errors?.length ?? 0) > 0 || contentOver;
          return (
            <div
              key={field.id}
              className={`flex flex-col gap-2 px-4 py-3 text-xs ${
                hasError ? "bg-rose-50" : ""
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="rounded-lg bg-slate-50 px-2 py-1 font-semibold text-slate-800">
                  {day?.date ?? "N/A"}
                </div>
                <div className="text-right text-[11px] text-slate-600">
                  <p>滞在 {minutes} 分 ({formatMinutes(minutes)})</p>
                  <p>離席 {breakMinutes} 分</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <InlineField label="開始">
                  <input
                    type="time"
                    {...register(`${prefix}.${index}.stayStart` as const)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 shadow-inner focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  />
                </InlineField>
                <InlineField label="終了">
                  <input
                    type="time"
                    {...register(`${prefix}.${index}.stayEnd` as const)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 shadow-inner focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  />
                </InlineField>
                <InlineField label="離席開始">
                  <input
                    type="time"
                    {...register(`${prefix}.${index}.breakStart` as const)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 shadow-inner focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  />
                </InlineField>
                <InlineField label="離席終了">
                  <input
                    type="time"
                    {...register(`${prefix}.${index}.breakEnd` as const)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 shadow-inner focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  />
                </InlineField>
              </div>

              <div className="flex flex-col gap-1 text-[11px] text-slate-700">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{contentLabel}</span>
                  <span
                    className={`text-[10px] ${contentOver ? "text-rose-600" : "text-slate-500"}`}
                  >
                    {contentCount} / {DAY_CONTENT_LIMIT} 文字
                  </span>
                </div>
                <textarea
                  {...register(`${prefix}.${index}.content` as const, {
                    validate: (value) =>
                      (value?.length ?? 0) <= DAY_CONTENT_LIMIT || "文字数は制限以内にしてください",
                  })}
                  rows={2}
                  className={`w-full rounded-lg border ${
                    contentOver ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100" : "border-slate-200 focus:border-sky-400 focus:ring-sky-100"
                  } bg-white px-2 py-1 text-xs shadow-inner focus:outline-none focus:ring-2`}
                  placeholder={`${DAY_CONTENT_LIMIT}文字以内で入力してください`}
                />
                {contentOver ? (
                  <p className="text-[10px] text-rose-600">文字数は{DAY_CONTENT_LIMIT}文字以内にしてください。</p>
                ) : null}
              </div>

              {hasError ? (
                <ul className="list-disc pl-5 text-[11px] text-rose-700">
                  {derived.errors.map((msg) => (
                    <li key={msg}>{msg}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

type LabeledFieldProps = {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
};

function LabeledField({ label, children, required, hint }: LabeledFieldProps) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-semibold text-slate-800">
        {label} {required ? <span className="text-rose-500">*</span> : null}
      </span>
      {hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
      {children}
    </label>
  );
}

type InlineFieldProps = {
  label: string;
  children: React.ReactNode;
};

function InlineField({ label, children }: InlineFieldProps) {
  return (
    <label className="flex flex-col gap-1 text-[11px] text-slate-700">
      <span className="font-semibold">{label}</span>
      {children}
    </label>
  );
}

type GoalSliderProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
};

function GoalSlider({ label, value, onChange }: GoalSliderProps) {
  const safeValue = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
  const handleChange = (next: number) => {
    const snapped = Math.round(next / 10) * 10;
    onChange(Math.min(100, Math.max(0, snapped)));
  };

  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-slate-800">{label}</span>
        <span className="text-[11px] text-slate-500">{safeValue}%</span>
      </div>
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-inner">
        <input
          type="range"
          min={0}
          max={100}
          step={10}
          value={safeValue}
          onChange={(e) => handleChange(Number(e.target.value))}
          className="w-full accent-sky-600"
          list="goal-percent-ticks"
        />
        <input
          type="number"
          min={0}
          max={100}
          step={10}
          value={safeValue}
          onChange={(e) => handleChange(Number(e.target.value))}
          className="w-16 rounded border border-slate-200 px-2 py-1 text-xs focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
        />
      </div>
      <datalist id="goal-percent-ticks">
        {[0, 20, 40, 60, 80, 100].map((tick) => (
          <option value={tick} key={tick} />
        ))}
      </datalist>
    </div>
  );
}

type TextAreaFieldProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  count: number;
  limit: number;
};

function TextAreaField({ label, count, limit, ...rest }: TextAreaFieldProps) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-slate-800">{label}</span>
        <span className="text-[11px] text-slate-500">
          {count} / {limit} 文字
        </span>
      </div>
      <textarea
        {...rest}
        rows={3}
        maxLength={limit}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-inner focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
        placeholder={`${limit}文字以内で入力してください`}
      />
    </label>
  );
}

function formatMinutes(value: number) {
  if (!value) return "0h0m";
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${hours}h${minutes}m`;
}
