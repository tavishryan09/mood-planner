import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const clients = await sql`
      SELECT
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
      FROM clients
      ORDER BY created_at DESC
    `;

    // Fetch projects for each client
    const clientsWithProjects = await Promise.all(
      clients.map(async (client) => {
        const projects = await sql`
          SELECT
            id,
            project_number as "projectNumber",
            project_name as "projectName",
            common_name as "commonName",
            project_value as "projectValue"
          FROM projects
          WHERE client_id = ${client.id}
          ORDER BY created_at DESC
        `;

        return {
          ...client,
          projects: projects || []
        };
      })
    );

    return NextResponse.json(clientsWithProjects);
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { businessName, businessAddress, website, primaryContact, email, phone, avatarUrl } = body;

    const avatar = businessName
      .split(' ')
      .map((word: string) => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    const result = await sql`
      INSERT INTO clients (
        business_name,
        business_address,
        website,
        primary_contact,
        email,
        phone,
        avatar,
        avatar_url
      )
      VALUES (
        ${businessName},
        ${businessAddress},
        ${website},
        ${primaryContact},
        ${email},
        ${phone},
        ${avatar},
        ${avatarUrl || null}
      )
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

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json(
      { error: 'Failed to create client' },
      { status: 500 }
    );
  }
}
