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

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const projects = await sql`
      SELECT
        p.id,
        p.project_number as "projectNumber",
        p.project_name as "projectName",
        p.client_id as "clientId",
        p.common_name as "commonName",
        p.project_value as "projectValue",
        p.currently_billed as "currentlyBilled",
        p.adjustment_date as "adjustmentDate",
        p.billing_rate as "billingRate",
        p.use_team_rates as "useTeamRates",
        p.archived,
        p.created_at as "createdAt",
        p.updated_at as "updatedAt",
        c.business_name as "clientName"
      FROM projects p
      LEFT JOIN clients c ON p.client_id = c.id
      ORDER BY p.created_at DESC
    `;

    console.log('[Projects API] Returning', projects.length, 'projects');
    if (projects.length > 0 && projects.length <= 5) {
      console.log('[Projects API] Projects:', projects.map((p: any) => ({ id: p.id, number: p.projectNumber, name: p.commonName || p.projectName })));
    }

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
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

    // Only Admins and Managers can create projects
    if (currentUser.role !== 'Admin' && currentUser.role !== 'Manager') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { projectNumber, projectName, clientId, commonName, projectValue, billingRate, useTeamRates } = body;

    const result = await sql`
      INSERT INTO projects (
        project_number,
        project_name,
        client_id,
        common_name,
        project_value,
        billing_rate,
        use_team_rates
      )
      VALUES (
        ${projectNumber || null},
        ${projectName},
        ${clientId || null},
        ${commonName || null},
        ${projectValue || null},
        ${billingRate || null},
        ${useTeamRates || false}
      )
      RETURNING
        id,
        project_number as "projectNumber",
        project_name as "projectName",
        client_id as "clientId",
        common_name as "commonName",
        project_value as "projectValue",
        billing_rate as "billingRate",
        use_team_rates as "useTeamRates",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
