import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const { id, taskId } = await params;
    const body = await request.json();
    const { taskName, description, startDate, endDate, status, category, assignedUserIds, progress } = body;

    const result = await sql`
      UPDATE project_tasks
      SET
        task_name = ${taskName},
        description = ${description || null},
        start_date = ${startDate},
        end_date = ${endDate},
        status = ${status},
        category = ${category || null},
        progress = ${progress},
        updated_at = NOW()
      WHERE id = ${taskId} AND project_id = ${id}
      RETURNING
        id,
        task_name as "taskName",
        description,
        start_date as "startDate",
        end_date as "endDate",
        status,
        category,
        progress,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Delete existing assignments
    await sql`
      DELETE FROM project_task_assignments
      WHERE task_id = ${taskId}
    `;

    // Create new assignments
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
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const { id, taskId } = await params;

    await sql`
      DELETE FROM project_tasks
      WHERE id = ${taskId} AND project_id = ${id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}
