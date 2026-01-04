import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

interface ImportResult {
  success: number;
  errors: Array<{ row: number; error: string; data?: any }>;
  warnings: Array<{ row: number; message: string }>;
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Read file
    const buffer = await file.arrayBuffer();
    let data: any[] = [];

    if (file.name.endsWith('.csv')) {
      // Parse CSV
      const text = new TextDecoder().decode(buffer);
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      data = parsed.data;
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      // Parse Excel
      const workbook = XLSX.read(buffer);
      const sheetName = workbook.SheetNames[0];
      data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    } else {
      return NextResponse.json({ error: 'Invalid file format' }, { status: 400 });
    }

    const result: ImportResult = {
      success: 0,
      errors: [],
      warnings: [],
    };

    // Get existing clients to check for duplicates
    const existingClients = await sql`
      SELECT id, business_name, email
      FROM clients
    `;

    const clientMap = new Map<string, number>();
    existingClients.forEach((c: any) => {
      clientMap.set(c.business_name.toLowerCase(), c.id);
      if (c.email) {
        clientMap.set(c.email.toLowerCase(), c.id);
      }
    });

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2; // +2 because Excel rows start at 1 and first row is header

      try {
        // Validate required fields
        const businessName = row['Business Name'] || row['business_name'] || row['businessName'];

        if (!businessName) {
          result.errors.push({
            row: rowNumber,
            error: 'Business Name is required',
            data: row,
          });
          continue;
        }

        // Extract fields
        const businessAddress = row['Business Address'] || row['business_address'] || row['businessAddress'] || '';
        const website = row['Website'] || row['website'] || '';
        const primaryContact = row['Primary Contact'] || row['primary_contact'] || row['primaryContact'] || '';
        const email = row['Email'] || row['email'] || '';
        const phone = row['Phone'] || row['phone'] || '';

        // Check if client already exists
        const clientKey = email ? email.toLowerCase() : businessName.toLowerCase();
        if (clientMap.has(clientKey)) {
          result.errors.push({
            row: rowNumber,
            error: `Client "${businessName}" already exists`,
            data: row,
          });
          continue;
        }

        // Generate avatar
        const avatar = businessName
          .split(' ')
          .map((word: string) => word[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();

        // Create client
        await sql`
          INSERT INTO clients (
            business_name,
            business_address,
            website,
            primary_contact,
            email,
            phone,
            avatar
          ) VALUES (
            ${businessName},
            ${businessAddress || null},
            ${website || null},
            ${primaryContact || null},
            ${email || null},
            ${phone || null},
            ${avatar}
          )
        `;

        result.success++;

        // Add to map to prevent duplicates in same import
        clientMap.set(businessName.toLowerCase(), -1);
        if (email) {
          clientMap.set(email.toLowerCase(), -1);
        }

      } catch (error) {
        console.error(`Error processing row ${rowNumber}:`, error);
        result.errors.push({
          row: rowNumber,
          error: error instanceof Error ? error.message : 'Unknown error',
          data: row,
        });
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error importing clients:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import clients' },
      { status: 500 }
    );
  }
}
