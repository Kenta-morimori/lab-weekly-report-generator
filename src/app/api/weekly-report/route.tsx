// src/app/api/weekly-report/route.ts

import { NextRequest } from "next/server";
import { pdf } from "@react-pdf/renderer";
import { z } from "zod";
import { WeeklyReportPdf } from "@/pdf/WeeklyReportPdf";
import { sanitizeNameForFilename } from "@/lib/weeklyReport";
import type { WeeklyReportPayload } from "@/types/weeklyReport";
import { PDFDocument } from "pdf-lib";

export const runtime = "nodejs"; // React-PDF を使うので Node ランタイム

const daySchema = z.object({
  date: z.string().min(1, "date is required"),
  stayStart: z.string(),
  stayEnd: z.string(),
  breakStart: z.string(),
  breakEnd: z.string(),
  breakMinutes: z.number().int().nonnegative(),
  minutes: z.number().int().nonnegative(),
  content: z.string().max(20, "content must be <= 20 chars"),
});

const shortText30 = z.string().max(30, "text must be <= 30 chars");
const goalText25 = z.string().max(25, "text must be <= 25 chars");

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
  prevGoal: goalText25,
  prevGoalResultPercent: z.number().int().min(0).max(100),
  achievedPoints: shortText30,
  issues: shortText30,
  currentGoal: goalText25,
  notes: shortText30,
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
  const trimmedPdfBuffer = await trimToSinglePage(pdfBuffer);
  const arrayBuffer = await toArrayBuffer(trimmedPdfBuffer);
  const byteLength = arrayBuffer.byteLength;

  if (byteLength <= 0) {
    console.error("PDF generation returned empty buffer");
    return new Response("Failed to generate PDF (empty output)", { status: 500 });
  }

  const safeName = sanitizeNameForFilename(data.name.trim()) || "noname";
  const filename = `週報_${safeName}_${data.submissionDate}.pdf`;

  return new Response(arrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(byteLength),
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

async function trimToSinglePage(
  pdfInput: ArrayBuffer | Buffer | Uint8Array,
): Promise<ArrayBuffer | Buffer | Uint8Array> {
  try {
    const original = await PDFDocument.load(pdfInput);
    if (original.getPageCount() <= 1) return pdfInput;

    const trimmed = await PDFDocument.create();
    const [firstPage] = await trimmed.copyPages(original, [0]);
    trimmed.addPage(firstPage);
    const output = await trimmed.save();
    return output;
  } catch (err) {
    console.error("Failed to trim PDF pages, returning original buffer", err);
    return pdfInput;
  }
}

async function toArrayBuffer(value: unknown): Promise<ArrayBuffer> {
  if (value instanceof ArrayBuffer) return value;
  if (ArrayBuffer.isView(value)) {
    const view = value as ArrayBufferView;
    const clone = new Uint8Array(view.byteLength);
    clone.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
    return clone.buffer;
  }
  if (value instanceof ReadableStream || (typeof Blob !== "undefined" && value instanceof Blob)) {
    const resp = new Response(value as BodyInit);
    return resp.arrayBuffer();
  }
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(value)) {
    const clone = new Uint8Array(value.byteLength);
    clone.set(value);
    return clone.buffer;
  }
  // Fallback to Response conversion; may throw which will bubble as 500
  const resp = new Response(value as BodyInit);
  return resp.arrayBuffer();
}
