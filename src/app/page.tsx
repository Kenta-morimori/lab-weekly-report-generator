// src/app/page.tsx

"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  useFieldArray,
  useForm,
  type FieldArrayWithId,
  type UseFormRegister,
} from "react-hook-form";
import { format } from "date-fns";
import {
  calculateStayMinutes,
  computeWeeksFromReference,
  deriveFiscalYearLabel,
  roundHoursFromMinutes,
  sanitizeNameForFilename,
} from "@/lib/weeklyReport";
import type { DayRecord, WeeklyReportPayload } from "@/types/weeklyReport";

type DayFormValue = {
  /** 画面表示用の日付（例: 2025-04-07 (月)） */
  date: string;
  stayStart: string;
  stayEnd: string;
  breakMinutes: number;
  minutes: number;
  content: string;
};

type FormValues = {
  name: string;
  yearLabel: string;
  referenceDate: string;
  submissionDate: string;
  prevGoal: string;
  prevGoalResult: string;
  achievedPoints: string;
  issues: string;
  currentGoal: string;
  notes: string;
  prevWeekDays: DayFormValue[];
  currentWeekDays: DayFormValue[];
};

const TEXT_LIMIT = 200;
const todayIso = format(new Date(), "yyyy-MM-dd");
const initialWeekInfo = computeWeeksFromReference(todayIso);

const createDayValue = (label: string): DayFormValue => ({
  date: label,
  stayStart: "",
  stayEnd: "",
  breakMinutes: 0,
  minutes: 0,
  content: "",
});

