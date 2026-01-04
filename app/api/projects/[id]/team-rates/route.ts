import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const rates = await sql`
      SELECT
        user_id as "userId",
        billing_rate as "billingRate"
      FROM project_team_rates
      WHERE project_id = ${id}
    `;

    return NextResponse.json(rates);
  } catch (error) {
    console.error('Error fetching team rates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team rates' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { rates } = body;

    if (!rates || !Array.isArray(rates)) {
      return NextResponse.json(
        { error: 'Rates array is required' },
        { status: 400 }
      );
    }

    // Delete existing rates for this project
    await sql`
      DELETE FROM project_team_rates
      WHERE project_id = ${id}
    `;

    // Insert new rates
    for (const rate of rates) {
      const { userId, billingRate } = rate;

      if (userId === undefined || billingRate === undefined) {
        continue;
      }

      await sql`
        INSERT INTO project_team_rates (project_id, user_id, billing_rate)
        VALUES (${id}, ${userId}, ${billingRate})
        ON CONFLICT (project_id, user_id)
        DO UPDATE SET
          billing_rate = ${billingRate},
          updated_at = CURRENT_TIMESTAMP
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating team rates:', error);
    return NextResponse.json(
      { error: 'Failed to update team rates' },
      { status: 500 }
    );
  }
}
