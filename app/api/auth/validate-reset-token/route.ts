import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
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

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error('Error validating reset token:', error);
    return NextResponse.json(
      { error: 'Failed to validate reset token' },
      { status: 500 }
    );
  }
}