const defaultValues: FormValues = {
  name: "",
  yearLabel: deriveFiscalYearLabel(),
  referenceDate: todayIso,
  submissionDate: initialWeekInfo.submissionDate,
  prevGoal: "",
  prevGoalResult: "",
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

  const textCounts = {
    prevGoal: (watch("prevGoal") ?? "").length,
    prevGoalResult: (watch("prevGoalResult") ?? "").length,
    achievedPoints: (watch("achievedPoints") ?? "").length,
    issues: (watch("issues") ?? "").length,
    currentGoal: (watch("currentGoal") ?? "").length,
    notes: (watch("notes") ?? "").length,
  };

  useEffect(() => {
    if (!referenceDate) return;
    try {
      const info = computeWeeksFromReference(referenceDate);
      setWeekInfo(info);
      setValue("submissionDate", info.submissionDate, { shouldDirty: true });
      replacePrev(info.prevWeekDays.map((d) => createDayValue(d.label)));
      replaceCurrent(info.currentWeekDays.map((d) => createDayValue(d.label)));
    } catch (err) {
      console.error(err);
      setError("日付の計算中に問題が発生しました。日付を確認してください。");
    }
  }, [referenceDate, replacePrev, replaceCurrent, setValue]);

  useEffect(() => {
    prevWeekDays?.forEach((day, index) => {
      const computed = calculateStayMinutes(
        day.stayStart,
        day.stayEnd,
        Number.isFinite(day.breakMinutes) ? day.breakMinutes : 0,
      );
      if (computed !== day.minutes) {
        setValue(`prevWeekDays.${index}.minutes`, computed, { shouldDirty: true });
      }
    });
  }, [prevWeekDays, setValue]);

  useEffect(() => {
    currentWeekDays?.forEach((day, index) => {
      const computed = calculateStayMinutes(
        day.stayStart,
        day.stayEnd,
        Number.isFinite(day.breakMinutes) ? day.breakMinutes : 0,
      );
      if (computed !== day.minutes) {
        setValue(`currentWeekDays.${index}.minutes`, computed, { shouldDirty: true });
      }
    });
  }, [currentWeekDays, setValue]);

  const totalPrevMinutes = useMemo(
    () => prevWeekDays?.reduce((sum, day) => sum + (day.minutes || 0), 0) ?? 0,
    [prevWeekDays],
  );
  const totalPrevHoursRounded = useMemo(
    () => roundHoursFromMinutes(totalPrevMinutes),
    [totalPrevMinutes],
  );

  const onSubmit = async (values: FormValues) => {
    setError(null);
    if (!values.name.trim()) {
      setError("氏名は必須です。");
      return;
    }

    const mapDay = (day: DayFormValue): DayRecord => ({
      date: day.date,
      stayStart: day.stayStart,
      stayEnd: day.stayEnd,
      breakMinutes: Number.isFinite(day.breakMinutes) ? day.breakMinutes : 0,
      minutes: day.minutes,
      content: day.content,
    });

    const payload: WeeklyReportPayload = {
      yearLabel: values.yearLabel.trim() || deriveFiscalYearLabel(),
      name: values.name.trim(),
      submissionDate: values.submissionDate,
      prevWeekLabel: weekInfo.prevWeekLabel,
      currentWeekLabel: weekInfo.currentWeekLabel,
      prevWeekDays: values.prevWeekDays.map(mapDay),
      currentWeekDays: values.currentWeekDays.map(mapDay),
      totalPrevMinutes,
      totalPrevHoursRounded,
      prevGoal: values.prevGoal,
      prevGoalResult: values.prevGoalResult,
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
              <LabeledField label="提出日" hint="デフォルト: 今週の月曜日">
                <input
                  type="date"
                  {...register("submissionDate", { required: true })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-inner focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                />
              </LabeledField>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <TextAreaField
                label="前週の研究達成目標"
                {...register("prevGoal", { maxLength: TEXT_LIMIT })}
                count={textCounts.prevGoal}
              />
              <TextAreaField
                label="前週の目標達成度"
                {...register("prevGoalResult", { maxLength: TEXT_LIMIT })}
                count={textCounts.prevGoalResult}
              />
              <TextAreaField
                label="●達成点"
                {...register("achievedPoints", { maxLength: TEXT_LIMIT })}
                count={textCounts.achievedPoints}
              />
              <TextAreaField
                label="●課題・反省点"
                {...register("issues", { maxLength: TEXT_LIMIT })}
                count={textCounts.issues}
              />
              <TextAreaField
                label="今週の研究達成目標"
                {...register("currentGoal", { maxLength: TEXT_LIMIT })}
                count={textCounts.currentGoal}
              />
              <TextAreaField
                label="備考"
                {...register("notes", { maxLength: TEXT_LIMIT })}
                count={textCounts.notes}
              />
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <DayTable
              title="前週（実績）"
              weekLabel={weekInfo.prevWeekLabel}
              fields={prevFields}
              prefix="prevWeekDays"
              dayValues={prevWeekDays}
              register={register}
            />
            <DayTable
              title="今週（予定）"
              weekLabel={weekInfo.currentWeekLabel}
              fields={currentFields}
              prefix="currentWeekDays"
              dayValues={currentWeekDays}
              register={register}
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
  register: UseFormRegister<FormValues>;
};

function DayTable<T extends "prevWeekDays" | "currentWeekDays">({
  title,
  weekLabel,
  fields,
  prefix,
  dayValues,
  register,
}: DayTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-sm backdrop-blur">
      <div className="flex items-baseline justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-600">{weekLabel}</p>
        </div>
        <p className="text-[11px] text-slate-500">終了 − 開始 − 離席時間で自動計算</p>
      </div>

      <div className="divide-y divide-slate-100">
        <div className="grid grid-cols-[150px,110px,110px,110px,1fr,120px] gap-2 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600">
          <span>日付</span>
          <span>開始</span>
          <span>終了</span>
          <span>離席(分)</span>
          <span>研究内容 / 予定内容</span>
          <span className="text-right">滞在時間</span>
        </div>

        {fields.map((field, index) => {
          const day = dayValues?.[index];
          const minutes = day?.minutes ?? 0;
          return (
            <div
              key={field.id}
              className="grid grid-cols-[150px,110px,110px,110px,1fr,120px] items-start gap-2 px-4 py-2 text-xs"
            >
              <div className="flex h-full items-center rounded-lg bg-slate-50 px-2 font-semibold text-slate-800">
                {day?.date ?? "N/A"}
              </div>
              <input
                type="time"
                {...register(`${prefix}.${index}.stayStart` as const)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 shadow-inner focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              />
              <input
                type="time"
                {...register(`${prefix}.${index}.stayEnd` as const)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 shadow-inner focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              />
              <input
                type="number"
                min={0}
                {...register(`${prefix}.${index}.breakMinutes` as const, { valueAsNumber: true })}
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 shadow-inner focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              />
              <textarea
                {...register(`${prefix}.${index}.content` as const, { maxLength: TEXT_LIMIT })}
                maxLength={TEXT_LIMIT}
                rows={2}
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs shadow-inner focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                placeholder="研究内容・行動を入力"
              />
              <div className="flex h-full flex-col items-end justify-center rounded-lg bg-slate-50 px-2 font-semibold text-slate-800">
                <span>{minutes} 分</span>
                <span className="text-[10px] text-slate-500">{formatMinutes(minutes)}</span>
              </div>
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

type TextAreaFieldProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  count: number;
};

function TextAreaField({ label, count, ...rest }: TextAreaFieldProps) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-slate-800">{label}</span>
        <span className="text-[11px] text-slate-500">
          {count} / {TEXT_LIMIT} 文字
        </span>
      </div>
      <textarea
        {...rest}
        rows={3}
        maxLength={TEXT_LIMIT}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-inner focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
        placeholder="200文字以内で入力してください"
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
