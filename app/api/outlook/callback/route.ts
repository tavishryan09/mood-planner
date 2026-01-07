import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getUserInfo } from '@/lib/microsoft-graph';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // userId
    const error = searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?outlook_error=${error}`);
    }

    if (!code || !state) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?outlook_error=missing_params`);
    }

    const userId = parseInt(state);

    // Verify the current session matches the OAuth state
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    // User MUST be authenticated to connect Outlook
    if (!token) {
      console.error('No auth token found during Outlook callback - user not authenticated');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/login?error=unauthenticated`);
    }

    const { verifyToken } = await import('@/lib/auth');
    const payload = verifyToken(token);

    // Verify token is valid and matches the OAuth state userId
    if (!payload) {
      console.error('Invalid auth token during Outlook callback');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/login?error=invalid_token`);
    }

    if (payload.userId !== userId) {
      console.error(`OAuth session mismatch: cookie userId ${payload.userId} != state userId ${userId}`);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?outlook_error=session_mismatch`);
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        code,
        redirect_uri: process.env.MICROSOFT_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/outlook/callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?outlook_error=token_exchange_failed`);
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokens;

    // Get user's email
    const userInfo = await getUserInfo(access_token);
    const email = userInfo.mail || userInfo.userPrincipalName;

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + expires_in * 1000);

    // Store tokens in database
    await sql`
      UPDATE users
      SET
        outlook_access_token = ${access_token},
        outlook_refresh_token = ${refresh_token},
        outlook_token_expires_at = ${expiresAt.toISOString()},
        outlook_connected = true,
        outlook_email = ${email}
      WHERE id = ${userId}
    `;

    // Get the user's details to create a fresh auth token
    const users = await sql`
      SELECT id, name, email, role
      FROM users
      WHERE id = ${userId}
    `;

    if (users.length === 0) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?outlook_error=user_not_found`);
    }

    const user = users[0];

    // Generate a fresh auth token for this user
    const { generateToken } = await import('@/lib/auth');
    const newToken = generateToken({ userId: user.id, email: user.email, role: user.role });

    // Create response with redirect
    const response = NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?outlook_connected=true`);

    // Delete the old cookie first to avoid conflicts
    response.cookies.delete('auth_token');

    // Set the fresh auth token cookie to ensure the user stays logged in as themselves
    response.cookies.set('auth_token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Error in Outlook callback:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?outlook_error=callback_failed`);
  }
}
