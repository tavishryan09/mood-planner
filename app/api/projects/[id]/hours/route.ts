import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

// Get date ranges for different periods
function getDateRanges() {
  const now = new Date();

  // This Week (Monday to Sunday)
  const currentDay = now.getDay();
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  // This Month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // This Quarter (Q1: Jan-Mar, Q2: Apr-Jun, Q3: Jul-Sep, Q4: Oct-Dec)
  const currentMonth = now.getMonth();
  const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
  const quarterStart = new Date(now.getFullYear(), quarterStartMonth, 1);
  const quarterEnd = new Date(now.getFullYear(), quarterStartMonth + 3, 0, 23, 59, 59, 999);

  return {
    weekStart,
    weekEnd,
    monthStart,
    monthEnd,
    quarterStart,
    quarterEnd,
  };
}

// Check if two date ranges overlap
function dateRangesOverlap(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
  return start1 <= end2 && start2 <= end1;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const projectId = parseInt(id);

    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    // Get all tasks for this project (all task types, not just 'Project Task')
    const tasks = await sql`
      SELECT
        id,
        user_id,
        task_date,
        row_span,
        task_type
      FROM planning_tasks
      WHERE project_id = ${projectId}
      ORDER BY task_date
    `;

    const ranges = getDateRanges();

    let totalHours = 0;
    let hoursThisWeek = 0;
    let hoursThisMonth = 0;
    let hoursThisQuarter = 0;

    // Each day (row) in the planning calendar = 2 hours
    const HOURS_PER_DAY = 2;

    // Calculate hours for each task
    for (const task of tasks) {
      // task_date is the starting date, row_span determines how many days it spans
      const taskStart = new Date(task.task_date);
      const taskEnd = new Date(task.task_date);

      // row_span represents the number of consecutive days (default is 1)
      const rowSpan = task.row_span || 1;
      taskEnd.setDate(taskEnd.getDate() + (rowSpan - 1));

      // Calculate hours: row_span × 2 hours per day
      const taskHours = rowSpan * HOURS_PER_DAY;

      // Total hours - sum all task hours
      totalHours += taskHours;

      // Hours this week - check if task overlaps with this week
      if (dateRangesOverlap(taskStart, taskEnd, ranges.weekStart, ranges.weekEnd)) {
        hoursThisWeek += taskHours;
      }

      // Hours this month - check if task overlaps with this month
      if (dateRangesOverlap(taskStart, taskEnd, ranges.monthStart, ranges.monthEnd)) {
        hoursThisMonth += taskHours;
      }

      // Hours this quarter - check if task overlaps with this quarter
      if (dateRangesOverlap(taskStart, taskEnd, ranges.quarterStart, ranges.quarterEnd)) {
        hoursThisQuarter += taskHours;
      }
    }

    return NextResponse.json({
      totalHours,
      hoursThisWeek,
      hoursThisMonth,
      hoursThisQuarter,
    });
  } catch (error) {
    console.error('Error calculating project hours:', error);
    return NextResponse.json(
      { error: 'Failed to calculate project hours' },
      { status: 500 }
    );
  }
}
