import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

// Helper to get current user from token
async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    return null;
  }

  try {
    const payload = verifyToken(token);

    if (!payload) {
      return null;
    }

    const users = await sql`
      SELECT id, name, email, role
      FROM users
      WHERE id = ${payload.userId}
    `;
    return users[0] || null;
  } catch (error) {
    return null;
  }
}

/**
 * Bundled API endpoint for dashboard page
 * Returns all data needed for dashboard in a single request
 * Reduces 4+ API calls to 1 request
 */
export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const includeNoTasks = searchParams.get('includeNoTasks') === 'true';
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const taskLimit = parseInt(searchParams.get('taskLimit') || '10', 10);

  try {
    // Execute all queries in parallel
    const [
      projects,
      upcomingTasks,
      milestones,
      widgetSettings
    ] = await Promise.all([
      // My projects
      fetchMyProjects(currentUser.id, includeNoTasks),

      // My upcoming tasks
      fetchMyUpcomingTasks(currentUser.id, taskLimit),

      // Upcoming milestones (if date range provided)
      startDate && endDate ? fetchMilestones(startDate, endDate) : Promise.resolve([]),

      // Dashboard widget settings
      fetchDashboardWidgetSettings(currentUser.id)
    ]);

    return NextResponse.json({
      projects,
      upcomingTasks,
      milestones,
      widgets: widgetSettings.widgets,
      showAllProjects: widgetSettings.showAllProjects
    });
  } catch (error) {
    console.error('Error fetching dashboard bundle:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}

async function fetchMyProjects(userId: number, includeNoTasks: boolean) {
  const result = await sql`
    SELECT DISTINCT
      p.id,
      p.project_number as "projectNumber",
      p.project_name as "projectName",
      p.common_name as "commonName",
      c.name as "clientName",
      COUNT(DISTINCT pt.id) as "taskCount"
    FROM projects p
    LEFT JOIN clients c ON p.client_id = c.id
    INNER JOIN project_team_members ptm ON ptm.project_id = p.id
    LEFT JOIN planning_tasks pt ON pt.project_id = p.id AND pt.user_id = ${userId}
    WHERE ptm.user_id = ${userId}
    GROUP BY p.id, p.project_number, p.project_name, p.common_name, c.name
    ${includeNoTasks ? sql`` : sql`HAVING COUNT(DISTINCT pt.id) > 0`}
    ORDER BY p.project_number
  `;

  return result.map((row: any) => ({
    ...row,
    taskCount: parseInt(row.taskCount, 10)
  }));
}

async function fetchMyUpcomingTasks(userId: number, limit: number) {
  const result = await sql`
    SELECT
      pt.id,
      pt.user_id as "userId",
      pt.project_id as "projectId",
      pt.task_description as "taskDescription",
      pt.task_type as "taskType",
      pt.task_date as "taskDate",
      pt.row_index as "rowIndex",
      pt.row_span as "rowSpan",
      pt.completed,
      p.common_name as "projectCommonName",
      p.project_name as "projectName",
      c.name as "clientName",
      pt.internal_task_type_id as "internalTaskTypeId",
      itt.name as "internalTaskTypeName"
    FROM planning_tasks pt
    LEFT JOIN projects p ON pt.project_id = p.id
    LEFT JOIN clients c ON p.client_id = c.id
    LEFT JOIN internal_task_types itt ON pt.internal_task_type_id = itt.id
    WHERE pt.user_id = ${userId}
      AND pt.task_date >= CURRENT_DATE
      AND pt.completed = false
    ORDER BY pt.task_date ASC
    LIMIT ${limit}
  `;

  return result;
}

async function fetchMilestones(startDate: string, endDate: string) {
  const result = await sql`
    SELECT
      mt.id,
      mt.project_id as "projectId",
      mt.task_description as "taskDescription",
      mt.task_type as "taskType",
      mt.task_date as "taskDate",
      mt.row_index as "rowIndex",
      p.common_name as "projectCommonName",
      p.project_name as "projectName"
    FROM milestone_tasks mt
    LEFT JOIN projects p ON mt.project_id = p.id
    WHERE mt.task_date >= ${startDate}
      AND mt.task_date <= ${endDate}
    ORDER BY mt.task_date ASC
  `;

  return result;
}

async function fetchDashboardWidgetSettings(userId: number) {
  try {
    const result = await sql`
      SELECT widgets, show_all_projects as "showAllProjects"
      FROM dashboard_widget_settings
      WHERE user_id = ${userId}
    `;

    if (result.length === 0) {
      // Default widget configuration
      return {
        widgets: [
          { id: 'projects', name: 'My Current Projects', width: '1/3', order: 0, visible: true },
          { id: 'tasks', name: 'My Upcoming Tasks', width: '1/3', order: 1, visible: true },
          { id: 'milestones', name: 'Upcoming Deadlines/Milestones', width: '1/3', order: 2, visible: true },
          { id: 'team-tasks', name: 'Tasks by Team Member', width: 'full', order: 3, visible: true }
        ],
        showAllProjects: false
      };
    }

    return {
      widgets: result[0].widgets || [],
      showAllProjects: result[0].showAllProjects || false
    };
  } catch (error) {
    console.error('Error fetching dashboard widget settings:', error);
    return {
      widgets: [
        { id: 'projects', name: 'My Current Projects', width: '1/3', order: 0, visible: true },
        { id: 'tasks', name: 'My Upcoming Tasks', width: '1/3', order: 1, visible: true },
        { id: 'milestones', name: 'Upcoming Deadlines/Milestones', width: '1/3', order: 2, visible: true },
        { id: 'team-tasks', name: 'Tasks by Team Member', width: 'full', order: 3, visible: true }
      ],
      showAllProjects: false
    };
  }
}
