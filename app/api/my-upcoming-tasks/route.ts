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
    const limit = parseInt(searchParams.get('limit') || '10');

    const today = new Date().toISOString().split('T')[0];

    // Get upcoming tasks for the current user
    const tasks = await sql`
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
        c.business_name as "clientName"
      FROM planning_tasks pt
      LEFT JOIN projects p ON pt.project_id = p.id
      LEFT JOIN clients c ON p.client_id = c.id
      WHERE pt.user_id = ${currentUser.id}
        AND pt.task_date >= ${today}
      ORDER BY pt.task_date ASC, pt.row_index ASC
      LIMIT ${limit}
    `;

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching upcoming tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch upcoming tasks' },
      { status: 500 }
    );
  }
}
