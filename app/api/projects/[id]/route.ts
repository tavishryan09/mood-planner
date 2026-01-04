import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { projectNumber, projectName, clientId, commonName, projectValue, billingRate, useTeamRates } = body;

    const result = await sql`
      UPDATE projects
      SET
        project_number = ${projectNumber || null},
        project_name = ${projectName},
        client_id = ${clientId || null},
        common_name = ${commonName || null},
        project_value = ${projectValue || null},
        billing_rate = ${billingRate || null},
        use_team_rates = ${useTeamRates || false}
      WHERE id = ${id}
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

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result[0]);
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
