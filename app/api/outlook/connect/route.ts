import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export async function GET() {
  try {
    // Verify user is authenticated
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Microsoft OAuth configuration
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const redirectUri = process.env.MICROSOFT_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/outlook/callback`;
    const scope = 'offline_access User.Read Calendars.ReadWrite';

    if (!clientId) {
      return NextResponse.json({ error: 'Microsoft OAuth not configured' }, { status: 500 });
    }

    // Build OAuth URL
    const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('scope', scope);
    authUrl.searchParams.append('state', payload.userId.toString());
    authUrl.searchParams.append('response_mode', 'query');

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('Error initiating Outlook connection:', error);
    return NextResponse.json({ error: 'Failed to initiate connection' }, { status: 500 });
  }
}
