/**
 * Tiny client-side CSV exporter — no dependency.
 * For XLSX we'd want a real library; deferred until needed.
 */

function escape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.includes('"') || s.includes(',') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export interface CsvColumn<T> {
  header: string;
  accessor: keyof T | ((row: T) => unknown);
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escape(c.header)).join(',');
  const body = rows
    .map((row) =>
      columns
        .map((c) => {
          const v = typeof c.accessor === 'function' ? c.accessor(row) : row[c.accessor];
          return escape(v);
        })
        .join(',')
    )
    .join('\n');
  return `${header}\n${body}\n`;
}

/** Triggers a browser download of the given text content as a file. */
export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
