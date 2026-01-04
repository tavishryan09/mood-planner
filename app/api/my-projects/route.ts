import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';
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

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const includeNoTasks = searchParams.get('includeNoTasks') === 'true';

    const today = new Date().toISOString().split('T')[0];

    let projects;

    if (includeNoTasks) {
      // Get all projects where the user is a team member, including those with no upcoming tasks
      projects = await sql`
        SELECT DISTINCT
          p.id,
          p.project_number as "projectNumber",
          p.project_name as "projectName",
          p.common_name as "commonName",
          c.business_name as "clientName",
          COALESCE(COUNT(DISTINCT pt.id) FILTER (WHERE pt.task_date >= ${today} AND pt.task_type = 'Project Task'), 0)::int as "taskCount"
        FROM projects p
        LEFT JOIN clients c ON p.client_id = c.id
        INNER JOIN project_team_members ptm ON ptm.project_id = p.id
        LEFT JOIN planning_tasks pt ON pt.project_id = p.id AND pt.user_id = ${currentUser.id}
        WHERE ptm.user_id = ${currentUser.id}
        GROUP BY p.id, p.project_number, p.project_name, p.common_name, c.business_name
        ORDER BY p.project_name ASC
      `;
    } else {
      // Get projects where the current user has future planning tasks
      projects = await sql`
        SELECT DISTINCT
          p.id,
          p.project_number as "projectNumber",
          p.project_name as "projectName",
          p.common_name as "commonName",
          c.business_name as "clientName",
          COUNT(DISTINCT pt.id)::int as "taskCount"
        FROM projects p
        LEFT JOIN clients c ON p.client_id = c.id
        INNER JOIN planning_tasks pt ON pt.project_id = p.id
        WHERE pt.user_id = ${currentUser.id}
          AND pt.task_date >= ${today}
          AND pt.task_type = 'Project Task'
        GROUP BY p.id, p.project_number, p.project_name, p.common_name, c.business_name
        ORDER BY p.project_name ASC
      `;
    }

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching my projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}
