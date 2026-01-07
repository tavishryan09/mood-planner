import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

// GET - Download expense report as PDF
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

    const isAccountant = currentUser.role === 'Accountant';

    // Fetch the report
    let report;
    if (isAccountant) {
      report = await sql`
        SELECT
          er.id,
          er.user_id as "userId",
          u.name as "userName",
          u.email as "userEmail",
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
          er.user_id as "userId",
          u.name as "userName",
          u.email as "userEmail",
          er.report_name as "reportName",
          er.submission_date as "submissionDate",
          er.status,
          er.total_amount as "totalAmount",
          er.notes,
          er.created_at as "createdAt"
        FROM expense_reports er
        LEFT JOIN users u ON er.user_id = u.id
        WHERE er.id = ${reportId} AND er.user_id = ${currentUser.id}
      `;
    }

    if (report.length === 0) {
      return NextResponse.json(
        { error: 'Report not found or unauthorized' },
        { status: 404 }
      );
    }

    const reportData = report[0];

    // Fetch the expenses in this report with receipt images
    const expenses = await sql`
      SELECT
        e.id,
        e.expense_date as "expenseDate",
        e.category,
        e.description,
        e.amount,
        e.notes,
        e.project_id as "projectId",
        p.project_name as "projectName",
        p.project_number as "projectNumber",
        e.receipt_image as "receiptImage",
        e.receipt_filename as "receiptFilename"
      FROM expense_report_items eri
      JOIN expenses e ON eri.expense_id = e.id
      LEFT JOIN projects p ON e.project_id = p.id
      WHERE eri.expense_report_id = ${reportId}
      ORDER BY e.expense_date DESC
    `;

    // Generate PDF
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.text('Expense Report', 105, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.text(`Report: ${reportData.reportName}`, 20, 35);
    doc.text(`Submitted by: ${reportData.userName}`, 20, 42);
    doc.text(`Email: ${reportData.userEmail}`, 20, 49);
    doc.text(`Submission Date: ${new Date(reportData.submissionDate).toLocaleDateString()}`, 20, 56);
    doc.text(`Status: ${reportData.status}`, 20, 63);
    doc.text(`Total Amount: $${parseFloat(reportData.totalAmount).toFixed(2)}`, 20, 70);

    if (reportData.notes) {
      doc.setFontSize(10);
      doc.text(`Notes: ${reportData.notes}`, 20, 77);
    }

    // Expenses table
    const tableData = expenses.map((exp: any) => [
      new Date(exp.expenseDate).toLocaleDateString(),
      exp.category,
      exp.description || '-',
      exp.projectNumber ? `${exp.projectNumber} - ${exp.projectName}` : '-',
      `$${parseFloat(exp.amount).toFixed(2)}`,
      exp.notes || '-'
    ]);

    autoTable(doc, {
      startY: 85,
      head: [['Date', 'Category', 'Description', 'Project', 'Amount', 'Notes']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [32, 52, 54] },
      foot: [['', '', '', 'Total:', `$${parseFloat(reportData.totalAmount).toFixed(2)}`, '']],
      footStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    // Add receipt images on following pages
    const expensesWithReceipts = expenses.filter((exp: any) => exp.receiptImage);

    for (let i = 0; i < expensesWithReceipts.length; i++) {
      const exp = expensesWithReceipts[i];
      doc.addPage();

      doc.setFontSize(14);
      doc.text(`Receipt ${i + 1}: ${exp.category}`, 20, 20);
      doc.setFontSize(10);
      doc.text(`Date: ${new Date(exp.expenseDate).toLocaleDateString()}`, 20, 28);
      doc.text(`Amount: $${parseFloat(exp.amount).toFixed(2)}`, 20, 35);
      if (exp.description) {
        doc.text(`Description: ${exp.description}`, 20, 42);
      }

      // Add receipt image
      try {
        const imgData = exp.receiptImage;
        const imgFormat = exp.receiptFilename?.toLowerCase().endsWith('.png') ? 'PNG' : 'JPEG';

        // Calculate image dimensions to fit on page while maintaining aspect ratio
        const maxWidth = 170;
        const maxHeight = 220;

        // Get image properties from jsPDF
        const imgProps = doc.getImageProperties(imgData);
        const imgWidth = imgProps.width;
        const imgHeight = imgProps.height;

        // Calculate scale to fit within max dimensions while maintaining aspect ratio
        const widthRatio = maxWidth / imgWidth;
        const heightRatio = maxHeight / imgHeight;
        const scale = Math.min(widthRatio, heightRatio, 1); // Don't upscale

        const scaledWidth = imgWidth * scale;
        const scaledHeight = imgHeight * scale;

        // Add image centered
        const xPos = (doc.internal.pageSize.width - scaledWidth) / 2;
        const yPos = 50;

        doc.addImage(imgData, imgFormat, xPos, yPos, scaledWidth, scaledHeight);
      } catch (error) {
        console.error('Error adding receipt image:', error);
        doc.text('Error loading receipt image', 20, 60);
      }
    }

    // Generate PDF buffer
    const pdfBuffer = doc.output('arraybuffer');

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="expense-report-${reportId}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
