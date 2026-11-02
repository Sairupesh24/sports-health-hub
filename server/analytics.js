import express from 'express';
import { prisma } from './prisma.js';
import { requireAuth } from './middleware.js';
import { db } from './db.js';

const router = express.Router();

function parseTimeToMins(val) {
  if (val instanceof Date) {
    return val.getUTCHours() * 60 + val.getUTCMinutes();
  }
  const str = String(val);
  if (str.includes('T')) {
    const d = new Date(str);
    return d.getUTCHours() * 60 + d.getUTCMinutes();
  }
  const parts = str.split(':');
  if (parts.length >= 2) {
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }
  return null;
}

function getShiftHours(schedule) {
  if (!schedule) return 8;
  const startMins = parseTimeToMins(schedule.shiftStart || schedule.shift_start);
  const endMins = parseTimeToMins(schedule.shiftEnd || schedule.shift_end);
  if (startMins === null || endMins === null) return 8;
  let diff = (endMins - startMins) / 60;
  if (diff <= 0) diff += 24;
  return diff;
}

function getWorkingDaysCount(startDate, endDate) {
  let count = 0;
  const cur = new Date(startDate.getTime());
  const end = new Date(endDate.getTime());
  
  // Normalize dates to midnight to avoid offset issues
  cur.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(0, 0, 0, 0);
  
  while (cur <= end) {
    const day = cur.getUTCDay();
    if (day !== 0 && day !== 6) { // Exclude Sundays (0) and Saturdays (6)
      count++;
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count > 0 ? count : 1; // Return at least 1 day to prevent division by zero
}

function calculateMergedBookedHours(sessions) {
  if (!sessions || sessions.length === 0) return 0;

  const intervals = sessions
    .map(s => {
      const start = new Date(s.scheduledStart || s.scheduled_start).getTime();
      const end = new Date(s.scheduledEnd || s.scheduled_end).getTime();
      if (isNaN(start) || isNaN(end) || start >= end) return null;
      return { start, end };
    })
    .filter(Boolean);

  if (intervals.length === 0) return 0;

  intervals.sort((a, b) => a.start - b.start);

  const merged = [intervals[0]];
  for (let i = 1; i < intervals.length; i++) {
    const last = merged[merged.length - 1];
    const current = intervals[i];

    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push(current);
    }
  }

  const totalMs = merged.reduce((acc, inv) => acc + (inv.end - inv.start), 0);
  return totalMs / (1000 * 60 * 60);
}

// GET /api/analytics/managerial-view
router.get('/managerial-view', requireAuth, async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const userRole = req.user.role;
    const userId = req.user.id;

    // RBAC check: allow admin, foe, hr_manager, manager OR check explicit has_analytics_access flag
    const allowedRoles = ['admin', 'foe', 'hr_manager', 'manager'];
    let isAuthorized = allowedRoles.includes(userRole);

    if (!isAuthorized) {
      const profileCheck = await db.query(
        'SELECT has_analytics_access FROM profiles WHERE id = $1 AND organization_id = $2',
        [userId, orgId]
      );
      if (profileCheck.rows.length > 0 && profileCheck.rows[0].has_analytics_access === true) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges to view managerial analytics' });
    }

    // Date range parsing (default to current month)
    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const startDate = req.query.startDate ? new Date(req.query.startDate) : defaultStart;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : defaultEnd;

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date range parameters' });
    }

    // Number of standard working days in the date range
    const workingDaysCount = getWorkingDaysCount(startDate, endDate);

    // Fetch approved staff profiles
    const staff = await prisma.profile.findMany({
      where: {
        organizationId: orgId,
        isApproved: true,
        users: {
          role: {
            notIn: ['client', 'athlete']
          }
        }
      },
      include: {
        staffSchedules: true,
        users: {
          select: {
            role: true,
            email: true
          }
        }
      }
    });

    // Fetch active sessions within date range
    const sessions = await prisma.session.findMany({
      where: {
        organizationId: orgId,
        scheduledStart: {
          gte: startDate
        },
        scheduledEnd: {
          lte: endDate
        },
        status: {
          notIn: ['Cancelled']
        }
      }
    });

    // Aggregate metrics per staff member
    const teamData = staff.map(member => {
      // Find sessions where this member is therapist OR scientist
      const memberSessions = sessions.filter(
        s => s.therapistId === member.id || s.scientistId === member.id
      );

      // Booked Hours sum (using merged interval algorithm to handle overlapping sessions)
      const totalHoursBooked = calculateMergedBookedHours(memberSessions);

      // Shift details & base working hours
      const schedule = member.staffSchedules;
      const shiftHoursPerDay = getShiftHours(schedule);
      const totalShiftHours = shiftHoursPerDay * workingDaysCount;

      // Utilization Rate
      const utilizationRate = totalShiftHours > 0 
        ? Math.round((totalHoursBooked / totalShiftHours) * 100 * 10) / 10 
        : 0;

      const sStart = schedule ? (schedule.shiftStart || schedule.shift_start) : null;
      const sEnd = schedule ? (schedule.shiftEnd || schedule.shift_end) : null;

      return {
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.users.email,
        role: member.users.role,
        profession: member.profession || 'Staff',
        slotsBooked: memberSessions.length,
        totalHoursBooked: Math.round(totalHoursBooked * 10) / 10,
        shiftStart: schedule ? (sStart instanceof Date ? sStart.toISOString().split('T')[1].substring(0, 5) : String(sStart || '08:00').substring(0, 5)) : '08:00',
        shiftEnd: schedule ? (sEnd instanceof Date ? sEnd.toISOString().split('T')[1].substring(0, 5) : String(sEnd || '17:00').substring(0, 5)) : '17:00',
        shiftHoursPerDay: Math.round(shiftHoursPerDay * 10) / 10,
        totalShiftHours: Math.round(totalShiftHours * 10) / 10,
        utilizationRate
      };
    });

    // Overall Organization metrics
    const totalSlotsBooked = teamData.reduce((acc, t) => acc + t.slotsBooked, 0);
    const totalHoursBooked = teamData.reduce((acc, t) => acc + t.totalHoursBooked, 0);
    const totalShiftHours = teamData.reduce((acc, t) => acc + t.totalShiftHours, 0);
    const avgUtilizationRate = totalShiftHours > 0
      ? Math.round((totalHoursBooked / totalShiftHours) * 100 * 10) / 10
      : 0;

    res.json({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      workingDays: workingDaysCount,
      summary: {
        totalSlotsBooked,
        totalHoursBooked: Math.round(totalHoursBooked * 10) / 10,
        totalShiftHours: Math.round(totalShiftHours * 10) / 10,
        avgUtilizationRate
      },
      teamData
    });
  } catch (error) {
    console.error('Error fetching managerial analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper for RBAC on all analytics routes
async function checkAnalyticsAuth(user) {
  const allowedRoles = ['admin', 'foe', 'hr_manager', 'manager', 'super_admin'];
  if (allowedRoles.includes(user.role)) return true;
  const profileCheck = await db.query(
    'SELECT has_analytics_access FROM profiles WHERE id = $1 AND organization_id = $2',
    [user.id, user.organization_id]
  );
  return profileCheck.rows.length > 0 && profileCheck.rows[0].has_analytics_access === true;
}

function parseAnalyticsDateRange(req) {
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  let startDate = req.query.startDate ? new Date(req.query.startDate) : defaultStart;
  let endDate = req.query.endDate ? new Date(req.query.endDate) : defaultEnd;

  if (isNaN(startDate.getTime())) startDate = defaultStart;
  if (isNaN(endDate.getTime())) endDate = defaultEnd;

  if (req.query.startDate && !req.query.startDate.includes('T')) {
    startDate.setUTCHours(0, 0, 0, 0);
  }
  if (req.query.endDate && !req.query.endDate.includes('T')) {
    endDate.setUTCHours(23, 59, 59, 999);
  }

  return { startDate, endDate };
}

// -------------------------------------------------------------
// GET /api/analytics/patient-tracking
// Returns acquisition velocity, population profiling, sports, and demographics
// -------------------------------------------------------------
router.get('/patient-tracking', requireAuth, async (req, res) => {
  try {
    const isAuthorized = await checkAnalyticsAuth(req.user);
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges to view patient tracking analytics' });
    }

    const orgId = req.user.organization_id;
    const { startDate, endDate } = parseAnalyticsDateRange(req);
    const populationFilter = req.query.populationFilter || 'all'; // 'all' | 'athlete' | 'general'

    // Calculate prior period for delta comparison
    const durationMs = endDate.getTime() - startDate.getTime();
    const priorStart = new Date(startDate.getTime() - durationMs);
    const priorEnd = new Date(startDate.getTime() - 1);

    // Filter condition for population
    let popClause = '';
    if (populationFilter === 'athlete') {
      popClause = " AND (occupation = 'Athlete' OR athlete_type IS NOT NULL)";
    } else if (populationFilter === 'general') {
      popClause = " AND ((occupation != 'Athlete' OR occupation IS NULL) AND athlete_type IS NULL)";
    }

    // 1. Current Period Summary
    const curSummaryRes = await db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE occupation = 'Athlete' OR athlete_type IS NOT NULL) as athletes,
        COUNT(*) FILTER (WHERE (occupation != 'Athlete' OR occupation IS NULL) AND athlete_type IS NULL) as gen_pop,
        COUNT(DISTINCT org_name) FILTER (WHERE org_name IS NOT NULL AND org_name != '') as orgs_count
      FROM clients
      WHERE organization_id = $1
        AND registered_on >= $2
        AND registered_on <= $3
        ${popClause}
    `, [orgId, startDate, endDate]);

    // 2. Prior Period Summary
    const priorSummaryRes = await db.query(`
      SELECT COUNT(*) as total
      FROM clients
      WHERE organization_id = $1
        AND registered_on >= $2
        AND registered_on <= $3
        ${popClause}
    `, [orgId, priorStart, priorEnd]);

    const totalReg = parseInt(curSummaryRes.rows[0].total || 0, 10);
    const priorReg = parseInt(priorSummaryRes.rows[0].total || 0, 10);
    const athletesCount = parseInt(curSummaryRes.rows[0].athletes || 0, 10);
    const genPopCount = parseInt(curSummaryRes.rows[0].gen_pop || 0, 10);
    const orgsCount = parseInt(curSummaryRes.rows[0].orgs_count || 0, 10);

    let growthRate = 0;
    if (priorReg > 0) {
      growthRate = Math.round(((totalReg - priorReg) / priorReg) * 1000) / 10;
    } else if (totalReg > 0) {
      growthRate = 100;
    }

    // 3. Time Series Velocity
    let truncUnit = 'month';
    const daySpan = durationMs / (1000 * 60 * 60 * 24);
    if (daySpan <= 35) {
      truncUnit = 'day';
    } else if (daySpan <= 120) {
      truncUnit = 'week';
    }

    const timelineRes = await db.query(`
      SELECT 
        DATE_TRUNC('${truncUnit}', registered_on) as bucket,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE occupation = 'Athlete' OR athlete_type IS NOT NULL) as athletes,
        COUNT(*) FILTER (WHERE (occupation != 'Athlete' OR occupation IS NULL) AND athlete_type IS NULL) as gen_pop
      FROM clients
      WHERE organization_id = $1
        AND registered_on >= $2
        AND registered_on <= $3
        ${popClause}
      GROUP BY bucket
      ORDER BY bucket ASC
    `, [orgId, startDate, endDate]);

    const timeline = timelineRes.rows.map(r => ({
      date: r.bucket,
      label: r.bucket ? new Date(r.bucket).toLocaleDateString('en-US', {
        month: 'short',
        day: truncUnit === 'day' ? 'numeric' : undefined,
        year: truncUnit === 'month' ? 'numeric' : undefined
      }) : 'N/A',
      total: parseInt(r.total, 10),
      athletes: parseInt(r.athletes, 10),
      genPop: parseInt(r.gen_pop, 10)
    }));

    // 4. Sports Breakdown
    const sportsRes = await db.query(`
      SELECT 
        COALESCE(sport, 'Other / Unspecified') as sport,
        COUNT(*) as count
      FROM clients
      WHERE organization_id = $1
        AND registered_on >= $2
        AND registered_on <= $3
        AND sport IS NOT NULL
        ${popClause}
      GROUP BY sport
      ORDER BY count DESC
      LIMIT 10
    `, [orgId, startDate, endDate]);

    const sports = sportsRes.rows.map(s => ({
      sport: s.sport,
      count: parseInt(s.count, 10),
      percentage: totalReg > 0 ? Math.round((parseInt(s.count, 10) / totalReg) * 100) : 0
    }));

    // 5. Athlete Level / Tier Breakdown
    const levelsRes = await db.query(`
      SELECT 
        COALESCE(athlete_type, 'Not Specified') as level,
        COUNT(*) as count
      FROM clients
      WHERE organization_id = $1
        AND registered_on >= $2
        AND registered_on <= $3
        AND (occupation = 'Athlete' OR athlete_type IS NOT NULL)
      GROUP BY level
      ORDER BY count DESC
    `, [orgId, startDate, endDate]);

    const athleteLevels = levelsRes.rows.map(l => ({
      level: l.level,
      count: parseInt(l.count, 10),
      percentage: athletesCount > 0 ? Math.round((parseInt(l.count, 10) / athletesCount) * 100) : 0
    }));

    // 6. Age Demographics
    const ageRes = await db.query(`
      SELECT 
        CASE 
          WHEN age < 18 THEN '< 18 (Junior / Youth)'
          WHEN age BETWEEN 18 AND 25 THEN '18-25 (Young Adult)'
          WHEN age BETWEEN 26 AND 40 THEN '26-40 (Prime Adult)'
          WHEN age BETWEEN 41 AND 60 THEN '41-60 (Mid-Career)'
          WHEN age > 60 THEN '60+ (Senior Care)'
          ELSE 'Not Specified'
        END as age_group,
        COUNT(*) as count
      FROM clients
      WHERE organization_id = $1
        AND registered_on >= $2
        AND registered_on <= $3
        ${popClause}
      GROUP BY age_group
      ORDER BY count DESC
    `, [orgId, startDate, endDate]);

    const ageBuckets = ageRes.rows.map(a => ({
      group: a.age_group,
      count: parseInt(a.count, 10),
      percentage: totalReg > 0 ? Math.round((parseInt(a.count, 10) / totalReg) * 100) : 0
    }));

    // 7. Gender Split
    const genderRes = await db.query(`
      SELECT 
        COALESCE(NULLIF(TRIM(gender), ''), 'Not Specified') as gender,
        COUNT(*) as count
      FROM clients
      WHERE organization_id = $1
        AND registered_on >= $2
        AND registered_on <= $3
        ${popClause}
      GROUP BY gender
      ORDER BY count DESC
    `, [orgId, startDate, endDate]);

    const genderSplit = genderRes.rows.map(g => ({
      gender: g.gender,
      count: parseInt(g.count, 10),
      percentage: totalReg > 0 ? Math.round((parseInt(g.count, 10) / totalReg) * 100) : 0
    }));

    // 8. Referral / Acquisition Channels
    const referralRes = await db.query(`
      SELECT 
        COALESCE(NULLIF(TRIM(referral_source), ''), 'Direct / Walk-in') as source,
        COUNT(*) as count
      FROM clients
      WHERE organization_id = $1
        AND registered_on >= $2
        AND registered_on <= $3
        ${popClause}
      GROUP BY source
      ORDER BY count DESC
      LIMIT 8
    `, [orgId, startDate, endDate]);

    const acquisitionChannels = referralRes.rows.map(r => ({
      source: r.source,
      count: parseInt(r.count, 10),
      percentage: totalReg > 0 ? Math.round((parseInt(r.count, 10) / totalReg) * 100) : 0
    }));

    // 9. Quick Cross-Sell rate in this period
    const crossSellQuick = await db.query(`
      WITH active_clients AS (
        SELECT client_id, COUNT(DISTINCT service_type) as disciplines
        FROM sessions
        WHERE organization_id = $1
          AND scheduled_start >= $2
          AND scheduled_start <= $3
          AND status NOT IN ('Cancelled')
          AND client_id IS NOT NULL
        GROUP BY client_id
      )
      SELECT 
        COUNT(*) as total_active,
        COUNT(*) FILTER (WHERE disciplines >= 2) as cross_sold
      FROM active_clients
    `, [orgId, startDate, endDate]);

    const totalActiveInPeriod = parseInt(crossSellQuick.rows[0]?.total_active || 0, 10);
    const crossSoldInPeriod = parseInt(crossSellQuick.rows[0]?.cross_sold || 0, 10);
    const crossSellRate = totalActiveInPeriod > 0
      ? Math.round((crossSoldInPeriod / totalActiveInPeriod) * 1000) / 10
      : 0;

    res.json({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      summary: {
        totalRegistrations: totalReg,
        priorRegistrations: priorReg,
        growthRate,
        athletesCount,
        athletesPct: totalReg > 0 ? Math.round((athletesCount / totalReg) * 100) : 0,
        genPopCount,
        genPopPct: totalReg > 0 ? Math.round((genPopCount / totalReg) * 100) : 0,
        organizationsCount: orgsCount,
        crossSellRate,
        totalActiveClients: totalActiveInPeriod,
        crossSoldClients: crossSoldInPeriod
      },
      timeline,
      sports,
      athleteLevels,
      ageBuckets,
      genderSplit,
      acquisitionChannels
    });
  } catch (error) {
    console.error('Error fetching patient tracking analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// GET /api/analytics/cross-sell
// Inter-disciplinary adoption, service pairs, and multi-service care journey
// -------------------------------------------------------------
router.get('/cross-sell', requireAuth, async (req, res) => {
  try {
    const isAuthorized = await checkAnalyticsAuth(req.user);
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const orgId = req.user.organization_id;
    const { startDate, endDate } = parseAnalyticsDateRange(req);

    // 1. Client sessions grouped by discipline
    const clientEngagements = await db.query(`
      WITH client_sessions AS (
        SELECT 
          s.client_id,
          c.first_name,
          c.last_name,
          c.uhid,
          c.org_name,
          c.occupation,
          c.sport,
          ARRAY_AGG(DISTINCT s.service_type) as services,
          COUNT(DISTINCT s.service_type) as service_count,
          COUNT(s.id) as total_sessions,
          MAX(s.scheduled_start) as last_session
        FROM sessions s
        JOIN clients c ON s.client_id = c.id
        WHERE s.organization_id = $1
          AND s.scheduled_start >= $2
          AND s.scheduled_start <= $3
          AND s.status NOT IN ('Cancelled')
        GROUP BY s.client_id, c.first_name, c.last_name, c.uhid, c.org_name, c.occupation, c.sport
      )
      SELECT * FROM client_sessions
      ORDER BY service_count DESC, total_sessions DESC
    `, [orgId, startDate, endDate]);

    const rows = clientEngagements.rows;
    const totalActive = rows.length;
    const singleServiceClients = rows.filter(r => parseInt(r.service_count, 10) === 1);
    const dualServiceClients = rows.filter(r => parseInt(r.service_count, 10) === 2);
    const multiServiceClients = rows.filter(r => parseInt(r.service_count, 10) >= 3);

    const crossSoldClients = dualServiceClients.length + multiServiceClients.length;
    const crossSellRate = totalActive > 0 ? Math.round((crossSoldClients / totalActive) * 1000) / 10 : 0;

    // Averages
    const avgSingleSessions = singleServiceClients.length > 0
      ? Math.round((singleServiceClients.reduce((acc, c) => acc + parseInt(c.total_sessions, 10), 0) / singleServiceClients.length) * 10) / 10
      : 0;

    const avgMultiSessions = crossSoldClients > 0
      ? Math.round(([...dualServiceClients, ...multiServiceClients].reduce((acc, c) => acc + parseInt(c.total_sessions, 10), 0) / crossSoldClients) * 10) / 10
      : 0;

    // 2. Identify top cross-sell pairs (e.g. Physio + S&C, Physio + Nutrition, etc.)
    const pairCounts = {};
    rows.forEach(client => {
      const srvs = (client.services || []).sort();
      if (srvs.length >= 2) {
        for (let i = 0; i < srvs.length; i++) {
          for (let j = i + 1; j < srvs.length; j++) {
            const pairKey = `${srvs[i]} + ${srvs[j]}`;
            pairCounts[pairKey] = (pairCounts[pairKey] || 0) + 1;
          }
        }
      }
    });

    const topPairs = Object.entries(pairCounts)
      .map(([pair, count]) => {
        const [source, destination] = pair.split(' + ');
        return {
          pair,
          source,
          destination,
          clientCount: count,
          percentage: totalActive > 0 ? Math.round((count / totalActive) * 100) : 0
        };
      })
      .sort((a, b) => b.clientCount - a.clientCount)
      .slice(0, 8);

    // 3. Overall service volume in this period
    const serviceDistributionRes = await db.query(`
      SELECT 
        s.service_type,
        COUNT(s.id) as sessions_count,
        COUNT(DISTINCT s.client_id) as unique_clients
      FROM sessions s
      WHERE s.organization_id = $1
        AND s.scheduled_start >= $2
        AND s.scheduled_start <= $3
        AND s.status NOT IN ('Cancelled')
        AND s.client_id IS NOT NULL
      GROUP BY s.service_type
      ORDER BY sessions_count DESC
    `, [orgId, startDate, endDate]);

    const serviceDistribution = serviceDistributionRes.rows.map(r => ({
      service: r.service_type,
      sessionsCount: parseInt(r.sessions_count, 10),
      uniqueClients: parseInt(r.unique_clients, 10)
    }));

    // 4. Sample roster of high-value cross-sold clients
    const topCrossSellClients = rows
      .filter(r => parseInt(r.service_count, 10) >= 2)
      .slice(0, 15)
      .map(r => ({
        id: r.client_id,
        name: `${r.first_name || ''} ${r.last_name || ''}`.trim(),
        uhid: r.uhid,
        orgName: r.org_name || 'Individual',
        services: r.services || [],
        serviceCount: parseInt(r.service_count, 10),
        totalSessions: parseInt(r.total_sessions, 10),
        lastSession: r.last_session
      }));

    res.json({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      summary: {
        totalActiveClients: totalActive,
        singleServiceCount: singleServiceClients.length,
        singleServicePct: totalActive > 0 ? Math.round((singleServiceClients.length / totalActive) * 100) : 0,
        dualServiceCount: dualServiceClients.length,
        dualServicePct: totalActive > 0 ? Math.round((dualServiceClients.length / totalActive) * 100) : 0,
        multiServiceCount: multiServiceClients.length,
        multiServicePct: totalActive > 0 ? Math.round((multiServiceClients.length / totalActive) * 100) : 0,
        crossSoldTotal: crossSoldClients,
        crossSellRate,
        avgSingleSessions,
        avgMultiSessions,
        retentionMultiplier: avgSingleSessions > 0 ? Math.round((avgMultiSessions / avgSingleSessions) * 10) / 10 : 1.0
      },
      topPairs,
      serviceDistribution,
      topCrossSellClients
    });
  } catch (error) {
    console.error('Error fetching cross-sell analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// GET /api/analytics/organizations
// Institutional partner directory, client distribution, and active usage
// -------------------------------------------------------------
router.get('/organizations', requireAuth, async (req, res) => {
  try {
    const isAuthorized = await checkAnalyticsAuth(req.user);
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const orgId = req.user.organization_id;
    const { startDate, endDate } = parseAnalyticsDateRange(req);
    const search = req.query.search || '';

    let searchClause = '';
    const params = [orgId, startDate, endDate];
    if (search.trim()) {
      params.push(`%${search.trim()}%`);
      searchClause = ` AND c.org_name ILIKE $${params.length}`;
    }

    // 1. Grouped organization analytics
    const orgsRes = await db.query(`
      SELECT 
        c.org_name,
        COUNT(DISTINCT c.id) as total_clients,
        COUNT(DISTINCT s.client_id) as active_clients_period,
        COUNT(s.id) as total_sessions,
        COUNT(DISTINCT c.id) FILTER (WHERE c.occupation = 'Athlete' OR c.athlete_type IS NOT NULL) as athletes_count,
        COUNT(DISTINCT c.id) FILTER (WHERE (c.occupation != 'Athlete' OR c.occupation IS NULL) AND c.athlete_type IS NULL) as gen_pop_count,
        COALESCE(MODE() WITHIN GROUP (ORDER BY s.service_type), 'Physiotherapy') as dominant_service
      FROM clients c
      LEFT JOIN sessions s ON s.client_id = c.id 
        AND s.scheduled_start >= $2 
        AND s.scheduled_start <= $3
        AND s.status NOT IN ('Cancelled')
      WHERE c.organization_id = $1
        AND c.org_name IS NOT NULL 
        AND c.org_name != ''
        ${searchClause}
      GROUP BY c.org_name
      ORDER BY total_clients DESC
    `, params);

    // 2. High-level totals
    const totalsRes = await db.query(`
      SELECT 
        COUNT(DISTINCT org_name) FILTER (WHERE org_name IS NOT NULL AND org_name != '') as total_orgs,
        COUNT(DISTINCT id) FILTER (WHERE org_name IS NOT NULL AND org_name != '') as institutional_clients,
        COUNT(DISTINCT id) FILTER (WHERE org_name IS NULL OR org_name = '') as individual_clients
      FROM clients
      WHERE organization_id = $1
    `, [orgId]);

    const totalOrgs = parseInt(totalsRes.rows[0]?.total_orgs || 0, 10);
    const institutionalClients = parseInt(totalsRes.rows[0]?.institutional_clients || 0, 10);
    const individualClients = parseInt(totalsRes.rows[0]?.individual_clients || 0, 10);

    const organizations = orgsRes.rows.map(o => ({
      name: o.org_name,
      totalClients: parseInt(o.total_clients, 10),
      activeClientsInPeriod: parseInt(o.active_clients_period || 0, 10),
      totalSessions: parseInt(o.total_sessions || 0, 10),
      athletesCount: parseInt(o.athletes_count, 10),
      genPopCount: parseInt(o.gen_pop_count, 10),
      dominantService: o.dominant_service
    }));

    res.json({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      summary: {
        totalOrganizations: totalOrgs,
        institutionalClients,
        individualClients,
        institutionalPct: (institutionalClients + individualClients) > 0
          ? Math.round((institutionalClients / (institutionalClients + individualClients)) * 100)
          : 0,
        topOrganization: organizations[0]?.name || 'N/A'
      },
      organizations
    });
  } catch (error) {
    console.error('Error fetching organizations analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// GET /api/analytics/organization-clients
// Drill-down roster of all clients registered under a specific organization
// -------------------------------------------------------------
router.get('/organization-clients', requireAuth, async (req, res) => {
  try {
    const isAuthorized = await checkAnalyticsAuth(req.user);
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const orgId = req.user.organization_id;
    const { orgName, search } = req.query;

    if (!orgName) {
      return res.status(400).json({ error: 'Missing required query parameter orgName' });
    }

    let query = `
      SELECT 
        c.id,
        c.first_name,
        c.last_name,
        c.uhid,
        c.gender,
        c.age,
        c.mobile_no,
        c.email,
        c.sport,
        c.athlete_type,
        c.occupation,
        c.registered_on,
        COUNT(s.id) as sessions_completed,
        MAX(s.scheduled_start) as last_session_date
      FROM clients c
      LEFT JOIN sessions s ON s.client_id = c.id AND s.status NOT IN ('Cancelled')
      WHERE c.organization_id = $1
        AND c.org_name = $2
    `;
    const params = [orgId, orgName];

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      query += ` AND (c.first_name ILIKE $${params.length} OR c.last_name ILIKE $${params.length} OR c.uhid ILIKE $${params.length})`;
    }

    query += ` GROUP BY c.id ORDER BY c.registered_on DESC LIMIT 50`;

    const result = await db.query(query, params);

    res.json(result.rows.map(c => ({
      id: c.id,
      name: `${c.first_name || ''} ${c.last_name || ''}`.trim(),
      uhid: c.uhid,
      gender: c.gender,
      age: c.age,
      mobile: c.mobile_no,
      email: c.email,
      sport: c.sport || 'General Fitness',
      athleteType: c.athlete_type || c.occupation || 'Standard',
      registeredOn: c.registered_on,
      sessionsCompleted: parseInt(c.sessions_completed || 0, 10),
      lastSessionDate: c.last_session_date
    })));
  } catch (error) {
    console.error('Error fetching organization clients:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// REPORTS & ANALYTICS CONSOLE ENDPOINTS
// ==========================================

// GET /api/analytics/reports/options
// Returns dynamic filter options: therapists, sports scientists, billing staff, session types, payment methods
router.get('/reports/options', requireAuth, async (req, res) => {
  try {
    const orgId = req.user.organization_id;

    // 1. Therapists (Physiotherapists, Sports Physicians, Clinical Consultants)
    const therapistsRes = await db.query(`
      SELECT p.id, p.first_name, p.last_name, p.profession, p.ams_role, u.role
      FROM profiles p
      JOIN users u ON p.id = u.id
      WHERE p.organization_id = $1 AND (p.is_approved = true OR p.is_approved IS NULL)
        AND (
          p.profession ILIKE '%physio%' OR 
          p.profession ILIKE '%therapist%' OR 
          p.profession ILIKE '%consultant%' OR 
          p.profession ILIKE '%doctor%' OR 
          p.profession ILIKE '%physician%' OR 
          u.role IN ('consultant', 'sports_physician', 'physiotherapist', 'massage_therapist')
        )
      ORDER BY p.first_name ASC, p.last_name ASC
    `, [orgId]);

    // 2. Sports Scientists / Strength & Conditioning coaches
    const scientistsRes = await db.query(`
      SELECT p.id, p.first_name, p.last_name, p.profession, p.ams_role, u.role
      FROM profiles p
      JOIN users u ON p.id = u.id
      WHERE p.organization_id = $1 AND (p.is_approved = true OR p.is_approved IS NULL)
        AND (
          p.profession ILIKE '%scientist%' OR 
          p.profession ILIKE '%strength%' OR 
          p.profession ILIKE '%conditioning%' OR 
          p.profession ILIKE '%coach%' OR 
          p.ams_role ILIKE '%scientist%' OR 
          u.role = 'sports_scientist'
        )
      ORDER BY p.first_name ASC, p.last_name ASC
    `, [orgId]);

    // 3. Billing Staff / Users who have generated or recorded bills
    const staffRes = await db.query(`
      SELECT DISTINCT p.id, p.first_name, p.last_name, p.profession, u.role
      FROM profiles p
      JOIN users u ON p.id = u.id
      WHERE p.organization_id = $1 AND p.is_approved = true
        AND (
          u.role IN ('admin', 'super_admin', 'foe', 'manager') OR
          p.id IN (SELECT DISTINCT billed_by_id FROM bills WHERE organization_id = $1 AND billed_by_id IS NOT NULL)
        )
      ORDER BY p.first_name ASC, p.last_name ASC
    `, [orgId]);

    // 4. Clinical Services & Packages
    const servicesRes = await db.query(`
      SELECT id, name, category, price FROM services WHERE organization_id = $1 AND is_active = true
      UNION
      SELECT id, name, 'Package' as category, total_price as price FROM servicepackages WHERE organization_id = $1 AND is_active = true
      ORDER BY name ASC
    `, [orgId]);

    // 5. Active Clients list for filter dropdowns
    const clientsRes = await db.query(`
      SELECT id, uhid, honorific, first_name, last_name, mobile_no, sport
      FROM clients
      WHERE organization_id = $1 AND deleted_at IS NULL
      ORDER BY first_name ASC, last_name ASC
      LIMIT 1000
    `, [orgId]);

    res.json({
      clients: clientsRes.rows.map(c => ({
        id: c.id,
        uhid: c.uhid || '',
        name: `${c.honorific ? c.honorific + ' ' : ''}${c.first_name || ''} ${c.last_name || ''}`.trim(),
        sport: c.sport || 'General'
      })),
      therapists: therapistsRes.rows.map(t => ({
        id: t.id,
        name: `${t.first_name || ''} ${t.last_name || ''}`.trim(),
        profession: t.profession || 'Physiotherapist',
        role: t.role
      })),
      sportsScientists: scientistsRes.rows.map(s => ({
        id: s.id,
        name: `${s.first_name || ''} ${s.last_name || ''}`.trim(),
        profession: s.profession || s.ams_role || 'Sports Scientist',
        role: s.role
      })),
      billingStaff: staffRes.rows.map(st => ({
        id: st.id,
        name: `${st.first_name || ''} ${st.last_name || ''}`.trim(),
        role: st.role || 'Staff'
      })),
      services: servicesRes.rows.map(s => ({
        id: s.id,
        name: s.name,
        category: s.category || 'General',
        price: parseFloat(s.price || 0)
      })),
      paymentMethods: [
        'UPI / QR Code',
        'Cash',
        'Credit Card',
        'Debit Card',
        'Net Banking / NEFT',
        'Cheque',
        'Insurance / TPA',
        'Online Gateway'
      ],
      sessionTypes: {
        physiotherapy: [
          'Initial Physiotherapy Assessment',
          'Follow-up Session',
          'Manual Therapy',
          'Dry Needling',
          'Rehabilitation Exercise',
          'Electrotherapy / Ultrasound',
          'Spine Decompression',
          'Hydrotherapy / Aquatic Rehab',
          'Sports Injury Consultation'
        ],
        sportsScience: [
          'Strength & Conditioning',
          'VO2 Max & Aerobic Capacity Testing',
          'Biomechanical Movement Assessment',
          'Force Plate & Jump Testing',
          'Speed & Agility Session',
          'Return-to-Play Performance Testing',
          'Recovery & Regeneration Session',
          'Load Management / Velocity-Based Training'
        ]
      }
    });
  } catch (error) {
    console.error('Error fetching report options:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/analytics/reports/billing
// Generates Billing reports: service-wise, cancelled-invoices, user-wise, payment-mode-wise, advance-collection
router.get('/reports/billing', requireAuth, async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const {
      report_type = 'service-wise',
      start_date,
      end_date,
      staff_id,
      payment_method,
      status,
      search
    } = req.query;

    const startDate = start_date || '2000-01-01';
    const endDate = end_date || '2099-12-31';

    if (report_type === 'cancelled-invoices') {
      let query = `
        SELECT 
          b.id as invoice_id,
          COALESCE(b.date, b.created_at::date) as invoice_date,
          b.created_at,
          b.updated_at as cancelled_date,
          b.status as invoice_status,
          COALESCE(b.payment_method, 'N/A') as payment_mode,
          COALESCE(b.transaction_id, '-') as transaction_id,
          COALESCE(b.amount, 0) as gross_amount,
          COALESCE(b.discount, 0) as discount_amount,
          COALESCE(b.tax_amount, 0) as tax_amount,
          COALESCE(b.total, 0) as total_amount,
          COALESCE(b.notes, 'Invoice cancelled by billing desk') as cancellation_reason,
          c.id as client_id,
          c.uhid as client_uhid,
          TRIM(CONCAT(COALESCE(c.honorific, ''), ' ', COALESCE(c.first_name, ''), ' ', COALESCE(c.middle_name, ''), ' ', COALESCE(c.last_name, ''))) as client_name,
          c.mobile_no as client_mobile,
          COALESCE(TRIM(CONCAT(st.first_name, ' ', st.last_name)), b.billed_by_name, b.billing_staff_name, 'Admin') as billed_by_name,
          b.billed_by_id
        FROM bills b
        LEFT JOIN clients c ON b.client_id = c.id
        LEFT JOIN profiles st ON b.billed_by_id = st.id
        WHERE b.organization_id = $1
          AND (b.status ILIKE '%cancel%' OR b.deleted_at IS NOT NULL)
          AND COALESCE(b.date, b.created_at::date) >= $2::date
          AND COALESCE(b.date, b.created_at::date) <= $3::date
      `;
      const params = [orgId, startDate, endDate];

      if (staff_id && staff_id !== 'all') {
        params.push(staff_id);
        query += ` AND b.billed_by_id = $${params.length}`;
      }
      if (search && search.trim()) {
        params.push(`%${search.trim()}%`);
        query += ` AND (c.first_name ILIKE $${params.length} OR c.last_name ILIKE $${params.length} OR c.uhid ILIKE $${params.length} OR b.id::text ILIKE $${params.length})`;
      }

      query += ` ORDER BY b.created_at DESC`;

      const result = await db.query(query, params);
      const rows = result.rows.map(r => ({
        ...r,
        gross_amount: parseFloat(r.gross_amount || 0),
        discount_amount: parseFloat(r.discount_amount || 0),
        tax_amount: parseFloat(r.tax_amount || 0),
        total_amount: parseFloat(r.total_amount || 0),
        invoice_no: `INV-${String(r.invoice_id).substring(0, 8).toUpperCase()}`
      }));

      const totalCancelledCount = rows.length;
      const totalCancelledAmount = rows.reduce((sum, r) => sum + r.total_amount, 0);

      return res.json({
        reportType: 'cancelled-invoices',
        title: 'Cancelled Invoice Details Report',
        timeframe: { start: startDate, end: endDate },
        summary: {
          totalCount: totalCancelledCount,
          totalAmount: totalCancelledAmount,
          averageCancelledAmount: totalCancelledCount > 0 ? Math.round(totalCancelledAmount / totalCancelledCount) : 0
        },
        data: rows
      });
    }

    if (report_type === 'user-wise') {
      let query = `
        SELECT 
          b.id as invoice_id,
          COALESCE(b.date, b.created_at::date) as invoice_date,
          b.created_at,
          b.status as invoice_status,
          COALESCE(b.payment_method, 'Cash') as payment_mode,
          COALESCE(b.amount, 0) as gross_amount,
          COALESCE(b.discount, 0) as discount_amount,
          COALESCE(b.tax_amount, 0) as tax_amount,
          COALESCE(b.total, 0) as total_amount,
          COALESCE(b.transaction_id, '-') as transaction_id,
          c.id as client_id,
          c.uhid as client_uhid,
          TRIM(CONCAT(COALESCE(c.honorific, ''), ' ', COALESCE(c.first_name, ''), ' ', COALESCE(c.middle_name, ''), ' ', COALESCE(c.last_name, ''))) as client_name,
          COALESCE(b.billed_by_id, '00000000-0000-0000-0000-000000000000'::uuid) as billed_by_id,
          COALESCE(TRIM(CONCAT(st.first_name, ' ', st.last_name)), b.billed_by_name, b.billing_staff_name, 'Front Desk') as billed_by_name
        FROM bills b
        LEFT JOIN clients c ON b.client_id = c.id
        LEFT JOIN profiles st ON b.billed_by_id = st.id
        WHERE b.organization_id = $1
          AND COALESCE(b.date, b.created_at::date) >= $2::date
          AND COALESCE(b.date, b.created_at::date) <= $3::date
      `;
      const params = [orgId, startDate, endDate];

      if (staff_id && staff_id !== 'all') {
        params.push(staff_id);
        query += ` AND b.billed_by_id = $${params.length}`;
      }
      if (status && status !== 'all') {
        params.push(status);
        query += ` AND b.status ILIKE $${params.length}`;
      }
      if (search && search.trim()) {
        params.push(`%${search.trim()}%`);
        query += ` AND (c.first_name ILIKE $${params.length} OR c.last_name ILIKE $${params.length} OR c.uhid ILIKE $${params.length} OR b.id::text ILIKE $${params.length})`;
      }

      query += ` ORDER BY b.created_at DESC`;

      const result = await db.query(query, params);
      const rows = result.rows.map(r => ({
        ...r,
        gross_amount: parseFloat(r.gross_amount || 0),
        discount_amount: parseFloat(r.discount_amount || 0),
        tax_amount: parseFloat(r.tax_amount || 0),
        total_amount: parseFloat(r.total_amount || 0),
        invoice_no: `INV-${String(r.invoice_id).substring(0, 8).toUpperCase()}`
      }));

      // Calculate user breakdown summary
      const userSummaryMap = new Map();
      rows.forEach(r => {
        const key = r.billed_by_id || 'unknown';
        if (!userSummaryMap.has(key)) {
          userSummaryMap.set(key, {
            userId: key,
            userName: r.billed_by_name,
            totalInvoices: 0,
            paidInvoices: 0,
            cancelledInvoices: 0,
            totalBilled: 0,
            totalCollected: 0
          });
        }
        const userStat = userSummaryMap.get(key);
        userStat.totalInvoices++;
        userStat.totalBilled += r.total_amount;
        if (r.invoice_status?.toLowerCase().includes('cancel')) {
          userStat.cancelledInvoices++;
        } else if (r.invoice_status?.toLowerCase() === 'paid') {
          userStat.paidInvoices++;
          userStat.totalCollected += r.total_amount;
        } else {
          userStat.totalCollected += (r.total_amount * 0.5); // Partial or pending
        }
      });

      return res.json({
        reportType: 'user-wise',
        title: 'User-Wise Invoices List & Summary',
        timeframe: { start: startDate, end: endDate },
        userBreakdown: Array.from(userSummaryMap.values()),
        summary: {
          totalInvoices: rows.length,
          totalAmount: rows.reduce((s, r) => s + r.total_amount, 0),
          uniqueUsersCount: userSummaryMap.size
        },
        data: rows
      });
    }

    if (report_type === 'payment-mode-wise') {
      let query = `
        SELECT 
          b.id as invoice_id,
          COALESCE(bp.created_at::date, b.date, b.created_at::date) as payment_date,
          COALESCE(bp.payment_method, b.payment_method, 'Cash') as payment_mode,
          COALESCE(bp.transaction_id, b.transaction_id, '-') as transaction_id,
          COALESCE(bp.amount, b.total, 0) as amount_paid,
          b.total as invoice_total,
          b.status as invoice_status,
          c.id as client_id,
          c.uhid as client_uhid,
          TRIM(CONCAT(COALESCE(c.honorific, ''), ' ', COALESCE(c.first_name, ''), ' ', COALESCE(c.middle_name, ''), ' ', COALESCE(c.last_name, ''))) as client_name,
          COALESCE(TRIM(CONCAT(st.first_name, ' ', st.last_name)), b.billed_by_name, b.billing_staff_name, 'Billing Desk') as collected_by
        FROM bills b
        LEFT JOIN billpayments bp ON bp.bill_id = b.id
        LEFT JOIN clients c ON b.client_id = c.id
        LEFT JOIN profiles st ON COALESCE(bp.recorded_by, b.billed_by_id) = st.id
        WHERE b.organization_id = $1
          AND COALESCE(bp.created_at::date, b.date, b.created_at::date) >= $2::date
          AND COALESCE(bp.created_at::date, b.date, b.created_at::date) <= $3::date
      `;
      const params = [orgId, startDate, endDate];

      if (payment_method && payment_method !== 'all') {
        params.push(`%${payment_method}%`);
        query += ` AND (bp.payment_method ILIKE $${params.length} OR b.payment_method ILIKE $${params.length})`;
      }
      if (search && search.trim()) {
        params.push(`%${search.trim()}%`);
        query += ` AND (c.first_name ILIKE $${params.length} OR c.last_name ILIKE $${params.length} OR c.uhid ILIKE $${params.length} OR bp.transaction_id ILIKE $${params.length})`;
      }

      query += ` ORDER BY COALESCE(bp.created_at, b.created_at) DESC`;

      const result = await db.query(query, params);
      const rows = result.rows.map(r => ({
        ...r,
        amount_paid: parseFloat(r.amount_paid || 0),
        invoice_total: parseFloat(r.invoice_total || 0),
        invoice_no: `INV-${String(r.invoice_id).substring(0, 8).toUpperCase()}`
      }));

      // Mode-wise summary breakdown
      const modeBreakdownMap = new Map();
      let grandTotalCollected = 0;
      rows.forEach(r => {
        const mode = r.payment_mode || 'Cash';
        if (!modeBreakdownMap.has(mode)) {
          modeBreakdownMap.set(mode, {
            mode,
            transactionCount: 0,
            totalCollected: 0
          });
        }
        const stat = modeBreakdownMap.get(mode);
        stat.transactionCount++;
        stat.totalCollected += r.amount_paid;
        grandTotalCollected += r.amount_paid;
      });

      const modeBreakdown = Array.from(modeBreakdownMap.values()).map(m => ({
        ...m,
        percentage: grandTotalCollected > 0 ? Math.round((m.totalCollected / grandTotalCollected) * 100) : 0
      }));

      return res.json({
        reportType: 'payment-mode-wise',
        title: 'Payment Mode Wise Collection Details',
        timeframe: { start: startDate, end: endDate },
        modeBreakdown,
        summary: {
          totalTransactions: rows.length,
          totalCollected: grandTotalCollected
        },
        data: rows
      });
    }

    // Default: 'service-wise' (Service wise invoice details)
    let query = `
      SELECT 
        b.id as invoice_id,
        COALESCE(b.date, b.created_at::date) as invoice_date,
        b.created_at,
        b.status as invoice_status,
        COALESCE(b.payment_method, 'Cash') as payment_mode,
        COALESCE(b.transaction_id, '-') as transaction_id,
        c.id as client_id,
        c.uhid as client_uhid,
        TRIM(CONCAT(COALESCE(c.honorific, ''), ' ', COALESCE(c.first_name, ''), ' ', COALESCE(c.middle_name, ''), ' ', COALESCE(c.last_name, ''))) as client_name,
        c.mobile_no as client_mobile,
        COALESCE(sp.name, s.name, b.notes, 'Clinical Consultation') as service_name,
        COALESCE(s.category, 'Clinical / Package') as service_category,
        1 as quantity,
        COALESCE(bi.amount, b.amount, 0) as unit_price,
        COALESCE(bi.discount, b.discount, 0) as discount_amount,
        COALESCE(bi.tax_amount, b.tax_amount, 0) as tax_amount,
        COALESCE(bi.total, b.total, 0) as total_amount,
        COALESCE(TRIM(CONCAT(st.first_name, ' ', st.last_name)), b.billed_by_name, b.billing_staff_name, 'Staff User') as billed_by_name,
        b.billed_by_id
      FROM bills b
      LEFT JOIN billitems bi ON bi.bill_id = b.id
      LEFT JOIN servicepackages sp ON bi.package_id = sp.id OR b.package_id = sp.id
      LEFT JOIN services s ON sp.id = s.id
      LEFT JOIN clients c ON b.client_id = c.id
      LEFT JOIN profiles st ON b.billed_by_id = st.id
      WHERE b.organization_id = $1
        AND COALESCE(b.date, b.created_at::date) >= $2::date
        AND COALESCE(b.date, b.created_at::date) <= $3::date
    `;
    const params = [orgId, startDate, endDate];

    if (staff_id && staff_id !== 'all') {
      params.push(staff_id);
      query += ` AND b.billed_by_id = $${params.length}`;
    }
    if (payment_method && payment_method !== 'all') {
      params.push(`%${payment_method}%`);
      query += ` AND b.payment_method ILIKE $${params.length}`;
    }
    if (status && status !== 'all') {
      params.push(status);
      query += ` AND b.status ILIKE $${params.length}`;
    }
    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      query += ` AND (c.first_name ILIKE $${params.length} OR c.last_name ILIKE $${params.length} OR c.uhid ILIKE $${params.length} OR sp.name ILIKE $${params.length} OR s.name ILIKE $${params.length} OR b.id::text ILIKE $${params.length})`;
    }

    query += ` ORDER BY b.created_at DESC`;

    const result = await db.query(query, params);
    const rows = result.rows.map(r => ({
      ...r,
      unit_price: parseFloat(r.unit_price || 0),
      discount_amount: parseFloat(r.discount_amount || 0),
      tax_amount: parseFloat(r.tax_amount || 0),
      total_amount: parseFloat(r.total_amount || 0),
      invoice_no: `INV-${String(r.invoice_id).substring(0, 8).toUpperCase()}`
    }));

    const totalInvoices = new Set(rows.map(r => r.invoice_id)).size;
    const totalItems = rows.length;
    const grossTotal = rows.reduce((s, r) => s + r.unit_price, 0);
    const totalDiscount = rows.reduce((s, r) => s + r.discount_amount, 0);
    const totalTax = rows.reduce((s, r) => s + r.tax_amount, 0);
    const netRevenue = rows.reduce((s, r) => s + r.total_amount, 0);

    return res.json({
      reportType: 'service-wise',
      title: 'Service-Wise Invoice Details Report',
      timeframe: { start: startDate, end: endDate },
      summary: {
        totalInvoices,
        totalItems,
        grossTotal,
        totalDiscount,
        totalTax,
        netRevenue
      },
      data: rows
    });
  } catch (error) {
    console.error('Error fetching billing report:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/analytics/reports/sessions
// Generates Physiotherapy sessions & Sports Science sessions reports
// Showing number of sessions done by a therapist/scientist, type of session, duration, status, etc.
router.get('/reports/sessions', requireAuth, async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const {
      module = 'physiotherapy', // 'physiotherapy' | 'sports_science' | 'client'
      start_date,
      end_date,
      staff_id,
      client_id,
      session_type,
      status,
      session_mode,
      search
    } = req.query;

    const startDate = start_date || '2000-01-01';
    const endDate = end_date || '2099-12-31';

    let query = `
      SELECT 
        s.id as session_id,
        s.scheduled_start,
        s.scheduled_end,
        s.actual_start,
        s.actual_end,
        s.service_type,
        COALESCE(s.session_mode, 'Individual') as session_mode,
        s.status,
        s.cancellation_reason,
        s.session_notes,
        s.session_location,
        COALESCE(s.therapist_id, s.scientist_id) as staff_id,
        COALESCE(TRIM(CONCAT(p.first_name, ' ', p.last_name)), 'Unassigned Staff') as staff_name,
        p.profession as staff_profession,
        p.ams_role as staff_role,
        c.id as client_id,
        c.uhid as client_uhid,
        COALESCE(TRIM(CONCAT(COALESCE(c.honorific, ''), ' ', COALESCE(c.first_name, ''), ' ', COALESCE(c.middle_name, ''), ' ', COALESCE(c.last_name, ''))), s.guest_name, 'Guest Patient') as client_name,
        c.mobile_no as client_mobile,
        c.sport as client_sport,
        c.athlete_type as client_athlete_type,
        st.name as service_name,
        st.category as service_category,
        CASE 
          WHEN s.actual_start IS NOT NULL AND s.actual_end IS NOT NULL AND s.actual_end > s.actual_start THEN
            ROUND(EXTRACT(EPOCH FROM (s.actual_end - s.actual_start)) / 60)
          WHEN s.scheduled_start IS NOT NULL AND s.scheduled_end IS NOT NULL AND s.scheduled_end > s.scheduled_start THEN
            ROUND(EXTRACT(EPOCH FROM (s.scheduled_end - s.scheduled_start)) / 60)
          ELSE 45
        END as duration_minutes
      FROM sessions s
      LEFT JOIN clients c ON s.client_id = c.id
      LEFT JOIN profiles p ON COALESCE(s.therapist_id, s.scientist_id) = p.id
      LEFT JOIN services st ON s.service_id = st.id
      WHERE s.organization_id = $1
        AND s.scheduled_start >= $2::timestamptz 
        AND s.scheduled_start < ($3::date + INTERVAL '1 day')::timestamptz
    `;
    const params = [orgId, startDate, endDate];

    // Module categorization
    if (module === 'physiotherapy') {
      query += ` AND (
        s.therapist_id IS NOT NULL OR 
        p.profession ILIKE '%physio%' OR 
        p.profession ILIKE '%consultant%' OR 
        p.profession ILIKE '%doctor%' OR 
        s.service_type ILIKE '%physio%' OR 
        s.service_type ILIKE '%rehab%' OR 
        s.service_type ILIKE '%manual%' OR 
        s.service_type ILIKE '%therapy%'
      )`;
    } else if (module === 'sports_science') {
      query += ` AND (
        s.scientist_id IS NOT NULL OR 
        p.profession ILIKE '%scientist%' OR 
        p.ams_role ILIKE '%scientist%' OR 
        p.profession ILIKE '%coach%' OR 
        s.service_type ILIKE '%strength%' OR 
        s.service_type ILIKE '%conditioning%' OR 
        s.service_type ILIKE '%testing%' OR 
        s.service_type ILIKE '%biomechanic%' OR 
        s.service_type ILIKE '%speed%' OR 
        s.service_type ILIKE '%agility%' OR 
        s.service_type ILIKE '%vo2%'
      )`;
    }

    // Dynamic filters
    if (client_id && client_id !== 'all') {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(client_id);
      if (isUuid) {
        params.push(client_id);
        query += ` AND s.client_id = $${params.length}`;
      } else {
        params.push(client_id);
        query += ` AND (c.uhid = $${params.length} OR CONCAT(COALESCE(c.honorific, ''), ' ', COALESCE(c.first_name, ''), ' ', COALESCE(c.middle_name, ''), ' ', COALESCE(c.last_name, '')) ILIKE $${params.length} OR CONCAT(COALESCE(c.honorific, ''), ' ', COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, '')) ILIKE $${params.length} OR s.guest_name ILIKE $${params.length})`;
      }
    }
    if (staff_id && staff_id !== 'all') {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(staff_id);
      if (isUuid) {
        params.push(staff_id);
        query += ` AND COALESCE(s.therapist_id, s.scientist_id) = $${params.length}`;
      } else {
        params.push(staff_id);
        query += ` AND (CONCAT(p.first_name, ' ', p.last_name) ILIKE $${params.length} OR s.therapist_id::text = $${params.length} OR s.scientist_id::text = $${params.length})`;
      }
    }
    if (session_type && session_type !== 'all') {
      params.push(`%${session_type}%`);
      query += ` AND (s.service_type ILIKE $${params.length} OR st.name ILIKE $${params.length})`;
    }
    if (status && status !== 'all') {
      params.push(status);
      query += ` AND s.status ILIKE $${params.length}`;
    }
    if (session_mode && session_mode !== 'all') {
      params.push(session_mode);
      query += ` AND s.session_mode = $${params.length}`;
    }
    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      query += ` AND (
        c.first_name ILIKE $${params.length} OR 
        c.last_name ILIKE $${params.length} OR 
        c.uhid ILIKE $${params.length} OR 
        p.first_name ILIKE $${params.length} OR 
        p.last_name ILIKE $${params.length} OR 
        s.service_type ILIKE $${params.length}
      )`;
    }

    query += ` ORDER BY s.scheduled_start DESC`;

    const result = await db.query(query, params);

    const rows = result.rows.map(r => {
      let durationMins = parseInt(r.duration_minutes || 45, 10);
      if (isNaN(durationMins) || durationMins <= 0 || durationMins > 480) {
        durationMins = 45;
      }

      const hours = Math.floor(durationMins / 60);
      const remainingMins = durationMins % 60;
      let durationFormatted = '';
      if (hours > 0 && remainingMins > 0) {
        durationFormatted = `${hours}h ${remainingMins}m`;
      } else if (hours > 0) {
        durationFormatted = `${hours}h`;
      } else {
        durationFormatted = `${remainingMins} mins`;
      }

      return {
        ...r,
        duration_minutes: durationMins,
        duration_formatted: durationFormatted,
        instructor_name: r.staff_name,
        instructor_role: r.staff_profession || r.staff_role || 'Instructor',
        service_type: r.service_name || r.service_type || (module === 'physiotherapy' ? 'Physiotherapy Consultation' : (module === 'sports_science' ? 'Strength & Conditioning' : 'Clinical Session'))
      };
    });

    // Compute Staff Breakdown (Sessions done by therapist or sports scientist in selected timeframe)
    const staffBreakdownMap = new Map();
    const clientBreakdownMap = new Map();

    rows.forEach(r => {
      // Staff breakdown
      const staffKey = r.staff_id || 'unassigned';
      if (!staffBreakdownMap.has(staffKey)) {
        staffBreakdownMap.set(staffKey, {
          staffId: staffKey,
          staffName: r.staff_name,
          profession: r.staff_profession || r.staff_role || (module === 'physiotherapy' ? 'Physiotherapist' : (module === 'sports_science' ? 'Sports Scientist' : 'Instructor')),
          totalSessions: 0,
          completedSessions: 0,
          cancelledSessions: 0,
          totalDurationMinutes: 0,
          totalDurationHours: 0,
          uniqueClients: new Set()
        });
      }
      const sStat = staffBreakdownMap.get(staffKey);
      sStat.totalSessions++;
      sStat.totalDurationMinutes += r.duration_minutes;
      if (r.client_id) {
        sStat.uniqueClients.add(r.client_id);
      }

      // Client breakdown (Sessions done for each client)
      const clientKey = r.client_id || 'guest';
      if (!clientBreakdownMap.has(clientKey)) {
        clientBreakdownMap.set(clientKey, {
          clientId: clientKey,
          clientUhid: r.client_uhid || '-',
          clientName: r.client_name,
          clientSport: r.client_sport || 'General',
          totalSessions: 0,
          completedSessions: 0,
          cancelledSessions: 0,
          totalDurationMinutes: 0,
          totalDurationHours: 0,
          instructors: new Set()
        });
      }
      const cStat = clientBreakdownMap.get(clientKey);
      cStat.totalSessions++;
      cStat.totalDurationMinutes += r.duration_minutes;
      if (r.staff_name && r.staff_name !== 'Unassigned Staff') {
        cStat.instructors.add(r.staff_name);
      }

      const stLower = (r.status || '').toLowerCase();
      if (stLower === 'completed') {
        sStat.completedSessions++;
        cStat.completedSessions++;
      } else if (stLower.includes('cancel')) {
        sStat.cancelledSessions++;
        cStat.cancelledSessions++;
      }
    });

    const staffBreakdown = Array.from(staffBreakdownMap.values()).map(s => ({
      staffId: s.staffId,
      staffName: s.staffName,
      profession: s.profession,
      totalSessions: s.totalSessions,
      completedSessions: s.completedSessions,
      cancelledSessions: s.cancelledSessions,
      totalDurationMinutes: s.totalDurationMinutes,
      totalDurationHours: parseFloat((s.totalDurationMinutes / 60).toFixed(1)),
      uniqueClientsCount: s.uniqueClients.size
    })).sort((a, b) => b.totalSessions - a.totalSessions);

    const clientBreakdown = Array.from(clientBreakdownMap.values()).map(c => ({
      clientId: c.clientId,
      clientUhid: c.clientUhid,
      clientName: c.clientName,
      clientSport: c.clientSport,
      totalSessions: c.totalSessions,
      completedSessions: c.completedSessions,
      cancelledSessions: c.cancelledSessions,
      totalDurationMinutes: c.totalDurationMinutes,
      totalDurationHours: parseFloat((c.totalDurationMinutes / 60).toFixed(1)),
      instructorsList: Array.from(c.instructors).join(', ') || 'General Instructor'
    })).sort((a, b) => b.totalSessions - a.totalSessions);

    // Compute overall summary
    const totalSessions = rows.length;
    const completedSessions = rows.filter(r => (r.status || '').toLowerCase() === 'completed').length;
    const cancelledSessions = rows.filter(r => (r.status || '').toLowerCase().includes('cancel')).length;
    const totalDurationMinutes = rows.reduce((s, r) => s + r.duration_minutes, 0);
    const totalDurationHours = parseFloat((totalDurationMinutes / 60).toFixed(1));
    const avgDurationMinutes = totalSessions > 0 ? Math.round(totalDurationMinutes / totalSessions) : 0;
    const uniqueClientsCount = new Set(rows.map(r => r.client_id).filter(Boolean)).size;

    let reportTitle = 'Client Sessions Report';
    if (module === 'physiotherapy') reportTitle = 'Physiotherapy Sessions Report';
    else if (module === 'sports_science') reportTitle = 'Sports Science Sessions Report';

    return res.json({
      module,
      reportTitle,
      timeframe: { start: startDate, end: endDate },
      summary: {
        totalSessions,
        completedSessions,
        cancelledSessions,
        totalDurationMinutes,
        totalDurationHours,
        avgDurationMinutes,
        uniqueClientsCount,
        activePractitionersCount: staffBreakdown.length
      },
      staffBreakdown,
      clientBreakdown,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching sessions report:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

