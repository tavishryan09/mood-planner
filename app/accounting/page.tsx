'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import ExpenseModal from '@/components/accounting/ExpenseModal';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountingData } from '@/hooks/accounting/useAccountingData';
import { useExpenseManagement } from '@/hooks/accounting/useExpenseManagement';

export default function Billing() {
  const { user } = useAuth();
  const isAccountant = user?.role === 'Accountant';

  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Accounting data
  const { projects, expenses, setExpenses, loading } = useAccountingData();

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
    return new Date(dateString).toLocaleDateString('en-US', {
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
              <div className="card bg-base-100 border border-base-300">
                <div className="card-body">
                  <h2 className="card-title">Recent Invoices</h2>
                  <p className="text-sm text-base-content/70">No invoices yet</p>
                </div>
              </div>

              <div className="card bg-base-100 border border-base-300">
                <div className="card-body">
                  <h2 className="card-title">Recent Expenses</h2>
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
                            {expense.receiptImage && (
                              <button
                                className="btn btn-ghost btn-xs"
                                onClick={() => {
                                  // Open receipt in a new window/modal
                                  const win = window.open();
                                  if (win) {
                                    win.document.write(`
                                      <html>
                                        <head><title>Receipt - ${expense.description}</title></head>
                                        <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#000;">
                                          <img src="${expense.receiptImage}" style="max-width:100%;max-height:100vh;" />
                                        </body>
                                      </html>
                                    `);
                                  }
                                }}
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
        onClose={closeModal}
        onSubmit={handleSubmitExpense}
        onDelete={handleDeleteExpense}
        onFormDataChange={setFormData}
        onReceiptUpload={handleReceiptUpload}
        onRemoveReceipt={removeReceipt}
        onShowNewCategory={setShowNewCategory}
        onNewCategoryChange={setNewCategory}
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
    </Sidebar>
  );
}
