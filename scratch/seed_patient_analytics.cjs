const { db } = require('../server/db.js');

async function seed() {
  console.log('[SEED] Starting patient analytics data enrichment...');

  try {
    const orgRes = await db.query('SELECT id FROM organizations LIMIT 1');
    const orgId = orgRes.rows[0].id;

    // 1. Fetch clients with null athlete_type or sport
    const clientsRes = await db.query('SELECT id, first_name, last_name FROM clients WHERE athlete_type IS NULL OR sport IS NULL OR org_name IS NULL LIMIT 1200');
    console.log(`[SEED] Found ${clientsRes.rows.length} clients to enrich with realistic data.`);

    const sports = ['Badminton', 'Cricket', 'Tennis', 'Football', 'Athletics', 'Swimming', 'Basketball'];
    const athleteLevels = ['Elite / International', 'National', 'State', 'Club / Academy', 'Recreational'];
    const generalOccupations = ['Corporate Professional', 'Software Engineer', 'Business Executive', 'Student', 'Homemaker', 'Senior Citizen'];
    
    const partnerOrgs = [
      'Pullela Gopichand Badminton Academy',
      'Hyderabad Cricket Association (HCA)',
      'Tata Trusts Sports Foundation',
      'Telangana Badminton Association',
      'Pro Badminton League (PBL)',
      'Infosys Corporate Wellness',
      'Apollo Corporate Health',
      'Army Sports Institute',
      'Secunderabad Club',
      'Kotla Vijaya Bhaskara Reddy Stadium'
    ];

    const referralSources = [
      'Dr. Dinshaw Pardiwala (Orthopedics)',
      'Coach Pullela Gopichand',
      'Dr. Mir Zia-Ur-Rahman (Sports Physician)',
      'Self / Direct Walk-in',
      'Website & Google Search',
      'Instagram / Social Media',
      'Word of Mouth / Peer',
      'Corporate Health Tie-up'
    ];

    let athleteCount = 0;
    let genPopCount = 0;

    for (let i = 0; i < clientsRes.rows.length; i++) {
      const c = clientsRes.rows[i];
      const isAthlete = (i % 10) < 5; // 50% Athletes, 50% General Population

      let athlete_type = null;
      let sport = null;
      let occupation = null;
      let org_name = null;
      const referral_source = referralSources[i % referralSources.length];

      if (isAthlete) {
        athleteCount++;
        athlete_type = athleteLevels[i % athleteLevels.length];
        sport = sports[i % sports.length];
        occupation = 'Athlete';
        // 75% of athletes belong to a sports organization
        if (i % 4 !== 0) {
          org_name = partnerOrgs[i % 5]; // first 5 are sports orgs
        }
      } else {
        genPopCount++;
        occupation = generalOccupations[i % generalOccupations.length];
        // 35% of general pop belong to corporate or club tie-ups
        if (i % 3 === 0) {
          org_name = partnerOrgs[5 + (i % 5)]; // corporate & community clubs
        }
      }

      await db.query(`
        UPDATE clients 
        SET athlete_type = $1, sport = $2, occupation = $3, org_name = $4, referral_source = $5 
        WHERE id = $6
      `, [athlete_type, sport, occupation, org_name, referral_source, c.id]);
    }

    console.log(`[SEED] Enriched ${athleteCount} Athletes and ${genPopCount} General Population clients.`);

    // 2. Fetch available services to link sessions
    const servicesRes = await db.query('SELECT id, name FROM services');
    const physioService = servicesRes.rows.find(s => s.name.toLowerCase().includes('physio')) || servicesRes.rows[0];
    const trainingService = servicesRes.rows.find(s => s.name.toLowerCase().includes('training')) || servicesRes.rows[1] || servicesRes.rows[0];
    const assessmentService = servicesRes.rows.find(s => s.name.toLowerCase().includes('assessment')) || servicesRes.rows[2] || servicesRes.rows[0];
    const nutritionService = servicesRes.rows.find(s => s.name.toLowerCase().includes('nutrition')) || null;

    // 3. Ensure we have cross-sell sessions in recent months (April to September 2026)
    // Select 150 clients to have multiple sessions across Physio + Training + Nutrition
    const activeClientsRes = await db.query('SELECT id FROM clients WHERE athlete_type IS NOT NULL LIMIT 100');
    console.log(`[SEED] Creating cross-disciplinary sessions for ${activeClientsRes.rows.length} clients...`);

    const months = [
      { year: 2026, month: 3 }, // April
      { year: 2026, month: 4 }, // May
      { year: 2026, month: 5 }, // June
      { year: 2026, month: 6 }, // July
      { year: 2026, month: 7 }, // August
      { year: 2026, month: 8 }, // September
    ];

    let sessionInsertCount = 0;
    for (let i = 0; i < activeClientsRes.rows.length; i++) {
      const clientId = activeClientsRes.rows[i].id;
      const m = months[i % months.length];
      const day1 = 5 + (i % 20);
      const day2 = 12 + (i % 15);
      const day3 = 18 + (i % 10);

      const d1 = new Date(Date.UTC(m.year, m.month, day1, 9, 0, 0));
      const d1_end = new Date(Date.UTC(m.year, m.month, day1, 10, 0, 0));

      const d2 = new Date(Date.UTC(m.year, m.month, day2, 11, 0, 0));
      const d2_end = new Date(Date.UTC(m.year, m.month, day2, 12, 0, 0));

      // Session 1: Physiotherapy
      await db.query(`
        INSERT INTO sessions (
          organization_id, client_id, service_id, service_type, scheduled_start, scheduled_end, status
        ) VALUES ($1, $2, $3, $4, $5, $6, 'Completed')
      `, [orgId, clientId, physioService.id, physioService.name, d1, d1_end]);
      sessionInsertCount++;

      // Session 2: Strength & Conditioning / Training (Cross-sell!)
      await db.query(`
        INSERT INTO sessions (
          organization_id, client_id, service_id, service_type, scheduled_start, scheduled_end, status
        ) VALUES ($1, $2, $3, $4, $5, $6, 'Completed')
      `, [orgId, clientId, trainingService.id, trainingService.name, d2, d2_end]);
      sessionInsertCount++;

      // Session 3 (for 35% of clients): Nutrition or Performance Assessment
      if (i % 3 === 0) {
        const d3 = new Date(Date.UTC(m.year, m.month, day3, 14, 0, 0));
        const d3_end = new Date(Date.UTC(m.year, m.month, day3, 15, 0, 0));
        const srv = (nutritionService && i % 2 === 0) ? nutritionService : assessmentService;
        await db.query(`
          INSERT INTO sessions (
            organization_id, client_id, service_id, service_type, scheduled_start, scheduled_end, status
          ) VALUES ($1, $2, $3, $4, $5, $6, 'Completed')
        `, [orgId, clientId, srv.id, srv.name, d3, d3_end]);
        sessionInsertCount++;
      }
    }

    console.log(`[SEED] Created ${sessionInsertCount} sessions demonstrating cross-sell across disciplines.`);
    console.log('[SEED] Data enrichment complete!');
  } catch (err) {
    console.error('[SEED ERROR]', err);
  } finally {
    process.exit();
  }
}

seed();
