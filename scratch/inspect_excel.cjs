const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '../public/mock_diagnostic.xlsx');
try {
  const workbook = XLSX.readFile(filePath);
  console.log("Sheet names:", workbook.SheetNames);
  
  // Print first 5 rows of sheet 2 (Mobility)
  const sheet2 = workbook.Sheets[workbook.SheetNames[1]];
  const data2 = XLSX.utils.sheet_to_json(sheet2, { header: 1 });
  console.log("\nSheet 2 (Mobility) first 6 rows:");
  console.log(data2.slice(0, 6));

  // Print first 5 rows of sheet 3 (Strength)
  const sheet3 = workbook.Sheets[workbook.SheetNames[2]];
  const data3 = XLSX.utils.sheet_to_json(sheet3, { header: 1 });
  console.log("\nSheet 3 (Strength) first 6 rows:");
  console.log(data3.slice(0, 6));

  // Print first 5 rows of sheet 4 (Balance)
  const sheet4 = workbook.Sheets[workbook.SheetNames[3]];
  const data4 = XLSX.utils.sheet_to_json(sheet4, { header: 1 });
  console.log("\nSheet 4 (Strength Balance) first 6 rows:");
  console.log(data4.slice(0, 6));
} catch (err) {
  console.error("Error reading file:", err);
}
