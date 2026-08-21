import * as XLSX from "xlsx";

export type StatusGrade = "good" | "moderate" | "needs-work" | "priority";

export interface TestSession {
  index: number;
  date: string;
  type: string;
  height: number | null;
  weight: number | null;
  upperBodyWeight: number | null;
  headWeight: number | null;
  bmi: number | null;
}

export interface MetricTest {
  result: number | null;
  percentRef: number | null;
}

export interface MetricItem {
  key: string;
  label: string;
  category: string;
  referenceValue: number | null;
  isRankable: boolean;
  tests: MetricTest[];
  latestPercentRef: number | null;
  status: StatusGrade;
}

export interface StrengthCategorySummary {
  label: string;
  metrics: MetricItem[];
  testAverages: (number | null)[];
  latestAverage: number | null;
  status: StatusGrade;
}

export interface ParsedAssessmentData {
  client: {
    name: string;
    birthdate: string;
    gender?: string;
    tests: TestSession[];
    latestTest: TestSession | null;
  };
  metrics: {
    mobility: MetricItem[];
    strength: MetricItem[];
    balance: MetricItem[];
  };
  strengthSummary: Record<string, StrengthCategorySummary>;
}

// Helper to convert Excel date serials
export const excelDateToJS = (serial: any): Date => {
  let numSerial = typeof serial === "number" ? serial : parseFloat(String(serial));
  if (isNaN(numSerial)) return new Date();
  return new Date(Math.round((numSerial - 25569) * 86400 * 1000));
};

export const formatDateStr = (date: Date): string => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const d = date.getDate();
  const m = months[date.getMonth()];
  const y = date.getFullYear();
  return `${d} ${m} ${y}`;
};

export function humanizeLabel(key: string): string {
  if (!key) return "";
  // Strip prefixes
  let cleaned = key.replace(/^(mobility|isometric|relation)/i, "");
  // Split camelCase by capital letters
  let split = cleaned.replace(/([A-Z])/g, " $1").trim();
  return split.charAt(0).toUpperCase() + split.slice(1);
}

export function getStatusFromPercent(percent: number | null): StatusGrade {
  if (percent === null || percent === undefined) return "moderate";
  if (percent >= 10) return "good";
  if (percent >= -10) return "moderate";
  if (percent >= -30) return "needs-work";
  return "priority";
}

