import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE_HEADERS = [
  "uhid",
  "registration_date",
  "honorific",
  "first_name",
  "middle_name",
  "last_name",
  "gender",
  "mobile_no",
  "aadhaar_no",
  "blood_group",
  "dob",
  "age",
  "email",
  "alternate_mobile_no",
  "occupation",
  "sport",
  "athlete_type",
  "org_name",
  "address",
  "locality",
  "pincode",
  "city",
  "district",
  "state",
  "country",
  "has_insurance",
  "insurance_provider",
  "insurance_policy_no",
  "insurance_validity",
  "insurance_coverage_amount",
  "is_vip",
  "referral_source",
  "referral_source_detail",
];

const testClients = [
  {
    "uhid": "",
    "registration_date": "23/01/2025",
    "honorific": "Mr.",
    "first_name": "Rahul",
    "middle_name": "",
    "last_name": "Lokesh",
    "gender": "Male",
    "mobile_no": "9876543210",
    "aadhaar_no": "123456789012",
    "blood_group": "O+",
    "dob": "15-08-1995",
    "age": "",
    "email": "rahul.lokesh@test.com",
    "alternate_mobile_no": "",
    "occupation": "Athlete",
    "sport": "Cricket",
    "athlete_type": "Elite",
    "org_name": "Sports Hub",
    "address": "123 Main St",
    "locality": "Downtown",
    "pincode": "500001",
    "city": "Hyderabad",
    "district": "Hyderabad",
    "state": "Telangana",
    "country": "India",
    "has_insurance": "FALSE",
    "insurance_provider": "",
    "insurance_policy_no": "",
    "insurance_validity": "",
    "insurance_coverage_amount": "",
    "is_vip": "TRUE",
    "referral_source": "Website",
    "referral_source_detail": ""
  }
];

// Create workbook
const wb = XLSX.utils.book_new();

// Map array of objects to headers matching template
const rows = testClients.map(client => {
  const row = {};
  TEMPLATE_HEADERS.forEach(header => {
    row[header] = client[header] || "";
  });
  return row;
});

const ws = XLSX.utils.json_to_sheet(rows, { header: TEMPLATE_HEADERS });
XLSX.utils.book_append_sheet(wb, ws, "Clients");

const outPath = path.join(__dirname, '../public/test_clients_bulk.xlsx');
const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
fs.writeFileSync(outPath, buf);

console.log("Bulk upload test file generated at:", outPath);
