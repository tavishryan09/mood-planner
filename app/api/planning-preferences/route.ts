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

    // Get planning preferences for the current user, or return defaults if not found
    const preferences = await sql`
      SELECT
        show_instructions as "showInstructions",
        compact_view as "compactView"
      FROM planning_preferences
      WHERE user_id = ${currentUser.id}
    `;

    if (preferences.length === 0) {
      // Return default preferences
      return NextResponse.json({
        showInstructions: true,
        compactView: false
      });
    }

    return NextResponse.json(preferences[0]);
  } catch (error) {
    console.error('Error fetching planning preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch planning preferences' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { showInstructions, compactView } = body;

    // Build the update dynamically based on what's provided
    const updates: string[] = [];
    const values: any[] = [currentUser.id];

    if (showInstructions !== undefined) {
      updates.push('show_instructions');
      values.push(showInstructions);
    }

    if (compactView !== undefined) {
      updates.push('compact_view');
      values.push(compactView);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No preferences provided' },
        { status: 400 }
      );
    }

    // Build the query dynamically
    let query = `
      INSERT INTO planning_preferences (user_id, ${updates.join(', ')})
      VALUES ($1, ${updates.map((_, i) => `$${i + 2}`).join(', ')})
      ON CONFLICT (user_id)
      DO UPDATE SET
        ${updates.map((col, i) => `${col} = $${i + 2}`).join(', ')},
        updated_at = CURRENT_TIMESTAMP
    `;

    await sql.unsafe(query, values);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating planning preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update planning preferences' },
      { status: 500 }
    );
  }
}
