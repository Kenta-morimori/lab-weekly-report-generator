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
  content: z.string().max(50, "content must be <= 50 chars"),
});

const shortText = z.string().max(50, "text must be <= 50 chars");

const weeklyReportSchema = z.object({
  yearLabel: z.string().min(1, "yearLabel is required"),
  name: z.string().min(1, "name is required"),
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
  const arrayBuffer = await toArrayBuffer(pdfBuffer);
  const byteLength = arrayBuffer.byteLength;

  if (byteLength <= 0) {
    console.error("PDF generation returned empty buffer");
    return new Response("Failed to generate PDF (empty output)", { status: 500 });
  }

  const safeName = sanitizeNameForFilename(data.name.trim()) || "noname";
  const weekStartIso = deriveWeekStartIso(data);
  const filename = `週報_${safeName}_${weekStartIso}.pdf`;

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

function deriveWeekStartIso(data: WeeklyReportPayload): string {
  const [firstDay] = data.currentWeekDays;
  if (!firstDay?.date) return "unknown-date";
  const iso = firstDay.date.split(" ")[0];
  if (!iso) return "unknown-date";
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? iso : iso;
}
