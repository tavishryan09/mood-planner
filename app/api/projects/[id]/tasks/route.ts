import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const tasks = await sql`
      SELECT
        pt.id,
        pt.task_name as "taskName",
        pt.description,
        pt.start_date as "startDate",
        pt.end_date as "endDate",
        pt.status,
        pt.category,
        pt.progress,
        pt.created_at as "createdAt",
        COALESCE(
          json_agg(
            json_build_object('id', u.id, 'name', u.name)
            ORDER BY u.name
          ) FILTER (WHERE u.id IS NOT NULL),
          '[]'
        ) as "assignedUsers"
      FROM project_tasks pt
      LEFT JOIN project_task_assignments pta ON pt.id = pta.task_id
      LEFT JOIN users u ON pta.user_id = u.id
      WHERE pt.project_id = ${id}
      GROUP BY pt.id
      ORDER BY pt.start_date ASC, pt.id ASC
    `;

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { taskName, description, startDate, endDate, status, category, assignedUserIds, progress } = body;

    const result = await sql`
      INSERT INTO project_tasks (
        project_id,
        task_name,
        description,
        start_date,
        end_date,
        status,
        category,
        progress
      )
      VALUES (
        ${id},
        ${taskName},
        ${description || null},
        ${startDate},
        ${endDate},
        ${status || 'not-started'},
        ${category || null},
        ${progress || 0}
      )
      RETURNING
        id,
        task_name as "taskName",
        description,
        start_date as "startDate",
        end_date as "endDate",
        status,
        category,
        progress,
        created_at as "createdAt"
    `;

    const taskId = result[0].id;

    // Create task assignments
    if (assignedUserIds && Array.isArray(assignedUserIds) && assignedUserIds.length > 0) {
      for (const userId of assignedUserIds) {
        await sql`
          INSERT INTO project_task_assignments (task_id, user_id)
          VALUES (${taskId}, ${userId})
        `;
      }
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
