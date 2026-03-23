import XLSX from 'xlsx';

const headers = [
  "First Name",
  "Middle Name",
  "Last Name",
  "Phone Number",
  "Role (admin/consultant/client)",
  "Email",
  "Password (Optional)"
];

const uniqueEmail = `testuser_${Date.now()}@ishpo.com`;
const data = [
  headers,
  ["Test", "", "BulkUser", "+1234567890", "admin", uniqueEmail, "TempPass123!"],
];

const ws = XLSX.utils.aoa_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Users Template");
XLSX.writeFile(wb, "test_unique_upload.xlsx");

console.log("Created test_unique_upload.xlsx with email:", uniqueEmail);