function parseNumeric(val: any): number | null {
  if (val === null || val === undefined || val === "" || val === "—") return null;
  if (typeof val === "number") return val;
  const cleaned = String(val).replace(/%/g, "").replace(/\+/g, "").trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

export async function parseAssessmentXLS(file: File): Promise<ParsedAssessmentData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        if (!e.target?.result) {
          throw new Error("Could not read file content.");
        }
        const wb = XLSX.read(e.target.result, { type: "binary" });

        // Validate sheets existence
        const requiredSheets = ["Customer information", "Mobility", "Strength", "Strength balance"];
        for (const sheet of requiredSheets) {
          if (!wb.Sheets[sheet]) {
            throw new Error(`Missing required sheet: ${sheet}`);
          }
        }

        // 1. Parse Customer information
        const infoSheet = wb.Sheets["Customer information"];
        const infoRows = XLSX.utils.sheet_to_json<any[]>(infoSheet, { header: 1, defval: null });
        
        if (infoRows.length < 2) {
          throw new Error("Invalid Customer information sheet structure.");
        }

        // Row 1: Col 0 is Name, Col 1 is Birthdate
        const name = String(infoRows[1][0] || "UNKNOWN CLIENT").toUpperCase().trim();
        const birthdateSerial = infoRows[1][1];
        const birthdate = birthdateSerial ? formatDateStr(excelDateToJS(birthdateSerial)) : "—";

        // Find tests starting at Row 4
        const tests: TestSession[] = [];
        for (let i = 4; i < infoRows.length; i++) {
          const r = infoRows[i];
          if (!r || r[0] === null || r[0] === undefined || r[0] === "") continue;
          
          const testIndex = parseInt(String(r[0]));
          const dateSerial = r[1];
          const testDate = dateSerial ? formatDateStr(excelDateToJS(dateSerial)) : "—";
          
          tests.push({
            index: testIndex,
            date: testDate,
            type: String(r[2] || "Assessment"),
            height: parseNumeric(r[3]),
            weight: parseNumeric(r[4]),
            upperBodyWeight: parseNumeric(r[5]),
            headWeight: parseNumeric(r[6]),
            bmi: parseNumeric(r[7]),
          });
        }

        // Sort tests by index to ensure order
        tests.sort((a, b) => a.index - b.index);
        const latestTest = tests.length > 0 ? tests[tests.length - 1] : null;

        // Helper to parse sheets 2, 3, 4
        const parseMetricsSheet = (sheetName: string): MetricItem[] => {
          const sheet = wb.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: null });
          const items: MetricItem[] = [];

          // Row 0: Title, Row 1: Headers, Data from Row 2
          for (let i = 2; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row[0] === null || row[0] === undefined || row[0] === "") continue;

            const category = String(row[0]).trim();
            const key = String(row[1] || "").trim();
            if (!key) continue;

            const refVal = parseNumeric(row[2]);
            const isRankable = refVal !== null && !isNaN(refVal);

            const metricTests: MetricTest[] = [];
            for (let t = 1; t <= tests.length; t++) {
              const resultCol = 3 + (t - 1) * 2;
              const percentRefCol = 4 + (t - 1) * 2;

              const result = row.length > resultCol ? parseNumeric(row[resultCol]) : null;
              const percentRef = row.length > percentRefCol ? parseNumeric(row[percentRefCol]) : null;

              metricTests.push({ result, percentRef });
            }

            // Find latest percent ref
            let latestPercentRef: number | null = null;
            for (let tIndex = metricTests.length - 1; tIndex >= 0; tIndex--) {
              if (metricTests[tIndex].percentRef !== null) {
                latestPercentRef = metricTests[tIndex].percentRef;
                break;
              }
            }

            items.push({
              key,
              label: humanizeLabel(key),
              category,
              referenceValue: refVal,
              isRankable,
              tests: metricTests,
              latestPercentRef,
              status: getStatusFromPercent(latestPercentRef),
            });
          }
          return items;
        };

        const mobility = parseMetricsSheet("Mobility");
        const strength = parseMetricsSheet("Strength");
        const balance = parseMetricsSheet("Strength balance");

        // 2. Pre-compute Strength Summary (the 4 categories)
        // Map defined strength categories:
        const STRENGTH_CATEGORIES = [
          { key: "Cervical spine", label: "Cervical Spine" },
          { key: "Lumbar / Thoracic Spine", label: "Lumbar / Thoracic Spine" },
          { key: "Shoulder and arm", label: "Shoulder Strength" },
          { key: "Hip and knee", label: "Hip & Knee Strength" },
        ];

        const strengthSummary: Record<string, StrengthCategorySummary> = {};

        for (const cat of STRENGTH_CATEGORIES) {
          // Filter metrics belonging to this category that are rankable
          const catMetrics = strength.filter(
            (m) => m.category.toLowerCase().trim() === cat.key.toLowerCase().trim() && m.isRankable
          );

          const testAverages: (number | null)[] = [];
          for (let t = 0; t < tests.length; t++) {
            const vals = catMetrics
              .map((m) => m.tests[t]?.percentRef)
              .filter((v): v is number => v !== null && v !== undefined);

            if (vals.length > 0) {
              const avg = vals.reduce((sum, v) => sum + v, 0) / vals.length;
              testAverages.push(parseFloat(avg.toFixed(1)));
            } else {
              testAverages.push(null);
            }
          }

          // Get latest average (last non-null value from testAverages)
          let latestAverage: number | null = null;
          for (let idx = testAverages.length - 1; idx >= 0; idx--) {
            if (testAverages[idx] !== null) {
              latestAverage = testAverages[idx];
              break;
            }
          }

          strengthSummary[cat.key] = {
            label: cat.label,
            metrics: catMetrics,
            testAverages,
            latestAverage,
            status: getStatusFromPercent(latestAverage),
          };
        }

        resolve({
          client: {
            name,
            birthdate,
            tests,
            latestTest,
          },
          metrics: {
            mobility,
            strength,
            balance,
          },
          strengthSummary,
        });
      } catch (err: any) {
        reject(new Error(err.message || "Failed to parse Excel assessment file."));
      }
    };
    reader.onerror = () => reject(new Error("File read error."));
    reader.readAsBinaryString(file);
  });
}
