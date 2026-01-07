import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { randomBytes } from 'crypto';

export async function POST(request: Request) {
  try {
    // Verify admin authentication
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);

    if (!payload || payload.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions - Admin role required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const users = await sql`
      SELECT id, name, email
      FROM users
      WHERE id = ${userId}
    `;

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = users[0];

    // Generate secure random token
    const resetToken = randomBytes(32).toString('hex');

    // Token expires in 24 hours
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Store token in database
    await sql`
      UPDATE users
      SET
        password_reset_token = ${resetToken},
        password_reset_expires = ${expiresAt.toISOString()}
      WHERE id = ${userId}
    `;

    // Generate reset link
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`;

    return NextResponse.json({
      success: true,
      resetLink,
      userName: user.name,
      userEmail: user.email,
      expiresAt: expiresAt.toISOString()
    });
  } catch (error) {
    console.error('Error generating reset link:', error);
    return NextResponse.json(
      { error: 'Failed to generate reset link' },
      { status: 500 }
    );
  }
}
