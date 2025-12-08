// src/app/page.tsx

"use client";

export default function HomePage() {
  // TODO:
  // - 週選択用の日付入力
  // - 氏名・年度・提出日入力
  // - 前週/今週7日分のフォーム
  // - テキストエリア群（目標・達成度など）
  // - 入力から WeeklyReportPayload を組み立てる処理
  // - /api/weekly-report に POST して PDF をダウンロードする処理

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">
          研究室・週報 PDF ジェネレーター
        </h1>
        <p className="text-sm text-slate-600 mb-6">
          週の情報と滞在時間・研究内容を入力し、「PDF 出力」から週報を生成します。
        </p>

        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-slate-700">
            ここにフォームを実装していきます。（Codex 用 TODO）
          </p>
        </div>
      </div>
    </main>
  );
}
