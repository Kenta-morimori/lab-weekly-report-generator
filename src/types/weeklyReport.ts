// src/types/weeklyReport.ts

export type DayRecord = {
  /** 2025-04-07 のような ISO 形式 */
  date: string;
  /** 大学滞在開始時刻 "09:00" など */
  stayStart: string;
  /** 大学滞在終了時刻 "18:00" など */
  stayEnd: string;
  /** 離席開始時刻 "12:00" など */
  breakStart: string;
  /** 離席終了時刻 "13:00" など */
  breakEnd: string;
  /** 離席時間の合計（分） */
  breakMinutes: number;
  /** 計算済みのその日の滞在時間（分） */
  minutes: number;
  /** 研究内容・行動・達成内容 */
  content: string;
};

export type WeeklyReportPayload = {
  /** "2025" のような年度ラベル（タイトル用） */
  yearLabel: string;

  /** 氏名 */
  name: string;

  /** 提出日（自動計算された今週月曜日の日付） "2025-04-14" 形式 */
  submissionDate: string;

  /** 前週の週ラベル "2025/04/07〜2025/04/13" など */
  prevWeekLabel: string;
  /** 今週の週ラベル "2025/04/14〜2025/04/20" など */
  currentWeekLabel: string;

  /** 前週7日分のレコード */
  prevWeekDays: DayRecord[];
  /** 今週7日分のレコード */
  currentWeekDays: DayRecord[];

  /** 前週の総滞在時間（分） */
  totalPrevMinutes: number;
  /** 前週の総滞在時間（時間換算して四捨五入した整数） */
  totalPrevHoursRounded: number;

  /** 前週の研究達成目標 */
  prevGoal: string;
  /** 前週の目標達成度（% 0-100, 10刻み） */
  prevGoalResultPercent: number;
  /** ●達成点 */
  achievedPoints: string;
  /** ●課題・反省点 */
  issues: string;
  /** 今週の研究達成目標 */
  currentGoal: string;
  /** 備考 */
  notes: string;
};
