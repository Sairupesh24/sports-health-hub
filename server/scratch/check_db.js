import { db } from '../db.js';

async function checkEntitlements() {
    try {
        console.log('--- CHECKING ENTITLEMENTS ---');
        const entitlements = await db.query('SELECT * FROM cliententitlements');
        console.log(`Found ${entitlements.rows.length} entitlements:`);
        console.log(JSON.stringify(entitlements.rows, null, 2));

        console.log('\n--- CHECKING BILL ITEMS ---');
        const billItems = await db.query('SELECT * FROM billitems');
        console.log(`Found ${billItems.rows.length} bill items:`);
        console.log(JSON.stringify(billItems.rows, null, 2));

        console.log('\n--- CHECKING PACKAGE SERVICES ---');
        const pkgServices = await db.query('SELECT * FROM packageservices');
        console.log(`Found ${pkgServices.rows.length} package services:`);
        console.log(JSON.stringify(pkgServices.rows, null, 2));

    } catch (error) {
        console.error('Database query failed:', error.message);
    }
}

checkEntitlements();
