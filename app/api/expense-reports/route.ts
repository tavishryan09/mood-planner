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

// GET - Fetch all expense reports
export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;

    const isAccountant = currentUser.role === 'Accountant' || currentUser.role === 'Admin';

    let reports;

    if (isAccountant) {
      // Accountants and Admins can see all expense reports
      reports = await sql`
        SELECT
          er.id,
          er.user_id as "userId",
          u.name as "userName",
          er.report_name as "reportName",
          er.submission_date as "submissionDate",
          er.status,
          er.total_amount as "totalAmount",
          er.notes,
          er.created_at as "createdAt",
          COUNT(eri.expense_id) as "expenseCount"
        FROM expense_reports er
        LEFT JOIN users u ON er.user_id = u.id
        LEFT JOIN expense_report_items eri ON er.id = eri.expense_report_id
        GROUP BY er.id, u.name
        ORDER BY er.submission_date DESC, er.created_at DESC
        LIMIT ${limit}
      `;
    } else {
      // Regular users can only see their own expense reports
      reports = await sql`
        SELECT
          er.id,
          er.report_name as "reportName",
          er.submission_date as "submissionDate",
          er.status,
          er.total_amount as "totalAmount",
          er.notes,
          er.created_at as "createdAt",
          COUNT(eri.expense_id) as "expenseCount"
        FROM expense_reports er
        LEFT JOIN expense_report_items eri ON er.id = eri.expense_report_id
        WHERE er.user_id = ${currentUser.id}
        GROUP BY er.id
        ORDER BY er.submission_date DESC, er.created_at DESC
        LIMIT ${limit}
      `;
    }

    return NextResponse.json(reports);
  } catch (error) {
    console.error('Error fetching expense reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expense reports' },
      { status: 500 }
    );
  }
}

// POST - Create a new expense report
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { reportName, expenseIds, notes } = body;

    // Validate required fields
    if (!reportName || !expenseIds || !Array.isArray(expenseIds) || expenseIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: reportName and expenseIds (non-empty array) are required' },
        { status: 400 }
      );
    }

    // Fetch the expenses to validate they belong to the user and calculate total
    const expenses = await sql`
      SELECT id, amount, status, user_id as "userId"
      FROM expenses
      WHERE id = ANY(${expenseIds})
    `;

    if (expenses.length !== expenseIds.length) {
      return NextResponse.json(
        { error: 'One or more expense IDs are invalid' },
        { status: 400 }
      );
    }

    // Verify all expenses belong to the current user
    const invalidExpenses = expenses.filter((exp: any) => exp.userId !== currentUser.id);
    if (invalidExpenses.length > 0) {
      return NextResponse.json(
        { error: 'You can only include your own expenses in a report' },
        { status: 403 }
      );
    }

    // Verify all expenses are in Unsubmitted status
    const submittedExpenses = expenses.filter((exp: any) => exp.status !== 'Unsubmitted');
    if (submittedExpenses.length > 0) {
      return NextResponse.json(
        { error: 'Only unsubmitted expenses can be added to a report' },
        { status: 400 }
      );
    }

    // Calculate total amount
    const totalAmount = expenses.reduce((sum: number, exp: any) => sum + parseFloat(exp.amount), 0);

    // Create the expense report
    const reportResult = await sql`
      INSERT INTO expense_reports (
        user_id,
        report_name,
        total_amount,
        notes,
        status
      )
      VALUES (
        ${currentUser.id},
        ${reportName},
        ${totalAmount},
        ${notes || null},
        'Submitted'
      )
      RETURNING
        id,
        user_id as "userId",
        report_name as "reportName",
        submission_date as "submissionDate",
        status,
        total_amount as "totalAmount",
        notes,
        created_at as "createdAt"
    `;

    const report = reportResult[0];

    // Add userName to the report object
    report.userName = currentUser.name;

    // Add expenses to the report
    for (const expenseId of expenseIds) {
      await sql`
        INSERT INTO expense_report_items (expense_report_id, expense_id)
        VALUES (${report.id}, ${expenseId})
      `;
    }

    // Update expense statuses to 'Submitted'
    await sql`
      UPDATE expenses
      SET status = 'Submitted'
      WHERE id = ANY(${expenseIds})
    `;

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error('Error creating expense report:', error);
    return NextResponse.json(
      { error: 'Failed to create expense report' },
      { status: 500 }
    );
  }
}
