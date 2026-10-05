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

export default router;

