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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const result = await sql`
      SELECT
        p.id,
        p.project_number as "projectNumber",
        p.project_name as "projectName",
        p.client_id as "clientId",
        c.business_name as "clientName",
        p.common_name as "commonName",
        p.project_value as "projectValue",
        p.billing_rate as "billingRate",
        p.use_team_rates as "useTeamRates",
        p.deadline,
        p.internal_deadline as "internalDeadline",
        p.archived,
        p.created_at as "createdAt",
        p.updated_at as "updatedAt"
      FROM projects p
      LEFT JOIN clients c ON p.client_id = c.id
      WHERE p.id = ${id}
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const project = result[0];

    // Fetch deadline titles and descriptions from milestone_tasks
    const deadlineData = await sql`
      SELECT task_description, task_type, milestone_name
      FROM milestone_tasks
      WHERE project_id = ${id}
        AND task_type IN ('Deadline', 'Internal Deadline')
    `;

    deadlineData.forEach((row: { task_description: string; task_type: string; milestone_name?: string }) => {
      if (row.task_type === 'Deadline') {
        project.deadlineTitle = row.milestone_name;
        project.deadlineDescription = row.task_description;
      } else if (row.task_type === 'Internal Deadline') {
        project.internalDeadlineTitle = row.milestone_name;
        project.internalDeadlineDescription = row.task_description;
      }
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Only Admins and Managers can update projects
    if (currentUser.role !== 'Admin' && currentUser.role !== 'Manager') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { projectNumber, projectName, clientId, commonName, projectValue, currentlyBilled, adjustmentDate, billingRate, useTeamRates, deadline, internalDeadline, deadlineTitle, deadlineDescription, internalDeadlineTitle, internalDeadlineDescription, archived } = body;

    // Get the old deadline values before updating
    const oldProject = await sql`
      SELECT deadline, internal_deadline as "internalDeadline"
      FROM projects
      WHERE id = ${id}
    `;

    const result = await sql`
      UPDATE projects
      SET
        project_number = ${projectNumber || null},
        project_name = ${projectName},
        client_id = ${clientId || null},
        common_name = ${commonName || null},
        project_value = ${projectValue || null},
        currently_billed = ${currentlyBilled || null},
        adjustment_date = ${adjustmentDate || null},
        billing_rate = ${billingRate || null},
        use_team_rates = ${useTeamRates || false},
        deadline = ${deadline || null},
        internal_deadline = ${internalDeadline || null},
        archived = ${archived !== undefined ? archived : false}
      WHERE id = ${id}
      RETURNING
        id,
        project_number as "projectNumber",
        project_name as "projectName",
        client_id as "clientId",
        common_name as "commonName",
        project_value as "projectValue",
        currently_billed as "currentlyBilled",
        adjustment_date as "adjustmentDate",
        billing_rate as "billingRate",
        use_team_rates as "useTeamRates",
        deadline,
        internal_deadline as "internalDeadline",
        archived,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const updatedProject = result[0];

    // Sync deadline changes to milestone_tasks table
    if (oldProject.length > 0) {
      const oldDeadline = oldProject[0].deadline;
      const oldInternalDeadline = oldProject[0].internalDeadline;

      // Handle deadline changes
      if (oldDeadline !== deadline) {
        // Remove old deadline from milestone_tasks if it existed
        if (oldDeadline) {
          await sql`
            DELETE FROM milestone_tasks
            WHERE project_id = ${id}
              AND task_type = 'Deadline'
              AND task_date = ${oldDeadline}
          `;
        }
        // Add new deadline to milestone_tasks if it exists
        if (deadline) {
          await sql`
            INSERT INTO milestone_tasks (
              project_id,
              milestone_name,
              task_description,
              task_type,
              task_date,
              row_index
            )
            VALUES (
              ${id},
              ${deadlineTitle || null},
              ${deadlineDescription || null},
              'Deadline',
              ${deadline},
              0
            )
            ON CONFLICT (task_date, row_index) DO UPDATE
            SET
              project_id = ${id},
              milestone_name = ${deadlineTitle || null},
              task_description = ${deadlineDescription || null},
              task_type = 'Deadline'
          `;
        }
      }

      // Handle internal deadline changes
      if (oldInternalDeadline !== internalDeadline) {
        // Remove old internal deadline from milestone_tasks if it existed
        if (oldInternalDeadline) {
          await sql`
            DELETE FROM milestone_tasks
            WHERE project_id = ${id}
              AND task_type = 'Internal Deadline'
              AND task_date = ${oldInternalDeadline}
          `;
        }
        // Add new internal deadline to milestone_tasks if it exists
        if (internalDeadline) {
          await sql`
            INSERT INTO milestone_tasks (
              project_id,
              milestone_name,
              task_description,
              task_type,
              task_date,
              row_index
            )
            VALUES (
              ${id},
              ${internalDeadlineTitle || null},
              ${internalDeadlineDescription || null},
              'Internal Deadline',
              ${internalDeadline},
              1
            )
            ON CONFLICT (task_date, row_index) DO UPDATE
            SET
              project_id = ${id},
              milestone_name = ${internalDeadlineTitle || null},
              task_description = ${internalDeadlineDescription || null},
              task_type = 'Internal Deadline'
          `;
        }
      }
    }

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Only Admins can delete projects
    if (currentUser.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions - Admin role required' },
        { status: 403 }
      );
    }

    const { id } = await params;

    await sql`
      DELETE FROM projects
      WHERE id = ${id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
