import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import * as XLSX from 'xlsx';

interface ImportResult {
  success: number;
  errors: Array<{ row: number; error: string; data?: any }>;
  warnings: Array<{ row: number; message: string }>;
  clientsCreated: number;
}

export async function POST(request: Request) {
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

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let data: any[];

    // Parse file based on extension
    if (file.name.endsWith('.csv')) {
      const text = buffer.toString('utf-8');
      data = parseCSV(text);
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      const workbook = XLSX.read(buffer);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      data = XLSX.utils.sheet_to_json(worksheet);
    } else {
      return NextResponse.json({ error: 'Unsupported file format. Please upload CSV or Excel file.' }, { status: 400 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'File is empty or invalid' }, { status: 400 });
    }

    const result: ImportResult = {
      success: 0,
      errors: [],
      warnings: [],
      clientsCreated: 0,
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

    // Get highest project number
    const maxProjectNumber = await sql`
      SELECT MAX(CAST(SUBSTRING(project_number FROM '[0-9]+') AS INTEGER)) as max_num
      FROM projects
    `;

    let nextProjectNumber = (maxProjectNumber[0]?.max_num || 0) + 1;

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2; // +2 because Excel rows start at 1 and first row is header

      try {
        // Validate required fields
        const projectName = row['Project Name'] || row['project_name'] || row['projectName'];

        if (!projectName) {
          result.errors.push({
            row: rowNumber,
            error: 'Project Name is required',
            data: row,
          });
          continue;
        }

        // Extract fields
        const projectNumber = row['Project Number'] || row['project_number'] || row['projectNumber'] || String(nextProjectNumber).padStart(5, '0');
        const commonName = row['Common Name'] || row['common_name'] || row['commonName'] || '';
        const clientName = row['Client Name'] || row['client_name'] || row['clientName'] || '';
        const clientEmail = row['Client Email'] || row['client_email'] || row['clientEmail'] || '';
        const clientPhone = row['Client Phone'] || row['client_phone'] || row['clientPhone'] || '';
        let projectValue = row['Project Value'] || row['project_value'] || row['projectValue'] || null;
        let billingRate = row['Billing Rate'] || row['billing_rate'] || row['billingRate'] || null;
        const useTeamRatesStr = row['Use Team Rates'] || row['use_team_rates'] || row['useTeamRates'] || 'No';
        const useTeamRates = useTeamRatesStr === 'Yes' || useTeamRatesStr === 'true' || useTeamRatesStr === true;

        // Parse rates (remove $ and convert to number)
        if (projectValue) {
          projectValue = parseFloat(String(projectValue).replace(/[$,]/g, '')) || null;
        }
        if (billingRate) {
          billingRate = parseFloat(String(billingRate).replace(/[$,]/g, '')) || null;
        }

        // Handle client
        let clientId = null;
        if (clientName) {
          const clientKey = clientEmail ? clientEmail.toLowerCase() : clientName.toLowerCase();

          if (clientMap.has(clientKey)) {
            // Use existing client
            clientId = clientMap.get(clientKey);
          } else {
            // Create new client
            try {
              const newClient = await sql`
                INSERT INTO clients (business_name, email, phone)
                VALUES (${clientName}, ${clientEmail || null}, ${clientPhone || null})
                RETURNING id
              `;
              clientId = newClient[0].id;
              clientMap.set(clientName.toLowerCase(), clientId);
              if (clientEmail) {
                clientMap.set(clientEmail.toLowerCase(), clientId);
              }
              result.clientsCreated++;
              result.warnings.push({
                row: rowNumber,
                message: `Created new client: ${clientName}`,
              });
            } catch (error) {
              result.warnings.push({
                row: rowNumber,
                message: `Failed to create client "${clientName}", project will be created without client`,
              });
            }
          }
        }

        // Check if project already exists
        const existingProject = await sql`
          SELECT id FROM projects
          WHERE project_number = ${projectNumber}
        `;

        if (existingProject.length > 0) {
          result.errors.push({
            row: rowNumber,
            error: `Project number ${projectNumber} already exists`,
            data: row,
          });
          continue;
        }

        // Create project
        await sql`
          INSERT INTO projects (
            client_id,
            project_number,
            project_name,
            common_name,
            project_value,
            billing_rate,
            use_team_rates
          ) VALUES (
            ${clientId},
            ${projectNumber},
            ${projectName},
            ${commonName},
            ${projectValue},
            ${billingRate},
            ${useTeamRates}
          )
        `;

        result.success++;
        nextProjectNumber++;

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
    console.error('Error importing projects:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import projects' },
      { status: 500 }
    );
  }
}

function parseCSV(text: string): any[] {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] || '';
    });
    data.push(obj);
  }

  return data;
}

function parseCSVLine(line: string): string[] {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}
