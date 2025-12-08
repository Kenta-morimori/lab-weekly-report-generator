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

const cellBorder = {
  borderWidth: 0.5,
  borderColor: "#000",
  borderStyle: "solid",
};

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
    minHeight: 680,
  },
  column: {
    flex: 1,
  },
  sectionBox: {
    padding: 6,
    marginBottom: 12,
    flex: 1,
  },
  sectionTitle: {
    fontWeight: "bold",
    marginBottom: 6,
    fontSize: 11,
  },
  table: {},
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
  },
  tableHeaderCell: {
    ...cellBorder,
    paddingVertical: 5,
    paddingHorizontal: 5,
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 9,
    lineHeight: 1.15,
  },
  tableRow: {
    flexDirection: "row",
    minHeight: 40,
  },
  cell: {
    ...cellBorder,
    paddingVertical: 5,
    paddingHorizontal: 5,
    fontSize: 10,
    lineHeight: 1.3,
    justifyContent: "center",
  },
  footerList: {
    marginTop: 8,
    gap: 6,
  },
  footerLabel: { fontWeight: "bold" },
  footerLine: { marginTop: 2 },
});

type Props = {
  data: WeeklyReportPayload;
};

export function WeeklyReportPdf({ data }: Props) {
  const {
    yearLabel,
    name,
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
              <Text style={styles.bold}>
                研究達成目標（出来る限り数値目標）
              </Text>
              <Text>：</Text>
            </View>
            <Text>{currentGoal}</Text>
          </View>
        </View>

        <View style={styles.gridRow}>
          {/* 前週 */}
          <View style={styles.column}>
            <View style={styles.sectionBox}>
              <Text style={styles.sectionTitle}>前週（{prevWeekLabel}）</Text>
              <Table
                rows={prevWeekDays}
                headers={[
                  "日付",
                  "曜日",
                  "大学滞在\n時間帯",
                  "時間\n(h)",
                  "研究内容（講義、その他）、\n行動、達成内容",
                ]}
              />
              <View style={styles.footerList}>
                <Text>
                  <Text style={styles.footerLabel}>前週の目標達成度：</Text> {prevGoalResultPercent}%
                </Text>
                <Text style={styles.footerLine}>
                  <Text style={styles.footerLabel}>●研究活動での達成点：</Text>
                  {"\n"}
                  {achievedPoints}
                </Text>
                <Text style={styles.footerLine}>
                  <Text style={styles.footerLabel}>●研究活動実施上の課題・問題点・反省点等：</Text>
                  {"\n"}
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
                headers={[
                  "日付",
                  "曜日",
                  "大学滞在予定\n時間帯",
                  "時間\n(h)",
                  "研究内容（講義、その他）、\n行動予定、休日でもよい",
                ]}
              />
                <View style={styles.footerList}>
                  <Text style={styles.footerLine}>
                    <Text style={styles.footerLabel}>備考（行動上配慮すべき内容）：</Text>
                    {"\n"}
                    {notes}
                  </Text>
                  <Text style={styles.footerLine}>
                    <Text style={styles.footerLabel}>連絡内容（教員記述欄）：</Text>
                    {"\n"}
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
          <Text
            key={idx}
            style={[
              styles.tableHeaderCell,
              columnStyle(idx),
              idx === 4 ? { fontSize: 9 } : {},
            ]}
          >
            {text}
          </Text>
        ))}
      </View>
      {rows.map((row) => {
        const weekday = extractWeekday(row.date);
        const dateText = toDateText(row.date); // 月/日 を表示
        const timeText = formatStayRange(row);
        const hoursText = row.minutes ? `${(row.minutes / 60).toFixed(1)}` : "";
        return (
          <View key={row.date} style={styles.tableRow}>
            <Text style={[styles.cell, columnStyle(0)]}>{dateText}</Text>
            <Text style={[styles.cell, columnStyle(1)]}>{weekday}</Text>
            <Text style={[styles.cell, columnStyle(2)]}>
              {timeText}
            </Text>
            <Text style={[styles.cell, columnStyle(3)]}>{hoursText}</Text>
            <Text style={[styles.cell, columnStyle(4), { fontSize: 8.5, lineHeight: 1.25 }]}>
              {row.content}
            </Text>
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
      return { width: 35 };
    case 1:
      return { width: 28, textAlign: "center" as const };
    case 2:
      return { width: 70 };
    case 3:
      return { width: 28, textAlign: "center" as const };
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

function toDateText(dateLabel: string): string {
  const iso = dateLabel.split(" ")[0];
  if (!iso) return "";
  const date = parseIsoDate(iso);
  if (!date) return "";
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${m}/${d}`;
}

function parseIsoDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatStayRange(row: WeeklyReportPayload["prevWeekDays"][number]): string {
  const { stayStart, stayEnd, breakStart, breakEnd } = row;
  if (stayStart && stayEnd && breakStart && breakEnd) {
    return `${stayStart}〜${breakStart}\n${breakEnd}〜${stayEnd}`;
  }
  if (stayStart && stayEnd) {
    return `${stayStart}〜${stayEnd}`;
  }
  return "";
}
