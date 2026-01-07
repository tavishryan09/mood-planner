import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { syncTaskToOutlook, deleteTaskFromOutlook } from '@/lib/outlook-sync';

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

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const body = await request.json();
    const { userId, projectId, taskDescription, taskType, taskDate, rowIndex, rowSpan = 1, internalTaskTypeId } = body;

    if (!taskType || !taskDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (rowSpan !== undefined && (rowSpan < 1 || rowSpan > 4)) {
      return NextResponse.json(
        { error: 'Row span must be between 1 and 4' },
        { status: 400 }
      );
    }

    // Check if row span would exceed available rows (0-3)
    if (rowIndex !== undefined && rowSpan !== undefined && rowIndex + rowSpan > 4) {
      return NextResponse.json(
        { error: 'Task would span beyond available rows' },
        { status: 400 }
      );
    }

    if (!['Project Task', 'Out of Office', 'Unavailable', 'PTO', 'Internal'].includes(taskType)) {
      return NextResponse.json(
        { error: 'Invalid task type' },
        { status: 400 }
      );
    }

    // If task type is "Project Task", projectId is required
    if (taskType === 'Project Task' && !projectId) {
      return NextResponse.json(
        { error: 'Project is required for Project Task type' },
        { status: 400 }
      );
    }

    // If task type is "Internal", internalTaskTypeId is required
    if (taskType === 'Internal' && !internalTaskTypeId) {
      return NextResponse.json(
        { error: 'Internal task type is required for Internal tasks' },
        { status: 400 }
      );
    }

    // If no description provided, use task type as default
    const finalDescription = taskDescription?.trim() || taskType;

    const result = await sql`
      UPDATE planning_tasks
      SET
        user_id = COALESCE(${userId}, user_id),
        project_id = ${projectId || null},
        task_description = ${finalDescription},
        task_type = ${taskType},
        task_date = ${taskDate},
        row_index = COALESCE(${rowIndex}, row_index),
        row_span = COALESCE(${rowSpan}, row_span),
        internal_task_type_id = ${internalTaskTypeId || null}
      WHERE id = ${id}
      RETURNING
        id,
        user_id as "userId",
        project_id as "projectId",
        task_description as "taskDescription",
        task_type as "taskType",
        task_date as "taskDate",
        row_index as "rowIndex",
        row_span as "rowSpan",
        internal_task_type_id as "internalTaskTypeId",
        outlook_event_id as "outlookEventId",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Planning task not found' },
        { status: 404 }
      );
    }

    // If this is a project task, automatically add the user to the project team
    const updatedTask = result[0];
    if (taskType === 'Project Task' && projectId && updatedTask.userId) {
      try {
        // Check if user is already on the project team
        const existingMember = await sql`
          SELECT id FROM project_team_members
          WHERE project_id = ${projectId} AND user_id = ${updatedTask.userId}
        `;

        // Only add if not already a member
        if (existingMember.length === 0) {
          await sql`
            INSERT INTO project_team_members (project_id, user_id)
            VALUES (${projectId}, ${updatedTask.userId})
          `;
        }
      } catch (error) {
        // Log error but don't fail the task update
        console.error('Error adding user to project team:', error);
      }
    }

    // Automatically sync to Outlook if connected
    try {
      // Get project details if needed
      let projectDetails = null;
      if (projectId) {
        const project = await sql`
          SELECT project_name, project_number, common_name
          FROM projects
          WHERE id = ${projectId}
        `;
        projectDetails = project[0];
      }

      // Get internal task type name if needed
      let internalTaskTypeName = null;
      if (taskType === 'Internal' && updatedTask.internalTaskTypeId) {
        const internalTaskType = await sql`
          SELECT name
          FROM internal_task_types
          WHERE id = ${updatedTask.internalTaskTypeId}
        `;
        internalTaskTypeName = internalTaskType[0]?.name;
      }

      await syncTaskToOutlook({
        id: updatedTask.id,
        userId: updatedTask.userId,
        taskDescription: updatedTask.taskDescription,
        taskType: updatedTask.taskType,
        taskDate: updatedTask.taskDate,
        projectName: projectDetails?.project_name,
        projectNumber: projectDetails?.project_number,
        projectCommonName: projectDetails?.common_name,
        outlookEventId: updatedTask.outlookEventId,
        internalTaskTypeName,
      });
    } catch (error) {
      // Log error but don't fail task update
      console.error('Error syncing task to Outlook:', error);
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating planning task:', error);
    return NextResponse.json(
      { error: 'Failed to update planning task' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const body = await request.json();
    const { completed } = body;

    if (typeof completed !== 'boolean') {
      return NextResponse.json(
        { error: 'completed must be a boolean' },
        { status: 400 }
      );
    }

    const result = await sql`
      UPDATE planning_tasks
      SET completed = ${completed}
      WHERE id = ${id}
      RETURNING
        id,
        user_id as "userId",
        project_id as "projectId",
        task_description as "taskDescription",
        task_type as "taskType",
        task_date as "taskDate",
        row_index as "rowIndex",
        row_span as "rowSpan",
        completed,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Planning task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating task completion:', error);
    return NextResponse.json(
      { error: 'Failed to update task completion' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    // First get the task to get outlook_event_id and user_id
    const task = await sql`
      SELECT id, user_id as "userId", outlook_event_id as "outlookEventId"
      FROM planning_tasks
      WHERE id = ${id}
    `;

    if (task.length === 0) {
      return NextResponse.json(
        { error: 'Planning task not found' },
        { status: 404 }
      );
    }

    const taskToDelete = task[0];

    // Delete from database
    await sql`
      DELETE FROM planning_tasks
      WHERE id = ${id}
    `;

    // Delete from Outlook if it was synced
    if (taskToDelete.outlookEventId) {
      try {
        await deleteTaskFromOutlook(taskToDelete.userId, taskToDelete.outlookEventId);
      } catch (error) {
        // Log error but don't fail deletion
        console.error('Error deleting task from Outlook:', error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting planning task:', error);
    return NextResponse.json(
      { error: 'Failed to delete planning task' },
      { status: 500 }
    );
  }
}
