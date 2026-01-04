import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';

    // Fetch all clients
    const clients = await sql`
      SELECT
        id,
        business_name as "businessName",
        business_address as "businessAddress",
        website,
        primary_contact as "primaryContact",
        email,
        phone,
        created_at as "createdAt"
      FROM clients
      ORDER BY business_name
    `;

    // Transform data for export
    const exportData = clients.map((c: any) => ({
      'Business Name': c.businessName,
      'Business Address': c.businessAddress || '',
      'Website': c.website || '',
      'Primary Contact': c.primaryContact || '',
      'Email': c.email || '',
      'Phone': c.phone || '',
      'Created At': new Date(c.createdAt).toLocaleDateString(),
    }));

    if (format === 'csv') {
      // Generate CSV
      const headers = Object.keys(exportData[0] || {});
      const csvRows = [
        headers.join(','),
        ...exportData.map((row: any) =>
          headers.map(header => {
            const value = row[header as keyof typeof row];
            // Escape commas and quotes
            const escaped = String(value).replace(/"/g, '""');
            return `"${escaped}"`;
          }).join(',')
        ),
      ];

      const csv = csvRows.join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="clients-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
  } catch (error) {
    console.error('Error exporting clients:', error);
    return NextResponse.json({ error: 'Failed to export clients' }, { status: 500 });
  }
}
