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

    // Get all users with their display settings for the current user
    const usersWithSettings = await sql`
      SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        u.billing_rate as "billingRate",
        COALESCE(uds.visible, true) as visible,
        COALESCE(uds.display_order, 999) as "order"
      FROM users u
      LEFT JOIN user_display_settings uds
        ON u.id = uds.target_user_id
        AND uds.user_id = ${currentUser.id}
      ORDER BY COALESCE(uds.display_order, 999), u.id
    `;

    return NextResponse.json(usersWithSettings);
  } catch (error) {
    console.error('Error fetching user display settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user display settings' },
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
    const { settings } = body;

    if (!settings || !Array.isArray(settings)) {
      return NextResponse.json(
        { error: 'Settings array is required' },
        { status: 400 }
      );
    }

    // Update or insert settings for each user
    for (const setting of settings) {
      const { userId, visible, order, billingRate } = setting;

      if (userId === undefined || visible === undefined || order === undefined) {
        continue;
      }

      // Upsert the display setting
      await sql`
        INSERT INTO user_display_settings (user_id, target_user_id, visible, display_order)
        VALUES (${currentUser.id}, ${userId}, ${visible}, ${order})
        ON CONFLICT (user_id, target_user_id)
        DO UPDATE SET
          visible = ${visible},
          display_order = ${order},
          updated_at = CURRENT_TIMESTAMP
      `;

      // Update billing rate if provided
      if (billingRate !== undefined) {
        await sql`
          UPDATE users
          SET billing_rate = ${billingRate}
          WHERE id = ${userId}
        `;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating user display settings:', error);
    return NextResponse.json(
      { error: 'Failed to update user display settings' },
      { status: 500 }
    );
  }
}
