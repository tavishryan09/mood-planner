import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { syncTaskToOutlook } from '@/lib/outlook-sync';
import { planningEvents } from '@/lib/planning-events';

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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let tasks;

    if (startDate && endDate) {
      // Get tasks for date range
      tasks = await sql`
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
          pt.internal_task_type_id as "internalTaskTypeId",
          pt.created_at as "createdAt",
          pt.updated_at as "updatedAt",
          p.common_name as "projectCommonName",
          p.project_name as "projectName",
          itt.name as "internalTaskTypeName"
        FROM planning_tasks pt
        LEFT JOIN projects p ON pt.project_id = p.id
        LEFT JOIN internal_task_types itt ON pt.internal_task_type_id = itt.id
        WHERE pt.task_date >= ${startDate}
          AND pt.task_date <= ${endDate}
        ORDER BY pt.task_date ASC
      `;
    } else {
      // Get all tasks
      tasks = await sql`
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
          pt.internal_task_type_id as "internalTaskTypeId",
          pt.created_at as "createdAt",
          pt.updated_at as "updatedAt",
          p.common_name as "projectCommonName",
          p.project_name as "projectName",
          itt.name as "internalTaskTypeName"
        FROM planning_tasks pt
        LEFT JOIN projects p ON pt.project_id = p.id
        LEFT JOIN internal_task_types itt ON pt.internal_task_type_id = itt.id
        ORDER BY pt.task_date ASC
      `;
    }

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching planning tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch planning tasks' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, projectId, taskDescription, taskType, taskDate, rowIndex, rowSpan = 1, internalTaskTypeId } = body;

    if (!userId || !taskType || !taskDate || rowIndex === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (rowSpan < 1 || rowSpan > 4) {
      return NextResponse.json(
        { error: 'Row span must be between 1 and 4' },
        { status: 400 }
      );
    }

    // Check if row span would exceed available rows (0-3)
    if (rowIndex + rowSpan > 4) {
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

    if (rowIndex < 0 || rowIndex > 3) {
      return NextResponse.json(
        { error: 'Row index must be between 0 and 3' },
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
      INSERT INTO planning_tasks (
        user_id,
        project_id,
        task_description,
        task_type,
        task_date,
        row_index,
        row_span,
        internal_task_type_id
      )
      VALUES (
        ${userId},
        ${projectId || null},
        ${finalDescription},
        ${taskType},
        ${taskDate},
        ${rowIndex},
        ${rowSpan},
        ${internalTaskTypeId || null}
      )
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
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    // If this is a project task, automatically add the user to the project team
    if (taskType === 'Project Task' && projectId) {
      try {
        // Check if user is already on the project team
        const existingMember = await sql`
          SELECT id FROM project_team_members
          WHERE project_id = ${projectId} AND user_id = ${userId}
        `;

        // Only add if not already a member
        if (existingMember.length === 0) {
          await sql`
            INSERT INTO project_team_members (project_id, user_id)
            VALUES (${projectId}, ${userId})
          `;
        }
      } catch (error) {
        // Log error but don't fail the task creation
        console.error('Error adding user to project team:', error);
      }
    }

    // Return immediately, sync to Outlook in background (non-blocking)
    const createdTask = result[0];
    const response = NextResponse.json(result[0], { status: 201 });

    // Sync to Outlook asynchronously without blocking the response
    // This runs in the background and doesn't delay the user's task creation
    (async () => {
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
        if (taskType === 'Internal' && internalTaskTypeId) {
          const internalTaskType = await sql`
            SELECT name
            FROM internal_task_types
            WHERE id = ${internalTaskTypeId}
          `;
          internalTaskTypeName = internalTaskType[0]?.name;
        }

        await syncTaskToOutlook({
          id: createdTask.id,
          userId: createdTask.userId,
          taskDescription: createdTask.taskDescription,
          taskType: createdTask.taskType,
          taskDate: createdTask.taskDate,
          projectName: projectDetails?.project_name,
          projectNumber: projectDetails?.project_number,
          projectCommonName: projectDetails?.common_name,
          internalTaskTypeName,
        });
      } catch (error) {
        // Log error but don't fail task creation
        console.error('Error syncing task to Outlook (background):', error);
      }
    })();

    // Broadcast task creation to SSE listeners
    planningEvents.broadcastTaskUpdate('created', createdTask.id, createdTask);

    return response;
  } catch (error: any) {
    console.error('Error creating planning task:', error);

    // Check if it's a duplicate key error
    if (error?.code === '23505' || error?.constraint?.includes('user_id_task_date_row_index')) {
      return NextResponse.json(
        { error: 'Duplicate task - a task already exists at this date and row' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create planning task' },
      { status: 500 }
    );
  }
}
