import { google } from "googleapis";
import { Readable } from "node:stream";
import { sanitizeNameForFilename } from "@/lib/weeklyReport";
import type { WeeklyReportPayload } from "@/types/weeklyReport";

const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const SHEETS_ID = process.env.GOOGLE_SHEETS_ID;
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

function hasConfig(): boolean {
  return Boolean(DRIVE_FOLDER_ID && SHEETS_ID && SERVICE_ACCOUNT_EMAIL && SERVICE_ACCOUNT_KEY);
}

function buildAuth() {
  const privateKey = (SERVICE_ACCOUNT_KEY || "").replace(/\\n/g, "\n");
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    },
    scopes: [
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/spreadsheets",
    ],
  });
}

type PersistResult = {
  fileId: string | null;
  webViewLink: string | null;
};

export async function persistWeeklyReportToDriveAndSheet(
  payload: WeeklyReportPayload,
  pdfBuffer: ArrayBuffer,
): Promise<PersistResult | null> {
  if (!hasConfig()) {
    console.warn("[reportStorage] Google credentials or IDs are missing. Skipping persistence.");
    return null;
  }

  try {
    const auth = buildAuth();
    const drive = google.drive({ version: "v3", auth });
    const sheets = google.sheets({ version: "v4", auth });
    const buffer = Buffer.from(new Uint8Array(pdfBuffer));

    const safeName = sanitizeNameForFilename(payload.name) || "noname";
    const fileName = `週報_${safeName}_${payload.submissionDate}.pdf`;

    const driveRes = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [DRIVE_FOLDER_ID as string],
        mimeType: "application/pdf",
      },
      media: {
        mimeType: "application/pdf",
        body: Readable.from(buffer),
      },
      fields: "id, webViewLink",
    });

    const fileId = driveRes.data.id ?? null;
    const webViewLink =
      driveRes.data.webViewLink ?? (fileId ? `https://drive.google.com/file/d/${fileId}/view` : null);

    const timestamp = new Date().toISOString();
    const row = [
      timestamp,
      payload.name,
      payload.submissionDate,
      payload.prevWeekLabel,
      payload.currentWeekLabel,
      payload.prevGoalResultPercent,
      payload.prevGoal,
      payload.achievedPoints,
      payload.issues,
      payload.currentGoal,
      payload.notes,
      webViewLink ?? "",
      fileId ?? "",
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEETS_ID as string,
      range: "A1",
      valueInputOption: "RAW",
      requestBody: { values: [row] },
    });

    return { fileId, webViewLink };
  } catch (err) {
    console.error("[reportStorage] Failed to persist weekly report", err);
    return null;
  }
}
