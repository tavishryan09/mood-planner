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

// GET - Fetch receipt image for a specific expense
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
    const expenseId = parseInt(id);

    if (isNaN(expenseId)) {
      return NextResponse.json(
        { error: 'Invalid expense ID' },
        { status: 400 }
      );
    }

    // Accountants can view any receipt, others can only view their own
    const isAccountant = currentUser.role === 'Accountant';
    let result;

    if (isAccountant) {
      result = await sql`
        SELECT receipt_image as "receiptImage", receipt_filename as "receiptFilename"
        FROM expenses
        WHERE id = ${expenseId}
      `;
    } else {
      result = await sql`
        SELECT receipt_image as "receiptImage", receipt_filename as "receiptFilename"
        FROM expenses
        WHERE id = ${expenseId} AND user_id = ${currentUser.id}
      `;
    }

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Expense not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error fetching receipt:', error);
    return NextResponse.json(
      { error: 'Failed to fetch receipt' },
      { status: 500 }
    );
  }
}
