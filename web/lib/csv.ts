// Shared CSV helpers for the list pages ("every list page exportable").
// Client-side: builds the file from the rows already filtered in the browser,
// so exports always match exactly what's on screen.

export function csvEscape(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildCsv(header: string[], rows: (string | number | null | undefined)[][]): string {
  return [header.join(","), ...rows.map((r) => r.map(csvEscape).join(","))].join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export const csvDate = () => new Date().toISOString().slice(0, 10);
