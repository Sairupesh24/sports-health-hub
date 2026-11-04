export interface ExcelColumn<T> {
  header: string;
  key: keyof T | string;
  width?: number;
  formatter?: (val: any, row: T) => string | number;
}

export interface ExcelSheetConfig<T = any> {
  sheetName?: string;
  title: string;
  metadata?: Array<{ label: string; value: string | number }>;
  columns: ExcelColumn<T>[];
  data: T[];
}

export interface ExportReportOptions<T> extends ExcelSheetConfig<T> {
  filename: string;
}

export interface MultiSheetReportOptions {
  filename: string;
  sheets: ExcelSheetConfig[];
}

function createWorksheet<T>(
  XLSX: any,
  {
    title,
    metadata = [],
    columns,
    data,
  }: ExcelSheetConfig<T>
) {
  const rows: any[][] = [];

  // Organization & Report Title banner
  rows.push([title]);
  rows.push(["Centre for Spine and Sports Health (A Unit of Nsure Healthy Spine Pvt Ltd)"]);
  rows.push(["Rangareddy, Hyderabad"]);
  rows.push([]);

  // Metadata block (Timeframe, Filters, Timestamp)
  if (metadata.length > 0) {
    for (const meta of metadata) {
      rows.push([`${meta.label}:`, meta.value]);
    }
    rows.push([]);
  }

  // Header row
  rows.push(columns.map((c) => c.header));

  // Data rows
  for (const item of data) {
    const rowVals = columns.map((col) => {
      const rawVal = (item as any)[col.key];
      if (col.formatter) {
        return col.formatter(rawVal, item);
      }
      if (rawVal === null || rawVal === undefined) return "-";
      return rawVal;
    });
    rows.push(rowVals);
  }

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column width calculations
  const colWidths = columns.map((col) => {
    let maxLen = col.header.length;
    const sampleSize = Math.min(data.length, 100);
    for (let i = 0; i < sampleSize; i++) {
      const item = data[i];
      const val = col.formatter ? col.formatter((item as any)[col.key], item) : (item as any)[col.key];
      const strVal = String(val ?? "");
      if (strVal.length > maxLen) {
        maxLen = strVal.length;
      }
    }
    return { wch: Math.max(col.width || 12, Math.min(maxLen + 4, 45)) };
  });

  // Assign column widths
  ws["!cols"] = colWidths;
  return ws;
}

/**
 * Exports data to a formatted Excel (.xlsx) spreadsheet with headers, metadata and auto-adjusted column widths.
 * Dynamically loads the SheetJS library on demand to optimize initial page bundle performance.
 */
export async function exportToExcel<T>({
  filename,
  sheetName = "Report",
  title,
  metadata = [],
  columns,
  data,
}: ExportReportOptions<T>): Promise<void> {
  // Dynamically load SheetJS on demand
  const XLSXModule = await import("xlsx");
  const XLSX = (XLSXModule as any).default || XLSXModule;

  const ws = createWorksheet(XLSX, { sheetName, title, metadata, columns, data });
  const wb = XLSX.utils.book_new();
  const safeSheetName = (sheetName || "Report").replace(/[:\\/?*[\]]/g, "").slice(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, safeSheetName);

  // Write and download
  const cleanFilename = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, cleanFilename);
}

/**
 * Exports multiple datasets into separate sheets within a single formatted Excel (.xlsx) workbook.
 */
export async function exportToExcelMultiSheet({
  filename,
  sheets,
}: MultiSheetReportOptions): Promise<void> {
  const XLSXModule = await import("xlsx");
  const XLSX = (XLSXModule as any).default || XLSXModule;

  const wb = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const ws = createWorksheet(XLSX, sheet);
    const safeSheetName = (sheet.sheetName || "Sheet").replace(/[:\\/?*[\]]/g, "").slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
  }

  const cleanFilename = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, cleanFilename);
}

/**
 * Quick CSV export fallback utility
 */
export function exportToCSV<T>({
  filename,
  columns,
  data,
}: {
  filename: string;
  columns: ExcelColumn<T>[];
  data: T[];
}): void {
  const headers = columns.map((c) => `"${c.header.replace(/"/g, '""')}"`).join(",");
  const dataRows = data.map((item) =>
    columns
      .map((col) => {
        const rawVal = (item as any)[col.key];
        const val = col.formatter ? col.formatter(rawVal, item) : rawVal;
        const str = String(val ?? "");
        return `"${str.replace(/"/g, '""')}"`;
      })
      .join(",")
  );

  const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers, ...dataRows].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename.endsWith(".csv") ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
