import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';
import { hashPassword, validatePasswordStrength } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'Token and new password are required' },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.message },
        { status: 400 }
      );
    }

    // Find user with this token
    const users = await sql`
      SELECT id, password_reset_expires
      FROM users
      WHERE password_reset_token = ${token}
    `;

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Invalid reset token' },
        { status: 400 }
      );
    }

    const user = users[0];

    // Check if token has expired
    const expiresAt = new Date(user.password_reset_expires);
    const now = new Date();

    if (expiresAt < now) {
      return NextResponse.json(
        { error: 'Reset token has expired' },
        { status: 400 }
      );
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password and clear reset token
    await sql`
      UPDATE users
      SET
        password_hash = ${passwordHash},
        password_reset_token = NULL,
        password_reset_expires = NULL
      WHERE id = ${user.id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}
