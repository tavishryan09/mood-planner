'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import ExpenseModal from '@/components/accounting/ExpenseModal';
import ExpenseReportModal from '@/components/accounting/ExpenseReportModal';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountingData } from '@/hooks/accounting/useAccountingData';
import { useExpenseManagement } from '@/hooks/accounting/useExpenseManagement';

export default function Billing() {
  const { user } = useAuth();
  const isAccountant = user?.role === 'Accountant';
  const canEditStatus = user?.role === 'Accountant' || user?.role === 'Admin';

  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<{ image: string; description: string } | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const [selectedExpenses, setSelectedExpenses] = useState<number[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);

  const handleViewReceipt = async (expenseId: number, description: string) => {
    setLoadingReceipt(true);
    setShowReceiptModal(true);
    setSelectedReceipt({ image: '', description });

    try {
      const response = await fetch(`/api/expenses/${expenseId}/receipt`);
      if (response.ok) {
        const data = await response.json();
        if (data.receiptImage) {
          setSelectedReceipt({ image: data.receiptImage, description });
        } else {
          setSelectedReceipt(null);
          setShowReceiptModal(false);
          alert('No receipt image found');
        }
      } else {
        setSelectedReceipt(null);
        setShowReceiptModal(false);
        alert('Failed to load receipt');
      }
    } catch (error) {
      console.error('Error loading receipt:', error);
      setSelectedReceipt(null);
      setShowReceiptModal(false);
      alert('Failed to load receipt');
    } finally {
      setLoadingReceipt(false);
    }
  };

  const handleToggleExpense = (expenseId: number) => {
    setSelectedExpenses(prev =>
      prev.includes(expenseId)
        ? prev.filter(id => id !== expenseId)
        : [...prev, expenseId]
    );
  };

  const handleToggleAll = () => {
    const unsubmittedExpenses = expenses.filter(exp => exp.status === 'Unsubmitted');
    if (selectedExpenses.length === unsubmittedExpenses.length && unsubmittedExpenses.length > 0) {
      setSelectedExpenses([]);
    } else {
      setSelectedExpenses(unsubmittedExpenses.map(exp => exp.id));
    }
  };

  const handleDownloadReport = async (reportId: number, reportName: string) => {
    try {
      const response = await fetch(`/api/expense-reports/${reportId}/download`);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `expense-report-${reportId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to download report');
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report');
    }
  };

  const handleCreateReport = async (reportName: string, notes: string) => {
    setSubmittingReport(true);
    try {
      const response = await fetch('/api/expense-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportName,
          expenseIds: selectedExpenses,
          notes: notes.trim() || undefined,
        }),
      });

      if (response.ok) {
        const report = await response.json();

        // Update the expenses in the local state to reflect their new status
        setExpenses(prevExpenses =>
          prevExpenses.map(exp =>
            selectedExpenses.includes(exp.id)
              ? { ...exp, status: 'Submitted' }
              : exp
          )
        );

        // Add the new report to the expense reports list
        setExpenseReports(prevReports => [
          { ...report, expenseCount: selectedExpenses.length },
          ...prevReports
        ]);

        setSelectedExpenses([]);
        setShowReportModal(false);
        alert(`Expense report "${reportName}" created successfully!`);
      } else {
        const error = await response.json();
        alert(`Failed to create report: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating expense report:', error);
      alert('Failed to create expense report');
    } finally {
      setSubmittingReport(false);
    }
  };

  // Accounting data
  const { projects, expenses, setExpenses, expenseReports, setExpenseReports, loading } = useAccountingData();

  // Expense management
  const {
    showExpenseModal,
    editingExpenseId,
    formData,
    submitting,
    showNewCategory,
    newCategory,
    receiptFile,
    receiptPreview,
    setFormData,
    handleReceiptUpload,
    removeReceipt,
    handleEditExpense,
    handleAddNew,
    handleSubmitExpense,
    handleDeleteExpense,
    closeModal,
    setShowNewCategory,
    setNewCategory
  } = useExpenseManagement(expenses, setExpenses);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';

    // Handle YYYY-MM-DD format by parsing in local timezone
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }

    // Handle ISO timestamps by extracting the date part
    if (dateString.includes('T')) {
      const datePart = dateString.split('T')[0];
      const [year, month, day] = datePart.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }

    // Fallback for other formats
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Sidebar
      title="Accounting"
      hideNavbar={true}
    >
      <div className="p-4">
        <div className="card bg-base-100">
          <div className="card-body p-0 lg:p-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="card-title">Accounting</h2>
              <div className="flex gap-2">
                <button
                  className="btn btn-primary btn-sm gap-2"
                  onClick={handleAddNew}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Expense
                </button>
                <button
                  className="btn btn-primary btn-sm gap-2"
                  onClick={() => setShowInvoiceModal(true)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Invoice
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {/* Expense Reports Section */}
              <div className="card bg-base-100 border border-base-300">
                <div className="card-body">
                  <h2 className="card-title">Expense Reports</h2>
                  {loading ? (
                    <div className="space-y-2">
                      <div className="skeleton h-12"></div>
                      <div className="skeleton h-12"></div>
                    </div>
                  ) : expenseReports.length === 0 ? (
                    <p className="text-sm text-base-content/70">No expense reports yet</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="table table-sm">
                        <thead>
                          <tr>
                            <th>Report Name</th>
                            {isAccountant && <th>Submitted By</th>}
                            <th>Submission Date</th>
                            <th>Status</th>
                            <th className="text-right">Total Amount</th>
                            <th className="text-center">Expenses</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expenseReports.map((report) => (
                            <tr key={report.id} className="hover">
                              <td>
                                <div className="font-medium">{report.reportName}</div>
                                {report.notes && (
                                  <div className="text-xs text-base-content/60">{report.notes}</div>
                                )}
                              </td>
                              {isAccountant && (
                                <td>
                                  <div className="text-sm">{report.userName || 'Unknown'}</div>
                                </td>
                              )}
                              <td>{formatDate(report.submissionDate)}</td>
                              <td>
                                <span className={`badge badge-sm ${
                                  report.status === 'Paid' ? 'badge-success' :
                                  report.status === 'Approved' ? 'badge-info' :
                                  report.status === 'Rejected' ? 'badge-error' :
                                  report.status === 'In Review' ? 'badge-warning' :
                                  'badge-ghost'
                                }`}>
                                  {report.status}
                                </span>
                              </td>
                              <td className="text-right font-medium">
                                {formatCurrency(report.totalAmount)}
                              </td>
                              <td className="text-center">
                                <span className="badge badge-sm badge-ghost">
                                  {report.expenseCount}
                                </span>
                              </td>
                              <td>
                                <button
                                  className="btn btn-ghost btn-xs gap-1"
                                  onClick={() => handleDownloadReport(report.id, report.reportName)}
                                  title="Download PDF"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  PDF
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              <div className="card bg-base-100 border border-base-300">
                <div className="card-body">
                  <h2 className="card-title">Recent Invoices</h2>
                  <p className="text-sm text-base-content/70">No invoices yet</p>
                </div>
              </div>

              <div className="card bg-base-100 border border-base-300">
                <div className="card-body">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="card-title">Recent Expenses</h2>
                    {selectedExpenses.length > 0 && (
                      <button
                        className="btn btn-primary btn-sm gap-2"
                        onClick={() => setShowReportModal(true)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Create Report ({selectedExpenses.length})
                      </button>
                    )}
                  </div>
              {loading ? (
                <div className="space-y-2">
                  <div className="skeleton h-12"></div>
                  <div className="skeleton h-12"></div>
                </div>
              ) : expenses.length === 0 ? (
                <p className="text-sm text-base-content/70">No expenses yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>
                          <input
                            type="checkbox"
                            className="checkbox checkbox-sm"
                            checked={
                              expenses.filter(exp => exp.status === 'Unsubmitted').length > 0 &&
                              selectedExpenses.length === expenses.filter(exp => exp.status === 'Unsubmitted').length
                            }
                            onChange={handleToggleAll}
                          />
                        </th>
                        <th>Date</th>
                        {isAccountant && <th>User</th>}
                        <th>Description</th>
                        <th>Category</th>
                        <th>Project</th>
                        <th>Status</th>
                        <th className="text-right">Amount</th>
                        <th>Receipt</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((expense) => (
                        <tr key={expense.id} className="hover">
                          <td>
                            <input
                              type="checkbox"
                              className="checkbox checkbox-sm"
                              checked={selectedExpenses.includes(expense.id)}
                              onChange={() => handleToggleExpense(expense.id)}
                              disabled={expense.status !== 'Unsubmitted'}
                            />
                          </td>
                          <td>{formatDate(expense.expenseDate)}</td>
                          {isAccountant && (
                            <td>
                              <div className="text-sm font-medium">{expense.userName || 'Unknown'}</div>
                            </td>
                          )}
                          <td>
                            <div className="font-medium">{expense.description}</div>
                            {expense.notes && (
                              <div className="text-xs text-base-content/60">{expense.notes}</div>
                            )}
                          </td>
                          <td>
                            <span className="badge badge-sm">{expense.category}</span>
                          </td>
                          <td>
                            {expense.projectName ? (
                              <div className="text-sm">
                                <span className="font-mono text-xs text-base-content/60">
                                  {expense.projectNumber}
                                </span>
                                {' - '}
                                <span>{expense.projectName}</span>
                              </div>
                            ) : (
                              <span className="text-base-content/40">—</span>
                            )}
                          </td>
                          <td>
                            <span className={`badge badge-sm ${
                              expense.status === 'Paid' ? 'badge-success' :
                              expense.status === 'Approved' || expense.status === 'Posted' ? 'badge-info' :
                              expense.status === 'Rejected' ? 'badge-error' :
                              expense.status === 'In Review' || expense.status === 'Submitted' ? 'badge-warning' :
                              'badge-ghost'
                            }`}>
                              {expense.status}
                            </span>
                          </td>
                          <td className="text-right font-medium">
                            {formatCurrency(expense.amount)}
                          </td>
                          <td>
                            {(expense.receiptFilename || expense.receiptImage) && (
                              <button
                                className="btn btn-ghost btn-xs"
                                onClick={() => handleViewReceipt(expense.id, expense.description)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </button>
                            )}
                          </td>
                          <td>
                            <button
                              className="btn btn-ghost btn-xs"
                              onClick={() => handleEditExpense(expense)}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ExpenseModal
        show={showExpenseModal}
        editingExpenseId={editingExpenseId}
        formData={formData}
        projects={projects}
        submitting={submitting}
        showNewCategory={showNewCategory}
        newCategory={newCategory}
        receiptPreview={receiptPreview}
        receiptFile={receiptFile}
        canEditStatus={canEditStatus}
        onClose={closeModal}
        onSubmit={handleSubmitExpense}
        onDelete={handleDeleteExpense}
        onFormDataChange={setFormData}
        onReceiptUpload={handleReceiptUpload}
        onRemoveReceipt={removeReceipt}
        onShowNewCategory={setShowNewCategory}
        onNewCategoryChange={setNewCategory}
      />

      <ExpenseReportModal
        show={showReportModal}
        selectedExpenseCount={selectedExpenses.length}
        onClose={() => setShowReportModal(false)}
        onSubmit={handleCreateReport}
        submitting={submittingReport}
      />

      {/* Create Invoice Modal - Placeholder */}
      {showInvoiceModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Create Invoice</h3>
            <p className="text-sm text-base-content/70">Invoice creation coming soon</p>
            <div className="modal-action">
              <button
                className="btn"
                onClick={() => setShowInvoiceModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Image Modal */}
      {showReceiptModal && selectedReceipt && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-4xl">
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              onClick={() => {
                setShowReceiptModal(false);
                setSelectedReceipt(null);
              }}
            >
              ✕
            </button>
            <h3 className="font-bold text-lg mb-4">Receipt - {selectedReceipt.description}</h3>
            <div className="flex justify-center items-center bg-base-300 rounded-lg p-4 min-h-[200px]">
              {loadingReceipt ? (
                <span className="loading loading-spinner loading-lg"></span>
              ) : selectedReceipt.image ? (
                <img
                  src={selectedReceipt.image}
                  alt={`Receipt for ${selectedReceipt.description}`}
                  className="max-w-full max-h-[70vh] object-contain"
                />
              ) : null}
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button
              onClick={() => {
                setShowReceiptModal(false);
                setSelectedReceipt(null);
              }}
            >
              close
            </button>
          </form>
        </dialog>
      )}
    </Sidebar>
  );
}
