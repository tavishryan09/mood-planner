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

// GET - Fetch a single expense report with its expenses
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const reportId = parseInt(id);

    if (isNaN(reportId)) {
      return NextResponse.json(
        { error: 'Invalid report ID' },
        { status: 400 }
      );
    }

    const isAccountant = currentUser.role === 'Accountant' || currentUser.role === 'Admin';

    // Fetch the report
    let report;
    if (isAccountant) {
      report = await sql`
        SELECT
          er.id,
          er.user_id as "userId",
          u.name as "userName",
          er.report_name as "reportName",
          er.submission_date as "submissionDate",
          er.status,
          er.total_amount as "totalAmount",
          er.notes,
          er.created_at as "createdAt"
        FROM expense_reports er
        LEFT JOIN users u ON er.user_id = u.id
        WHERE er.id = ${reportId}
      `;
    } else {
      report = await sql`
        SELECT
          er.id,
          er.report_name as "reportName",
          er.submission_date as "submissionDate",
          er.status,
          er.total_amount as "totalAmount",
          er.notes,
          er.created_at as "createdAt"
        FROM expense_reports er
        WHERE er.id = ${reportId} AND er.user_id = ${currentUser.id}
      `;
    }

    if (report.length === 0) {
      return NextResponse.json(
        { error: 'Report not found or unauthorized' },
        { status: 404 }
      );
    }

    // Fetch the expenses in this report
    const expenses = await sql`
      SELECT
        e.id,
        e.expense_date as "expenseDate",
        e.category,
        e.description,
        e.amount,
        e.notes,
        e.status,
        e.project_id as "projectId",
        p.project_name as "projectName",
        p.project_number as "projectNumber",
        e.receipt_filename as "receiptFilename"
      FROM expense_report_items eri
      JOIN expenses e ON eri.expense_id = e.id
      LEFT JOIN projects p ON e.project_id = p.id
      WHERE eri.expense_report_id = ${reportId}
      ORDER BY e.expense_date DESC
    `;

    return NextResponse.json({
      ...report[0],
      expenses
    });
  } catch (error) {
    console.error('Error fetching expense report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expense report' },
      { status: 500 }
    );
  }
}

// PUT - Update expense report (accountants only can change status)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const reportId = parseInt(id);

    if (isNaN(reportId)) {
      return NextResponse.json(
        { error: 'Invalid report ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status, notes } = body;

    const isAccountant = currentUser.role === 'Accountant' || currentUser.role === 'Admin';

    // Only accountants and admins can update expense reports
    if (!isAccountant) {
      return NextResponse.json(
        { error: 'Only accountants and admins can update expense reports' },
        { status: 403 }
      );
    }

    // Verify the report exists
    const existingReport = await sql`
      SELECT id FROM expense_reports
      WHERE id = ${reportId}
    `;

    if (existingReport.length === 0) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Update the report
    await sql`
      UPDATE expense_reports
      SET
        status = COALESCE(${status}, status),
        notes = COALESCE(${notes}, notes)
      WHERE id = ${reportId}
    `;

    // Fetch the updated report
    const result = await sql`
      SELECT
        er.id,
        er.user_id as "userId",
        u.name as "userName",
        er.report_name as "reportName",
        er.submission_date as "submissionDate",
        er.status,
        er.total_amount as "totalAmount",
        er.notes,
        er.created_at as "createdAt"
      FROM expense_reports er
      LEFT JOIN users u ON er.user_id = u.id
      WHERE er.id = ${reportId}
    `;

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating expense report:', error);
    return NextResponse.json(
      { error: 'Failed to update expense report' },
      { status: 500 }
    );
  }
}

// DELETE - Delete an expense report
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const reportId = parseInt(id);

    if (isNaN(reportId)) {
      return NextResponse.json(
        { error: 'Invalid report ID' },
        { status: 400 }
      );
    }

    const isAccountant = currentUser.role === 'Accountant' || currentUser.role === 'Admin';

    // Fetch the report to check ownership
    const report = await sql`
      SELECT id, user_id as "userId", status
      FROM expense_reports
      WHERE id = ${reportId}
    `;

    if (report.length === 0) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Only allow deletion if:
    // 1. User owns the report and it's not yet approved/paid, OR
    // 2. User is an accountant/admin
    const canDelete = isAccountant ||
      (report[0].userId === currentUser.id &&
       report[0].status !== 'Approved' &&
       report[0].status !== 'Paid');

    if (!canDelete) {
      return NextResponse.json(
        { error: 'Cannot delete approved or paid reports unless you are an accountant' },
        { status: 403 }
      );
    }

    // Get all expense IDs in this report
    const expenseItems = await sql`
      SELECT expense_id as "expenseId"
      FROM expense_report_items
      WHERE expense_report_id = ${reportId}
    `;

    // Delete report items
    await sql`
      DELETE FROM expense_report_items
      WHERE expense_report_id = ${reportId}
    `;

    // Delete the report
    await sql`
      DELETE FROM expense_reports
      WHERE id = ${reportId}
    `;

    // Set expenses back to Unsubmitted status
    if (expenseItems.length > 0) {
      const expenseIds = expenseItems.map((item: any) => item.expenseId);
      await sql`
        UPDATE expenses
        SET status = 'Unsubmitted'
        WHERE id = ANY(${expenseIds})
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting expense report:', error);
    return NextResponse.json(
      { error: 'Failed to delete expense report' },
      { status: 500 }
    );
  }
}
