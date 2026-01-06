import { useState } from 'react';

export function useProjectsImportExport(fetchProjects: () => Promise<void>) {
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const handleExportExcel = async () => {
    try {
      const response = await fetch('/api/projects/export?format=xlsx');
      if (!response.ok) throw new Error('Failed to export');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `projects-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Failed to export projects');
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await fetch('/api/projects/export?format=csv');
      if (!response.ok) throw new Error('Failed to export');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `projects-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      alert('Failed to export projects');
    }
  };

  const handleImport = async () => {
    if (!importFile) return;

    setImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const response = await fetch('/api/projects/import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to import');
      }

      setImportResult(result);

      // Refresh projects list if any were imported successfully
      if (result.success > 0) {
        fetchProjects();
      }
    } catch (error) {
      console.error('Error importing projects:', error);
      setImportResult({
        success: 0,
        errors: [{ row: 0, error: error instanceof Error ? error.message : 'Failed to import' }],
        warnings: [],
        clientsCreated: 0,
      });
    } finally {
      setImporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ];

      if (!validTypes.includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
        alert('Please select a valid CSV or Excel file');
        return;
      }

      setImportFile(file);
      setImportResult(null);
    }
  };

  const handleDownloadTemplate = () => {
    const template = [
      ['Project Number', 'Project Name', 'Common Name', 'Client Name', 'Client Email', 'Client Phone', 'Project Value', 'Billing Rate', 'Use Team Rates'],
      ['24001', 'Sample Project', 'Sample', 'John Doe', 'john@example.com', '555-1234', '50000', '150', 'No'],
      ['24002', 'Another Project', '', 'Jane Smith', 'jane@example.com', '555-5678', '75000', '175', 'Yes'],
    ];

    const csvContent = template.map(row =>
      row.map(cell => {
        const escaped = String(cell).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project-import-template.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return {
    importFile,
    importing,
    importResult,
    handleExportExcel,
    handleExportCSV,
    handleImport,
    handleFileChange,
    handleDownloadTemplate,
    setImportFile,
    setImportResult
  };
}
