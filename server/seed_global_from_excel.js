import { db } from './db.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import * as XLSX from 'xlsx';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seed() {
    const excelPath = path.join(__dirname, '../default_injuries.xlsx');
    
    try {
        // Check if file exists
        await fs.access(excelPath);
    } catch {
        console.error(`[Seed] Error: default_injuries.xlsx not found at ${excelPath}`);
        process.exit(1);
    }

    console.log(`[Seed] Reading excel file from ${excelPath}...`);
    try {
        const fileBuffer = await fs.readFile(excelPath);
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false });

        if (rows.length < 1) {
            console.error('[Seed] Error: Excel file is empty.');
            process.exit(1);
        }

        const headers = rows[0];
        if (!headers || headers[0] !== 'Region' || headers[1] !== 'Injury Type' || headers[2] !== 'Diagnosis') {
            console.error('[Seed] Error: Invalid headers. Expected "Region", "Injury Type", "Diagnosis".');
            process.exit(1);
        }

        console.log('[Seed] Parsing rows...');
        const items = [];
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;
            
            const region = row[0]?.toString().trim();
            const injuryType = row[1]?.toString().trim();
            const diagnosis = row[2]?.toString().trim();

            if (region && injuryType && diagnosis) {
                items.push({ region, injuryType, diagnosis });
            }
        }

        console.log(`[Seed] Found ${items.length} valid rows.`);
        
        const client = await db.connect();
        try {
            await client.query('BEGIN');
            
            console.log('[Seed] Deleting existing global injury master data...');
            await client.query('DELETE FROM injury_master_data WHERE organization_id IS NULL');

            console.log('[Seed] Inserting new global records...');
            let insertedCount = 0;
            for (const item of items) {
                // Check to avoid duplicate records if index check is required
                const check = await client.query(
                    `SELECT id FROM injury_master_data 
                     WHERE organization_id IS NULL 
                       AND region = $1 
                       AND injury_type = $2 
                       AND diagnosis = $3`,
                    [item.region, item.injuryType, item.diagnosis]
                );

                if (check.rows.length === 0) {
                    await client.query(
                        `INSERT INTO injury_master_data (organization_id, region, injury_type, diagnosis) 
                         VALUES (NULL, $1, $2, $3)`,
                        [item.region, item.injuryType, item.diagnosis]
                    );
                    insertedCount++;
                }
            }

            await client.query('COMMIT');
            console.log(`[Seed] Seeding completed. Successfully seeded ${insertedCount} global records.`);
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('[Seed] Seeding failed, rolled back transactions:', error);
        } finally {
            client.release();
            db.end();
        }
    } catch (err) {
        console.error('[Seed] General error during seeding execution:', err);
        process.exit(1);
    }
}

seed();
