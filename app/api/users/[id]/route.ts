import { sql } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
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

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser || (currentUser.role !== 'Admin' && currentUser.role !== 'Manager')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const body = await request.json();
    const { name, email, password, role, billingRate } = body;

    // Check if this is a Manager trying to update billing rate only
    const isManagerBillingRateUpdate = currentUser.role === 'Manager' && billingRate !== undefined && !name && !email && !password && !role;

    if (isManagerBillingRateUpdate) {
      // Manager is updating billing rate only - verify target user is Manager or Designer
      const targetUser = await sql`
        SELECT id, role FROM users WHERE id = ${id}
      `;

      if (targetUser.length === 0) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      if (targetUser[0].role !== 'Manager' && targetUser[0].role !== 'Designer') {
        return NextResponse.json(
          { error: 'Managers can only update billing rates for Managers and Designers' },
          { status: 403 }
        );
      }

      // Update only billing rate
      const result = await sql`
        UPDATE users
        SET billing_rate = ${billingRate || 0}
        WHERE id = ${id}
        RETURNING
          id,
          name,
          email,
          role,
          created_at as "createdAt",
          billing_rate as "billingRate"
      `;

      return NextResponse.json(result[0]);
    }

    // Admin full update
    if (currentUser.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (!name || !email || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['Admin', 'Manager', 'Designer', 'Accountant'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Check if email is taken by another user
    const existingUsers = await sql`
      SELECT id FROM users WHERE email = ${email} AND id != ${id}
    `;

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }

    let result;
    if (password) {
      // Update with new password
      const passwordHash = await hashPassword(password);
      result = await sql`
        UPDATE users
        SET
          name = ${name},
          email = ${email},
          password_hash = ${passwordHash},
          role = ${role},
          billing_rate = ${billingRate || 0}
        WHERE id = ${id}
        RETURNING
          id,
          name,
          email,
          role,
          created_at as "createdAt",
          billing_rate as "billingRate"
      `;
    } else {
      // Update without changing password
      result = await sql`
        UPDATE users
        SET
          name = ${name},
          email = ${email},
          role = ${role},
          billing_rate = ${billingRate || 0}
        WHERE id = ${id}
        RETURNING
          id,
          name,
          email,
          role,
          created_at as "createdAt",
          billing_rate as "billingRate"
      `;
    }

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
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

    if (!currentUser || currentUser.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    // Prevent deleting yourself
    if (currentUser.id === parseInt(id)) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    const result = await sql`
      DELETE FROM users
      WHERE id = ${id}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
