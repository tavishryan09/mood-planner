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

// GET - Fetch all expenses for the current user
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
    const projectId = searchParams.get('projectId');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;

    let expenses;

    if (projectId) {
      // Get expenses for a specific project
      expenses = await sql`
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
        WHERE e.user_id = ${currentUser.id}
          AND e.project_id = ${projectId}
        ORDER BY e.expense_date DESC, e.created_at DESC
        LIMIT ${limit}
      `;
    } else {
      // Get all expenses for the user
      expenses = await sql`
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
        WHERE e.user_id = ${currentUser.id}
        ORDER BY e.expense_date DESC, e.created_at DESC
        LIMIT ${limit}
      `;
    }

    return NextResponse.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expenses' },
      { status: 500 }
    );
  }
}

// POST - Create a new expense
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

    // Insert the new expense
    const result = await sql`
      INSERT INTO expenses (
        user_id,
        project_id,
        expense_date,
        category,
        description,
        amount,
        notes,
        status,
        receipt_image,
        receipt_filename
      )
      VALUES (
        ${currentUser.id},
        ${projectId || null},
        ${expenseDate},
        ${category},
        ${description},
        ${amount},
        ${notes || null},
        ${status || 'Unsubmitted'},
        ${receiptImage || null},
        ${receiptFilename || null}
      )
      RETURNING
        id,
        expense_date as "expenseDate",
        category,
        description,
        amount,
        notes,
        status,
        project_id as "projectId",
        receipt_image as "receiptImage",
        receipt_filename as "receiptFilename",
        created_at as "createdAt"
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json(
      { error: 'Failed to create expense' },
      { status: 500 }
    );
  }
}
