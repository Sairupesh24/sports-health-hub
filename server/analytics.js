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

      // Booked Hours sum
      const totalHoursBooked = memberSessions.reduce((acc, s) => {
        const start = new Date(s.scheduledStart);
        const end = new Date(s.scheduledEnd);
        const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return acc + (isNaN(diffHours) ? 0 : diffHours);
      }, 0);

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

export default router;
