import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import * as XLSX from 'xlsx';

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
    const format = searchParams.get('format') || 'xlsx';

    // Fetch all projects for the user
    const projects = await sql`
      SELECT
        p.id,
        p.project_number as "projectNumber",
        p.project_name as "projectName",
        p.common_name as "commonName",
        p.project_value as "projectValue",
        p.billing_rate as "billingRate",
        p.use_team_rates as "useTeamRates",
        c.business_name as "clientName",
        c.email as "clientEmail",
        c.phone as "clientPhone",
        p.created_at as "createdAt"
      FROM projects p
      LEFT JOIN clients c ON p.client_id = c.id
      ORDER BY p.project_number DESC
    `;

    // Transform data for export
    const exportData = projects.map((p: any) => ({
      'Project Number': p.projectNumber || '',
      'Project Name': p.projectName,
      'Common Name': p.commonName || '',
      'Client Name': p.clientName || '',
      'Client Email': p.clientEmail || '',
      'Client Phone': p.clientPhone || '',
      'Project Value': p.projectValue ? `$${p.projectValue}` : '',
      'Billing Rate': p.billingRate ? `$${p.billingRate}` : '',
      'Use Team Rates': p.useTeamRates ? 'Yes' : 'No',
      'Created At': new Date(p.createdAt).toLocaleDateString(),
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
          'Content-Disposition': `attachment; filename="projects-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    } else {
      // Generate Excel
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Projects');

      // Set column widths
      const colWidths = [
        { wch: 15 }, // Project Number
        { wch: 30 }, // Project Name
        { wch: 20 }, // Common Name
        { wch: 25 }, // Client Name
        { wch: 25 }, // Client Email
        { wch: 15 }, // Client Phone
        { wch: 15 }, // Project Value
        { wch: 15 }, // Billing Rate
        { wch: 15 }, // Use Team Rates
        { wch: 15 }, // Created At
      ];
      worksheet['!cols'] = colWidths;

      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      return new NextResponse(excelBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="projects-${new Date().toISOString().split('T')[0]}.xlsx"`,
        },
      });
    }
  } catch (error) {
    console.error('Error exporting projects:', error);
    return NextResponse.json({ error: 'Failed to export projects' }, { status: 500 });
  }
}
