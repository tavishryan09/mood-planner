import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { businessName, businessAddress, website, primaryContact, email, phone, avatarUrl } = body;

    const avatar = businessName
      .split(' ')
      .map((word: string) => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    const result = await sql`
      UPDATE clients
      SET
        business_name = ${businessName},
        business_address = ${businessAddress},
        website = ${website},
        primary_contact = ${primaryContact},
        email = ${email},
        phone = ${phone},
        avatar = ${avatar},
        avatar_url = ${avatarUrl || null}
      WHERE id = ${id}
      RETURNING
        id,
        business_name as "businessName",
        business_address as "businessAddress",
        website,
        primary_contact as "primaryContact",
        email,
        phone,
        avatar,
        avatar_url as "avatarUrl",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating client:', error);
    return NextResponse.json(
      { error: 'Failed to update client' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await sql`
      DELETE FROM clients
      WHERE id = ${id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json(
      { error: 'Failed to delete client' },
      { status: 500 }
    );
  }
}
