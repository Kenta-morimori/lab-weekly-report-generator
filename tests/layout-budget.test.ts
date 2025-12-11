import { strict as assert } from "node:assert";
import test from "node:test";
import { LAYOUT } from "@/pdf/layoutMetrics";

// Conservative layout budget test to detect vertical overflow: if the minimal
// required height of all blocks exceeds the available page height, fail.

test("layout fits within A4 portrait height budget", () => {
  const usableHeight =
    LAYOUT.pageHeight - LAYOUT.paddingTop - LAYOUT.paddingBottom;

  // Title + spacing
  const titleHeight = LAYOUT.title.fontSize; // conservative: 1x font size
  const titleBlock = titleHeight + LAYOUT.title.marginBottom;

  // Top row block (氏名など) – use conservative estimate from metrics
  const topRowBlock = LAYOUT.topRow.estimatedHeight + LAYOUT.topRow.marginBottom;

  // Section chrome (padding + title)
  const sectionChrome =
    LAYOUT.section.padding * 2 +
    LAYOUT.section.title.fontSize * 1.3 +
    LAYOUT.section.title.marginBottom;

  // Table block: header + rows + wrapper margins
  const headerHeight = LAYOUT.tableHeader.fontSize * LAYOUT.tableHeader.lineHeight + 2 * 4;
  const rowsHeight = LAYOUT.tableRow.minHeight * 7;
  const tableBlock = sectionChrome + headerHeight + rowsHeight + LAYOUT.tableWrapper.marginTop + LAYOUT.tableWrapper.marginBottom;

  // Footer block: title + list margin + 3 lines of text (approx 2 lines each)
  const footerTitle = LAYOUT.section.title.fontSize * 1.3 + LAYOUT.section.title.marginBottom;
  const footerLines = 3 * (9 * 1.3); // body font ~9pt, 3 lines conservatively
  const footerBlock =
    LAYOUT.section.padding * 2 +
    footerTitle +
    LAYOUT.footerList.marginTop +
    footerLines;

  const firstGridRow = tableBlock; // 前週 or 今週 表
  const secondGridRow = footerBlock; // 前週 or 今週 フッターブロック

  // grid gap between rows not modeled (0) because grid rows are stacked separately
  const totalHeight = titleBlock + topRowBlock + firstGridRow + secondGridRow;

  assert.ok(
    totalHeight < usableHeight,
    `Layout overflow: need ${totalHeight.toFixed(1)}pt but only ${usableHeight.toFixed(1)}pt available`,
  );
});
