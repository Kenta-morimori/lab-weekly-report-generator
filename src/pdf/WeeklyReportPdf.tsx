// src/pdf/WeeklyReportPdf.tsx

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { WeeklyReportPayload } from "@/types/weeklyReport";

const styles = StyleSheet.create({
  page: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    fontSize: 10,
  },
  title: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  infoCell: {
    flexDirection: "row",
    borderWidth: 0.5,
    paddingHorizontal: 4,
    paddingVertical: 2,
    flexGrow: 1,
  },
  infoLabel: { width: 40 },
  infoValue: { flexGrow: 1 },

  table: {
    flexDirection: "row",
    borderWidth: 0.5,
  },
  col: {
    flex: 1,
    borderLeftWidth: 0.5,
  },
  colHeader: {
    padding: 4,
    borderBottomWidth: 0.5,
    textAlign: "center",
    fontSize: 11,
  },
  sectionRow: {
    borderBottomWidth: 0.5,
    padding: 4,
  },
  sectionLabel: {
    fontSize: 9,
    marginBottom: 2,
  },
  textArea: {
    fontSize: 9,
    minHeight: 40,
  },
  dayRowHeader: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    paddingVertical: 2,
  },
  dayRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    paddingVertical: 2,
  },
  dayCellDate: { width: 60, paddingHorizontal: 2 },
  dayCellTime: { width: 80, paddingHorizontal: 2 },
  dayCellMinutes: { width: 40, paddingHorizontal: 2, textAlign: "right" },
  dayCellContent: { flex: 1, paddingHorizontal: 2 },
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
    prevGoalResult,
    achievedPoints,
    issues,
    currentGoal,
    notes,
  } = data;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* タイトル */}
        <Text style={styles.title}>研究室・週報（{yearLabel}年度）</Text>

        {/* 上部 情報欄 */}
        <View style={styles.infoRow}>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>氏名</Text>
            <Text style={styles.infoValue}>{name}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>提出日</Text>
            <Text style={styles.infoValue}>{submissionDate}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>前週時間</Text>
            <Text style={styles.infoValue}>{totalPrevHoursRounded} 時間</Text>
          </View>
        </View>

        {/* メインテーブル */}
        <View style={styles.table}>
          {/* 前週 */}
          <View style={styles.col}>
            <Text style={styles.colHeader}>前週（{prevWeekLabel}）</Text>

            <View style={styles.sectionRow}>
              <Text style={styles.sectionLabel}>前週の研究達成目標</Text>
              <Text style={styles.textArea}>{prevGoal}</Text>
            </View>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionLabel}>前週の目標達成度</Text>
              <Text style={styles.textArea}>{prevGoalResult}</Text>
            </View>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionLabel}>●達成点</Text>
              <Text style={styles.textArea}>{achievedPoints}</Text>
            </View>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionLabel}>●課題・反省点</Text>
              <Text style={styles.textArea}>{issues}</Text>
            </View>

            {/* 日ごとの表ヘッダ */}
            <View style={styles.dayRowHeader}>
              <Text style={styles.dayCellDate}>日付</Text>
              <Text style={styles.dayCellTime}>滞在時間</Text>
              <Text style={styles.dayCellMinutes}>分</Text>
              <Text style={styles.dayCellContent}>研究内容</Text>
            </View>
            {/* 日ごとの行 */}
            {prevWeekDays.map((d) => (
              <View key={d.date} style={styles.dayRow}>
                <Text style={styles.dayCellDate}>{d.date}</Text>
                <Text style={styles.dayCellTime}>
                  {d.stayStart}〜{d.stayEnd}（休憩 {d.breakMinutes} 分）
                </Text>
                <Text style={styles.dayCellMinutes}>{d.minutes}</Text>
                <Text style={styles.dayCellContent}>{d.content}</Text>
              </View>
            ))}
          </View>

          {/* 今週 */}
          <View style={styles.col}>
            <Text style={styles.colHeader}>今週（{currentWeekLabel}）</Text>

            <View style={styles.sectionRow}>
              <Text style={styles.sectionLabel}>今週の研究達成目標</Text>
              <Text style={styles.textArea}>{currentGoal}</Text>
            </View>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionLabel}>備考</Text>
              <Text style={styles.textArea}>{notes}</Text>
            </View>

            {/* 日ごとの表ヘッダ */}
            <View style={styles.dayRowHeader}>
              <Text style={styles.dayCellDate}>日付</Text>
              <Text style={styles.dayCellTime}>滞在予定</Text>
              <Text style={styles.dayCellMinutes}>分</Text>
              <Text style={styles.dayCellContent}>予定内容</Text>
            </View>
            {/* 日ごとの行 */}
            {currentWeekDays.map((d) => (
              <View key={d.date} style={styles.dayRow}>
                <Text style={styles.dayCellDate}>{d.date}</Text>
                <Text style={styles.dayCellTime}>
                  {d.stayStart}〜{d.stayEnd}（休憩 {d.breakMinutes} 分）
                </Text>
                <Text style={styles.dayCellMinutes}>{d.minutes}</Text>
                <Text style={styles.dayCellContent}>{d.content}</Text>
              </View>
            ))}
          </View>
        </View>
      </Page>
    </Document>
  );
}
