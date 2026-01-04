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

// PUT - Update an expense
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
    const expenseId = parseInt(id);

    if (isNaN(expenseId)) {
      return NextResponse.json(
        { error: 'Invalid expense ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { expenseDate, category, description, amount, projectId, notes, status, receiptImage, receiptFilename } = body;

    // Validate required fields
    if (!expenseDate || !category || !description || amount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate amount is a positive number
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    // Verify the expense belongs to the current user
    const existingExpense = await sql`
      SELECT id FROM expenses
      WHERE id = ${expenseId} AND user_id = ${currentUser.id}
    `;

    if (existingExpense.length === 0) {
      return NextResponse.json(
        { error: 'Expense not found or unauthorized' },
        { status: 404 }
      );
    }

    // Update the expense
    await sql`
      UPDATE expenses
      SET
        expense_date = ${expenseDate},
        category = ${category},
        description = ${description},
        amount = ${amount},
        project_id = ${projectId || null},
        notes = ${notes || null},
        status = ${status || 'Unsubmitted'},
        receipt_image = ${receiptImage || null},
        receipt_filename = ${receiptFilename || null}
      WHERE id = ${expenseId}
    `;

    // Fetch the updated expense with project details
    const result = await sql`
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
        e.receipt_image as "receiptImage",
        e.receipt_filename as "receiptFilename",
        e.created_at as "createdAt"
      FROM expenses e
      LEFT JOIN projects p ON e.project_id = p.id
      WHERE e.id = ${expenseId}
    `;

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating expense:', error);
    return NextResponse.json(
      { error: 'Failed to update expense' },
      { status: 500 }
    );
  }
}

// DELETE - Delete an expense
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
    const expenseId = parseInt(id);

    if (isNaN(expenseId)) {
      return NextResponse.json(
        { error: 'Invalid expense ID' },
        { status: 400 }
      );
    }

    // Verify the expense belongs to the current user and delete it
    const result = await sql`
      DELETE FROM expenses
      WHERE id = ${expenseId} AND user_id = ${currentUser.id}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Expense not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json(
      { error: 'Failed to delete expense' },
      { status: 500 }
    );
  }
}
