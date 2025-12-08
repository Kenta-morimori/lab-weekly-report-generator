// src/app/api/weekly-report/route.ts

import { NextRequest } from "next/server";
import { pdf } from "@react-pdf/renderer";
import { WeeklyReportPdf } from "@/pdf/WeeklyReportPdf";
import type { WeeklyReportPayload } from "@/types/weeklyReport";

export const runtime = "nodejs"; // React-PDF を使うので Node ランタイム

export async function POST(req: NextRequest) {
  const body = (await req.json()) as WeeklyReportPayload;

  // TODO: ここで body のバリデーション（zod）を入れてもよい

  const doc = <WeeklyReportPdf data={body} />;

  const pdfBuffer = await pdf(doc).toBuffer();

  const filename = `週報_${body.name}_${body.submissionDate}.pdf`;

  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(
        filename,
      )}"`,
    },
  });
}
