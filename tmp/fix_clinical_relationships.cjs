const fs = require("fs");
const filePath = "d:/Sports_Physio_Software/sports-health-hub-main/src/integrations/supabase/types.ts";
let content = fs.readFileSync(filePath, "utf8");

const relationships = {
  physio_session_details: `        Relationships: [
          {
            foreignKeyName: "physio_session_details_session_id_fkey",
            columns: ["session_id"],
            isOneToOne: true,
            referencedRelation: "sessions",
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "physio_session_details_injury_id_fkey",
            columns: ["injury_id"],
            isOneToOne: false,
            referencedRelation: "injuries",
            referencedColumns: ["id"]
          }
        ]`,
  injuries: `        Relationships: [
          {
            foreignKeyName: "injuries_client_id_fkey",
            columns: ["client_id"],
            isOneToOne: false,
            referencedRelation: "clients",
            referencedColumns: ["id"]
          }
        ]`
};

Object.entries(relationships).forEach(([table, rel]) => {
  const regex = new RegExp(`(${table}: \\{[^]*?Relationships: )\\[\\]`, "m");
  content = content.replace(regex, `$1${rel.trim().replace("Relationships: ", "")}`);
});

fs.writeFileSync(filePath, content);
console.log("Successfully updated clinical relationships in types.ts");
