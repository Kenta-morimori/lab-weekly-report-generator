// src/app/api/weekly-report/route.ts

import { NextRequest } from "next/server";
import { pdf } from "@react-pdf/renderer";
import { z } from "zod";
import { WeeklyReportPdf } from "@/pdf/WeeklyReportPdf";
import { sanitizeNameForFilename } from "@/lib/weeklyReport";
import type { WeeklyReportPayload } from "@/types/weeklyReport";

export const runtime = "nodejs"; // React-PDF を使うので Node ランタイム

const daySchema = z.object({
  date: z.string().min(1, "date is required"),
  stayStart: z.string(),
  stayEnd: z.string(),
  breakStart: z.string(),
  breakEnd: z.string(),
  breakMinutes: z.number().int().nonnegative(),
  minutes: z.number().int().nonnegative(),
  content: z.string().max(200, "content must be <= 200 chars"),
});

const shortText = z.string().max(30, "text must be <= 30 chars");

const weeklyReportSchema = z.object({
  yearLabel: z.string().min(1, "yearLabel is required"),
  name: z.string().min(1, "name is required"),
  submissionDate: z.string().min(1, "submissionDate is required"),
  prevWeekLabel: z.string().min(1, "prevWeekLabel is required"),
  currentWeekLabel: z.string().min(1, "currentWeekLabel is required"),
  prevWeekDays: z.array(daySchema).length(7, "prevWeekDays must have 7 entries"),
  currentWeekDays: z.array(daySchema).length(7, "currentWeekDays must have 7 entries"),
  totalPrevMinutes: z.number().int().nonnegative(),
  totalPrevHoursRounded: z.number().int().nonnegative(),
  prevGoal: shortText,
  prevGoalResultPercent: z.number().int().min(0).max(100),
  achievedPoints: shortText,
  issues: shortText,
  currentGoal: shortText,
  notes: shortText,
});

export async function POST(req: NextRequest) {
  const body = (await req.json()) as WeeklyReportPayload;

  const parsed = weeklyReportSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
      .join("; ");
    return new Response(`Invalid payload: ${message}`, { status: 400 });
  }

  const data = parsed.data;
  const doc = <WeeklyReportPdf data={data} />;

  const pdfBuffer = await pdf(doc).toBuffer();
  const pdfBody = normalizePdfOutput(pdfBuffer);
  const contentLength =
    typeof pdfBuffer === "object" && "byteLength" in pdfBuffer
      ? Number((pdfBuffer as ArrayBufferView | ArrayBuffer | { byteLength: number }).byteLength)
      : 0;

  if (!contentLength) {
    console.error("PDF generation returned empty buffer");
    return new Response("Failed to generate PDF (empty output)", { status: 500 });
  }

  const safeName = sanitizeNameForFilename(data.name.trim()) || "noname";
  const filename = `週報_${safeName}_${data.submissionDate}.pdf`;

  return new Response(pdfBody, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      ...(contentLength ? { "Content-Length": String(contentLength) } : {}),
      "Content-Disposition": `attachment; filename="${encodeURIComponent(
        filename,
      )}"`,
    },
  });
}

export function normalizePdfOutput(value: unknown): BodyInit {
  if (value === null || value === undefined) {
    throw new TypeError("Unexpected value type for PDF output");
  }
  if (value instanceof ReadableStream) return value;
  if (typeof Blob !== "undefined" && value instanceof Blob) return value;
  if (value instanceof ArrayBuffer) return value;

  const copyToArrayBuffer = (view: ArrayBufferView) => {
    const clone = new Uint8Array(view.byteLength);
    clone.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
    return clone.buffer;
  };

  if (ArrayBuffer.isView(value)) {
    return copyToArrayBuffer(value as ArrayBufferView);
  }

  if (typeof Buffer !== "undefined" && Buffer.isBuffer(value)) {
    return copyToArrayBuffer(value as Buffer);
  }

  if (typeof value === "object" && value !== null && "byteLength" in (value as ArrayBufferLike)) {
    const view = new Uint8Array(value as ArrayBufferLike);
    return copyToArrayBuffer(view);
  }

  try {
    const view = new Uint8Array(value as ArrayBufferLike);
    return copyToArrayBuffer(view);
  } catch {
    throw new TypeError("Unexpected value type for PDF output");
  }
}
