'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import CalendarDatePicker from '@/components/CalendarDatePicker';
import { useAuth } from '@/contexts/AuthContext';

interface Project {
  id: number;
  projectNumber: string;
  projectName: string;
  commonName: string;
  clientName: string;
}

interface Expense {
  id: number;
  userId?: number;
  userName?: string;
  expenseDate: string;
  category: string;
  description: string;
  amount: number;
  notes?: string;
  projectId?: number;
  projectName?: string;
  projectNumber?: string;
  receiptImage?: string;
  receiptFilename?: string;
  status: string;
  createdAt: string;
}

export default function Billing() {
  const { user } = useAuth();
  const isAccountant = user?.role === 'Accountant';

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);

  // Form state
  const [expenseDate, setExpenseDate] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [projectId, setProjectId] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('Unsubmitted');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  // Fetch projects and expenses on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch projects with includeNoTasks=true to get all user's projects
        const projectsRes = await fetch('/api/my-projects?includeNoTasks=true');
        if (projectsRes.ok) {
          const projectsData = await projectsRes.json();
          // Sort projects alphabetically by common name
          const sortedProjects = projectsData.sort((a: Project, b: Project) => {
            const nameA = (a.commonName || a.projectName).toLowerCase();
            const nameB = (b.commonName || b.projectName).toLowerCase();
            return nameA.localeCompare(nameB);
          });
          setProjects(sortedProjects);
        }

        // Fetch recent expenses
        const expensesRes = await fetch('/api/expenses?limit=10');
        if (expensesRes.ok) {
          const expensesData = await expensesRes.json();
          setExpenses(expensesData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Set default date to today when opening modal
  useEffect(() => {
    if (showExpenseModal) {
      const today = new Date().toISOString().split('T')[0];
      setExpenseDate(today);
    }
  }, [showExpenseModal]);

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }

      setReceiptFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpenseId(expense.id);
    setExpenseDate(expense.expenseDate);
    setCategory(expense.category);
    setDescription(expense.description);
    setAmount(expense.amount.toString());
    setProjectId(expense.projectId?.toString() || '');
    setNotes(expense.notes || '');
    setStatus(expense.status);
    if (expense.receiptImage) {
      setReceiptPreview(expense.receiptImage);
    }
    setShowExpenseModal(true);
  };

  const resetForm = () => {
    setExpenseDate('');
    setCategory('');
    setDescription('');
    setAmount('');
    setProjectId('');
    setNotes('');
    setStatus('Unsubmitted');
    setShowNewCategory(false);
    setNewCategory('');
    setReceiptFile(null);
    setReceiptPreview(null);
    setEditingExpenseId(null);
  };

  const handleSubmitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // Use the new category if it's being added
    const finalCategory = showNewCategory ? newCategory : category;

    // Convert receipt image to base64 if present
    let receiptImageBase64 = receiptPreview; // Use existing preview (could be from edit or new upload)
    let receiptFilename = null;

    if (receiptFile) {
      receiptFilename = receiptFile.name;
    }

    try {
      const url = editingExpenseId ? `/api/expenses/${editingExpenseId}` : '/api/expenses';
      const method = editingExpenseId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenseDate,
          category: finalCategory,
          description,
          amount: parseFloat(amount),
          projectId: projectId ? parseInt(projectId) : null,
          notes: notes || null,
          status,
          receiptImage: receiptImageBase64,
          receiptFilename: receiptFilename
        }),
      });

      if (response.ok) {
        const updatedExpense = await response.json();

        if (editingExpenseId) {
          // Update existing expense in list
          setExpenses(expenses.map(exp =>
            exp.id === editingExpenseId ? updatedExpense : exp
          ));
        } else {
          // Add new expense to list
          setExpenses([updatedExpense, ...expenses]);
        }

        // Reset form
        resetForm();
        setShowExpenseModal(false);
      } else {
        const error = await response.json();
        alert(`Error ${editingExpenseId ? 'updating' : 'creating'} expense: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating expense:', error);
      alert('Failed to create expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!editingExpenseId) return;

    const confirmed = confirm('Are you sure you want to delete this expense? This action cannot be undone.');
    if (!confirmed) return;

    setSubmitting(true);

    try {
      const response = await fetch(`/api/expenses/${editingExpenseId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove expense from list
        setExpenses(expenses.filter(exp => exp.id !== editingExpenseId));
        resetForm();
        setShowExpenseModal(false);
      } else {
        const error = await response.json();
        alert(`Error deleting expense: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Failed to delete expense');
    } finally {
      setSubmitting(false);
    }
  };

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
                  onClick={() => setShowExpenseModal(true)}
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

      {/* Create/Edit Expense Modal */}
      {showExpenseModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg mb-4">
              {editingExpenseId ? 'Edit Expense' : 'Create Expense'}
            </h3>
            <form onSubmit={handleSubmitExpense}>
              <div className="space-y-4">
                <div>
                  <label className="label">
                    <span className="label-text">Expense Date</span>
                  </label>
                  <CalendarDatePicker
                    value={expenseDate}
                    onChange={setExpenseDate}
                    id="expense-date"
                    placeholder="Select expense date"
                    required
                  />
                </div>

                <div>
                  <label className="label">
                    <span className="label-text">Category</span>
                  </label>
                  {showNewCategory ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="input input-bordered w-full"
                        placeholder="Enter new category name"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setShowNewCategory(false);
                          setNewCategory('');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <select
                        className="select select-bordered w-full"
                        value={category}
                        onChange={(e) => {
                          if (e.target.value === '__new__') {
                            setShowNewCategory(true);
                            setCategory('');
                          } else {
                            setCategory(e.target.value);
                          }
                        }}
                        required
                      >
                        <option value="">Select category</option>
                        <option value="software">Software & Subscriptions</option>
                        <option value="hardware">Hardware & Equipment</option>
                        <option value="office">Office Supplies</option>
                        <option value="travel">Travel & Transportation</option>
                        <option value="meals">Meals & Entertainment</option>
                        <option value="utilities">Utilities</option>
                        <option value="professional">Professional Services</option>
                        <option value="other">Other</option>
                        <option value="__new__">+ Add new category</option>
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="label">
                    <span className="label-text">Description</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    placeholder="Brief description of the expense"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="label">
                    <span className="label-text">Amount</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="input input-bordered w-full"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="label">
                    <span className="label-text">Project (Optional)</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                  >
                    <option value="">No project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.projectNumber} - {project.projectName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">
                    <span className="label-text">Status</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    required
                  >
                    <option value="Unsubmitted">Unsubmitted</option>
                    <option value="Submitted">Submitted</option>
                    <option value="In Review">In Review</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Pending Payment">Pending Payment</option>
                    <option value="Posted">Posted</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>

                <div>
                  <label className="label">
                    <span className="label-text">Notes (Optional)</span>
                  </label>
                  <textarea
                    className="textarea textarea-bordered w-full"
                    rows={3}
                    placeholder="Additional notes or details"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <div>
                  <label className="label">
                    <span className="label-text">Receipt Image (Optional)</span>
                  </label>
                  {receiptPreview ? (
                    <div className="space-y-2">
                      <div className="relative inline-block">
                        <img
                          src={receiptPreview}
                          alt="Receipt preview"
                          className="max-w-full h-48 object-contain border border-base-300 rounded"
                        />
                        <button
                          type="button"
                          className="btn btn-circle btn-sm btn-error absolute top-2 right-2"
                          onClick={removeReceipt}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <p className="text-sm text-base-content/60">{receiptFile?.name}</p>
                    </div>
                  ) : (
                    <input
                      type="file"
                      accept="image/*"
                      className="file-input file-input-bordered w-full"
                      onChange={handleReceiptUpload}
                    />
                  )}
                  <p className="text-xs text-base-content/60 mt-1">
                    Upload an image of your receipt (max 5MB)
                  </p>
                </div>
              </div>

              <div className="modal-action justify-between">
                {editingExpenseId && (
                  <button
                    type="button"
                    className="btn btn-error"
                    onClick={handleDeleteExpense}
                    disabled={submitting}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      resetForm();
                      setShowExpenseModal(false);
                    }}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span className="loading loading-spinner loading-sm"></span>
                        {editingExpenseId ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      editingExpenseId ? 'Update Expense' : 'Create Expense'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

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
