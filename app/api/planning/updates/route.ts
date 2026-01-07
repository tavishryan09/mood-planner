import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

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

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const since = searchParams.get('since'); // ISO timestamp of last update

  if (!since) {
    return NextResponse.json({ error: 'Missing since parameter' }, { status: 400 });
  }

  try {
    // Get tasks updated since the timestamp
    const tasks = await sql`
      SELECT
        id,
        user_id as "userId",
        project_id as "projectId",
        task_description as "taskDescription",
        task_type as "taskType",
        task_date as "taskDate",
        row_index as "rowIndex",
        row_span as "rowSpan",
        completed,
        internal_task_type_id as "internalTaskTypeId",
        updated_at as "updatedAt"
      FROM planning_tasks
      WHERE updated_at > ${since}
      ORDER BY updated_at ASC
    `;

    // Get milestones updated since the timestamp
    const milestones = await sql`
      SELECT
        id,
        project_id as "projectId",
        task_description as "taskDescription",
        task_type as "taskType",
        task_date as "taskDate",
        row_index as "rowIndex",
        updated_at as "updatedAt"
      FROM milestone_tasks
      WHERE updated_at > ${since}
      ORDER BY updated_at ASC
    `;

    return NextResponse.json({
      tasks,
      milestones,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching updates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch updates' },
      { status: 500 }
    );
  }
}
