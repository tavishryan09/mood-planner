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
 * Bundled API endpoint for planning page
 * Returns all data needed for planning page in a single request
 * Reduces 7+ sequential API calls to 1 request
 */
export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  try {
    // Execute all queries in parallel
    const [
      userDisplaySettings,
      projects,
      internalTaskTypes,
      tasks,
      milestoneTasks,
      outlookStatus,
      planningPreferences
    ] = await Promise.all([
      // User display settings
      fetchUserDisplaySettings(currentUser.id),

      // Projects
      fetchProjects(currentUser),

      // Internal task types
      fetchInternalTaskTypes(),

      // Planning tasks (if date range provided)
      startDate && endDate ? fetchTasks(currentUser.id, startDate, endDate) : Promise.resolve([]),

      // Milestone tasks (if date range provided)
      startDate && endDate ? fetchMilestoneTasks(currentUser.id, startDate, endDate) : Promise.resolve([]),

      // Outlook status
      fetchOutlookStatus(currentUser.id),

      // Planning preferences
      fetchPlanningPreferences(currentUser.id)
    ]);

    return NextResponse.json({
      users: userDisplaySettings,
      projects,
      internalTaskTypes,
      tasks,
      milestoneTasks,
      outlookConnected: outlookStatus.connected,
      planningPreferences
    });
  } catch (error) {
    console.error('Error fetching planning bundle:', error);
    return NextResponse.json(
      { error: 'Failed to fetch planning data' },
      { status: 500 }
    );
  }
}

async function fetchUserDisplaySettings(userId: number) {
  // First get the current user's role
  const currentUserResult = await sql`
    SELECT role FROM users WHERE id = ${userId}
  `;

  const currentUserRole = currentUserResult[0]?.role;

  // Admins can see all users, non-admins can't see Admins or Accountants
  let result;
  if (currentUserRole === 'Admin') {
    result = await sql`
      SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        COALESCE(puds.visible, true) as visible,
        COALESCE(puds.display_order, 999) as "order",
        COALESCE(u.billing_rate, 0) as "billingRate"
      FROM users u
      LEFT JOIN planning_user_display_settings puds
        ON u.id = puds.target_user_id AND puds.user_id = ${userId}
      ORDER BY COALESCE(puds.display_order, 999), u.id
    `;
  } else {
    result = await sql`
      SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        COALESCE(puds.visible, true) as visible,
        COALESCE(puds.display_order, 999) as "order",
        COALESCE(u.billing_rate, 0) as "billingRate"
      FROM users u
      LEFT JOIN planning_user_display_settings puds
        ON u.id = puds.target_user_id AND puds.user_id = ${userId}
      WHERE u.role NOT IN ('Admin', 'Accountant')
      ORDER BY COALESCE(puds.display_order, 999), u.id
    `;
  }

  return result;
}

async function fetchProjects(currentUser: { id: number; role: string }) {
  // Managers and Admins see all projects (excluding archived)
  if (currentUser.role === 'Admin' || currentUser.role === 'Manager') {
    const result = await sql`
      SELECT id, project_number as "projectNumber", project_name as "projectName", common_name as "commonName", archived
      FROM projects
      WHERE archived IS NOT TRUE
      ORDER BY project_number
    `;
    console.log('[fetchProjects] Manager/Admin - returning all', result.length, 'projects');
    return result;
  } else {
    // Designers see only projects they're assigned to (excluding archived)
    const result = await sql`
      SELECT DISTINCT
        p.id,
        p.project_number as "projectNumber",
        p.project_name as "projectName",
        p.common_name as "commonName",
        p.archived
      FROM projects p
      INNER JOIN project_team_members ptm ON ptm.project_id = p.id
      WHERE ptm.user_id = ${currentUser.id}
        AND p.archived IS NOT TRUE
      ORDER BY p.project_number
    `;
    console.log('[fetchProjects] Designer - returning', result.length, 'assigned projects');
    return result;
  }
}

async function fetchInternalTaskTypes() {
  const result = await sql`
    SELECT id, name
    FROM internal_task_types
    ORDER BY name
  `;
  return result;
}

async function fetchTasks(userId: number, startDate: string, endDate: string) {
  const result = await sql`
    SELECT
      pt.*,
      p.common_name as "projectCommonName",
      p.project_name as "projectName",
      itt.name as "internalTaskTypeName"
    FROM planning_tasks pt
    LEFT JOIN projects p ON pt.project_id = p.id
    LEFT JOIN internal_task_types itt ON pt.internal_task_type_id = itt.id
    WHERE pt.task_date >= ${startDate}
      AND pt.task_date <= ${endDate}
    ORDER BY pt.task_date
  `;

  return result.map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    taskDescription: row.task_description,
    taskType: row.task_type,
    taskDate: row.task_date,
    projectCommonName: row.projectCommonName,
    projectName: row.projectName,
    rowIndex: row.row_index,
    rowSpan: row.row_span,
    internalTaskTypeId: row.internal_task_type_id,
    internalTaskTypeName: row.internalTaskTypeName
  }));
}

async function fetchMilestoneTasks(userId: number, startDate: string, endDate: string) {
  const result = await sql`
    SELECT
      mt.*,
      p.common_name as "projectCommonName",
      p.project_name as "projectName"
    FROM milestone_tasks mt
    LEFT JOIN projects p ON mt.project_id = p.id
    WHERE mt.task_date >= ${startDate}
      AND mt.task_date <= ${endDate}
    ORDER BY mt.task_date
  `;

  return result.map((row: any) => ({
    id: row.id,
    projectId: row.project_id,
    taskDescription: row.task_description,
    taskType: row.task_type,
    taskDate: row.task_date,
    rowIndex: row.row_index,
    projectCommonName: row.projectCommonName,
    projectName: row.projectName
  }));
}

async function fetchOutlookStatus(userId: number) {
  try {
    const result = await sql`
      SELECT outlook_connected
      FROM users
      WHERE id = ${userId}
    `;

    if (result.length === 0) {
      return { connected: false };
    }

    return {
      connected: result[0].outlook_connected || false
    };
  } catch (error) {
    console.error('Error checking Outlook status:', error);
    return { connected: false };
  }
}

async function fetchPlanningPreferences(userId: number) {
  try {
    const result = await sql`
      SELECT show_instructions as "showInstructions"
      FROM planning_preferences
      WHERE user_id = ${userId}
    `;

    if (result.length === 0) {
      return { showInstructions: true };
    }

    return result[0];
  } catch (error) {
    console.error('Error fetching planning preferences:', error);
    return { showInstructions: true };
  }
}
