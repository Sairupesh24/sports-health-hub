import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create workbook
const wb = XLSX.utils.book_new();

// Sheet 1: Customer information
const customerData = [
    ["Name", "John Doe"],
    ["DOB", "1995-08-15"],
    ["Weight", "80 kg"],
    ["Height", "180 cm"],
    ["BMI", 24.7, "2026-06-01"]
];
const wsCustomer = XLSX.utils.aoa_to_sheet(customerData);
XLSX.utils.book_append_sheet(wb, wsCustomer, "Customer information");

// Sheet 2: Mobility
const mobilityData = [
    ["Parameter", "Baseline", "2026-06-01", "% Ref."],
    ["mobilityCervicalSagittalExtension", 40, 35, -13],
    ["mobilityCervicalSagittalFlexion", 50, 48, -4],
    ["mobilityLumbarSagittalExtension", 30, 20, -33]
];
const wsMobility = XLSX.utils.aoa_to_sheet(mobilityData);
XLSX.utils.book_append_sheet(wb, wsMobility, "Mobility");

// Sheet 3: Strength
const strengthData = [
    ["Parameter", "Baseline", "2026-06-01", "% Ref."],
    ["strengthShoulderExtensionLeft", 25, 20, -20],
    ["strengthShoulderExtensionRight", 28, 15, -46],
    ["strengthElbowFlexionLeft", 40, 42, 5]
];
const wsStrength = XLSX.utils.aoa_to_sheet(strengthData);
XLSX.utils.book_append_sheet(wb, wsStrength, "Strength");

// Sheet 4: Strength balance
const balanceData = [
    ["Parameter", "Baseline", "2026-06-01", "% Ref."],
    ["strengthBalanceAnkleDorsiflexionRight", 15, 12, -20],
    ["balanceHipFlexionLeft", 30, 25, -17]
];
const wsBalance = XLSX.utils.aoa_to_sheet(balanceData);
XLSX.utils.book_append_sheet(wb, wsBalance, "Strength balance");

// Save workbook to public directory
const outPath = path.join(__dirname, '../public/mock_diagnostic.xlsx');
const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
fs.writeFileSync(outPath, buf);
console.log("Mock Excel Diagnostic report generated at:", outPath);
