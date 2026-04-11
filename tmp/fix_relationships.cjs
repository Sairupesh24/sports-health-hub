const fs = require("fs");
const path = require("path");

const filePath = "d:/Sports_Physio_Software/sports-health-hub-main/src/integrations/supabase/types.ts";
let content = fs.readFileSync(filePath, "utf8");

// Map of table names to their relationships definition
const relationships = {
  sessions: `        Relationships: [
          {
            foreignKeyName: "sessions_client_id_fkey",
            columns: ["client_id"],
            isOneToOne: false,
            referencedRelation: "clients",
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_therapist_id_fkey",
            columns: ["therapist_id"],
            isOneToOne: false,
            referencedRelation: "profiles",
            referencedColumns: ["id"]
          }
        ]`,
  waitlist: `        Relationships: [
          {
            foreignKeyName: "waitlist_client_id_fkey",
            columns: ["client_id"],
            isOneToOne: false,
            referencedRelation: "clients",
            referencedColumns: ["id"]
          }
        ]`,
  package_services: `        Relationships: [
          {
            foreignKeyName: "package_services_package_id_fkey",
            columns: ["package_id"],
            isOneToOne: false,
            referencedRelation: "packages",
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_services_service_id_fkey",
            columns: ["service_id"],
            isOneToOne: false,
            referencedRelation: "services",
            referencedColumns: ["id"]
          }
        ]`
};

Object.entries(relationships).forEach(([table, rel]) => {
  const regex = new RegExp(`(${table}: \\{[^]*?Relationships: )\\[\\]`, "m");
  content = content.replace(regex, `$1${rel.trim().replace("Relationships: ", "")}`);
});

fs.writeFileSync(filePath, content);
console.log("Successfully updated relationships in types.ts");
