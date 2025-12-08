// src/pdf/WeeklyReportPdf.tsx

import path from "node:path";
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import type { WeeklyReportPayload } from "@/types/weeklyReport";

Font.register({
  family: "MPlus1pJP",
  fonts: [
    {
      src: path.join(process.cwd(), "node_modules/noto-sans-cjk-jp/fonts/NotoSansCJKjp-Regular.woff"),
      fontWeight: "normal",
    },
    {
      src: path.join(process.cwd(), "node_modules/noto-sans-cjk-jp/fonts/NotoSansCJKjp-Bold.woff"),
      fontWeight: "bold",
    },
  ],
});

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 24,
    paddingHorizontal: 32,
    fontFamily: "MPlus1pJP",
    fontSize: 10.5,
    lineHeight: 1.35,
  },
  title: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 16,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 4,
  },
  bold: {
    fontWeight: "bold",
  },
  gridRow: {
    flexDirection: "row",
    gap: 18,
  },
  column: {
    flex: 1,
  },
  sectionBox: {
    borderWidth: 1,
    padding: 6,
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: "bold",
    marginBottom: 6,
  },
  table: {
    borderWidth: 1,
    borderRightWidth: 0.5,
    borderLeftWidth: 1,
  },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    backgroundColor: "#f5f5f5",
  },
  tableHeaderCell: {
    borderRightWidth: 0.5,
    paddingVertical: 5,
    paddingHorizontal: 5,
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 10,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    minHeight: 34,
  },
  cell: {
    borderRightWidth: 0.5,
    paddingVertical: 5,
    paddingHorizontal: 5,
    fontSize: 10,
    lineHeight: 1.3,
  },
  footerList: {
    marginTop: 8,
    gap: 6,
  },
  footerLabel: { fontWeight: "bold" },
});

type Props = {
  data: WeeklyReportPayload;
};

export function WeeklyReportPdf({ data }: Props) {
  const {
    yearLabel,
    name,
    submissionDate,
    prevWeekLabel,
    currentWeekLabel,
    prevWeekDays,
    currentWeekDays,
    totalPrevHoursRounded,
    prevGoal,
    prevGoalResultPercent,
    achievedPoints,
    issues,
    currentGoal,
    notes,
  } = data;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>研究室・週報（{yearLabel}年度）</Text>

        <View style={styles.topRow}>
          <View>
            <View style={styles.labelRow}>
              <Text style={styles.bold}>氏名</Text>
              <Text>：</Text>
              <Text>{name}</Text>
            </View>
            <View style={styles.labelRow}>
              <Text style={styles.bold}>前週の研究報告</Text>
              <Text>：</Text>
              <Text>{totalPrevHoursRounded} 時間（大学での滞在時間）</Text>
            </View>
            <View style={styles.labelRow}>
              <Text style={styles.bold}>前週の研究達成目標</Text>
              <Text>：</Text>
              <Text>{prevGoal}</Text>
            </View>
          </View>
          <View>
            <View style={styles.labelRow}>
              <Text style={styles.bold}>今週の研究予定</Text>
            </View>
            <View style={styles.labelRow}>
              <Text style={styles.bold}>研究達成目標（出来る限り数値目標）</Text>
              <Text>：</Text>
              <Text>{currentGoal}</Text>
            </View>
            <View style={styles.labelRow}>
              <Text>提出日：</Text>
              <Text>{submissionDate}</Text>
            </View>
          </View>
        </View>

        <View style={styles.gridRow}>
          {/* 前週 */}
          <View style={styles.column}>
            <View style={styles.sectionBox}>
              <Text style={styles.sectionTitle}>前週（{prevWeekLabel}）</Text>
              <Table
                rows={prevWeekDays}
                headers={["日付", "曜日", "大学滞在時間帯", "時間", "研究内容（講義、その他）、行動、達成内容"]}
              />
              <View style={styles.footerList}>
                <Text>
                  <Text style={styles.footerLabel}>前週の目標達成度：</Text> {prevGoalResultPercent}%
                </Text>
                <Text>
                  <Text style={styles.footerLabel}>●研究活動での達成点：</Text>
                  {achievedPoints}
                </Text>
                <Text>
                  <Text style={styles.footerLabel}>●研究活動実施上の課題・問題点・反省点等：</Text>
                  {issues}
                </Text>
              </View>
            </View>
          </View>

          {/* 今週 */}
          <View style={styles.column}>
            <View style={styles.sectionBox}>
              <Text style={styles.sectionTitle}>今週（{currentWeekLabel}）</Text>
              <Table
                rows={currentWeekDays}
                headers={["日付", "曜日", "大学滞在予定時間帯", "時間", "研究内容（講義、その他）、行動予定、休日でもよい"]}
              />
              <View style={styles.footerList}>
                <Text>
                  <Text style={styles.footerLabel}>備考（行動上配慮すべき内容）：</Text>
                  {notes}
                </Text>
                <Text>
                  <Text style={styles.footerLabel}>連絡内容（教員記述欄）：</Text>
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

type TableProps = {
  rows: WeeklyReportPayload["prevWeekDays"];
  headers: [string, string, string, string, string];
};

function Table({ rows, headers }: TableProps) {
  return (
    <View style={styles.table}>
      <View style={styles.tableHeaderRow}>
        {headers.map((text, idx) => (
          <Text key={idx} style={[styles.tableHeaderCell, columnStyle(idx)]}>
            {text}
          </Text>
        ))}
      </View>
      {rows.map((row) => {
        const weekday = extractWeekday(row.date);
        const dateText = ""; // 西暦表示は不要なため空欄
        const timeText = row.stayStart && row.stayEnd ? `${row.stayStart}〜${row.stayEnd}` : "―";
        const minutesText = row.minutes ? `${row.minutes} 分` : "";
        return (
          <View key={row.date} style={styles.tableRow}>
            <Text style={[styles.cell, columnStyle(0)]}>{dateText}</Text>
            <Text style={[styles.cell, columnStyle(1)]}>{weekday}</Text>
            <Text style={[styles.cell, columnStyle(2)]}>
              {timeText}
              {row.breakStart && row.breakEnd ? `（休憩 ${row.breakStart}〜${row.breakEnd}）` : ""}
            </Text>
            <Text style={[styles.cell, columnStyle(3)]}>{minutesText}</Text>
            <Text style={[styles.cell, columnStyle(4)]}>{row.content}</Text>
          </View>
        );
      })}
    </View>
  );
}

function columnStyle(idx: number) {
  // widths roughly aligned to template
  switch (idx) {
    case 0:
      return { width: 45 };
    case 1:
      return { width: 25, textAlign: "center" as const };
    case 2:
      return { width: 120 };
    case 3:
      return { width: 45, textAlign: "center" as const };
    default:
      return { flex: 1 };
  }
}

function extractWeekday(dateLabel: string): string {
  const match = dateLabel.match(/[（(]([日月火水木金土])[)）]/);
  if (match) return match[1];
  const date = parseIsoDate(dateLabel);
  return date ? ["日", "月", "火", "水", "木", "金", "土"][date.getDay()] : "";
}

function parseIsoDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
