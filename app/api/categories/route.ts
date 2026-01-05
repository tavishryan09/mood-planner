import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const categories = await sql`
      SELECT id, name, color, created_at as "createdAt"
      FROM categories
      ORDER BY name ASC
    `;

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, color } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO categories (name, color)
      VALUES (${name}, ${color || 'badge-ghost'})
      RETURNING id, name, color, created_at as "createdAt"
    `;

    return NextResponse.json(result[0]);
  } catch (error: any) {
    if (error.code === '23505') { // Unique violation
      return NextResponse.json(
        { error: 'Category already exists' },
        { status: 409 }
      );
    }
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}
