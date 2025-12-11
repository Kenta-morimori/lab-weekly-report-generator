// Layout constants shared between PDF rendering and layout tests.
// Values mirror styles in WeeklyReportPdf.tsx.
export const LAYOUT = {
  pageHeight: 842, // A4 portrait height in points
  paddingTop: 26,
  paddingBottom: 18,
  paddingHorizontal: 20,
  title: { fontSize: 14, marginBottom: 10 },
  topRow: { marginBottom: 10, estimatedHeight: 70 },
  gridGap: 12,
  section: {
    padding: 5,
    marginBottom: 10,
    title: { fontSize: 10, marginBottom: 8 },
  },
  tableWrapper: { marginTop: 4, marginBottom: 8 },
  tableHeader: { fontSize: 8, lineHeight: 1.1, paddingVertical: 4 },
  tableRow: { minHeight: 36 },
  footerList: { marginTop: 10 },
  columns: {
    date: 34,
    weekday: 24,
    timeRange: 78,
    hours: 26,
  },
};
