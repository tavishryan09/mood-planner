'use client';

import DatePicker from '@/components/DatePicker';

interface Project {
  id: number;
  projectNumber: string;
  projectName: string;
  commonName: string;
  clientName: string;
  archived?: boolean;
}

interface ExpenseFormData {
  expenseDate: string;
  category: string;
  description: string;
  amount: string;
  projectId: string;
  notes: string;
  status: string;
}

interface ExpenseModalProps {
  show: boolean;
  editingExpenseId: number | null;
  formData: ExpenseFormData;
  projects: Project[];
  submitting: boolean;
  showNewCategory: boolean;
  newCategory: string;
  receiptPreview: string | null;
  receiptFile: File | null;
  canEditStatus?: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onDelete: () => void;
  onFormDataChange: (data: ExpenseFormData) => void;
  onReceiptUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveReceipt: () => void;
  onShowNewCategory: (show: boolean) => void;
  onNewCategoryChange: (value: string) => void;
}

export default function ExpenseModal({
  show,
  editingExpenseId,
  formData,
  projects,
  submitting,
  showNewCategory,
  newCategory,
  receiptPreview,
  receiptFile,
  canEditStatus = false,
  onClose,
  onSubmit,
  onDelete,
  onFormDataChange,
  onReceiptUpload,
  onRemoveReceipt,
  onShowNewCategory,
  onNewCategoryChange
}: ExpenseModalProps) {
  if (!show) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg mb-4">
          {editingExpenseId ? 'Edit Expense' : 'Create Expense'}
        </h3>
        <form onSubmit={onSubmit}>
          <div className="space-y-4">
            <DatePicker
              value={formData.expenseDate}
              onChange={(date) => onFormDataChange({ ...formData, expenseDate: date })}
              label="Expense Date"
              required
            />

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
                    onChange={(e) => onNewCategoryChange(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      onShowNewCategory(false);
                      onNewCategoryChange('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <select
                    className="select select-bordered w-full"
                    value={formData.category}
                    onChange={(e) => {
                      if (e.target.value === '__new__') {
                        onShowNewCategory(true);
                        onFormDataChange({ ...formData, category: '' });
                      } else {
                        onFormDataChange({ ...formData, category: e.target.value });
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
                <span className="label-text">Description (Optional)</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="Brief description of the expense"
                value={formData.description}
                onChange={(e) => onFormDataChange({ ...formData, description: e.target.value })}
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
                value={formData.amount}
                onChange={(e) => onFormDataChange({ ...formData, amount: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="label">
                <span className="label-text">Project (Optional)</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={formData.projectId}
                onChange={(e) => onFormDataChange({ ...formData, projectId: e.target.value })}
              >
                <option value="">No project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.projectNumber} - {project.projectName}
                  </option>
                ))}
              </select>
            </div>

            {canEditStatus && (
              <div>
                <label className="label">
                  <span className="label-text">Status</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={formData.status}
                  onChange={(e) => onFormDataChange({ ...formData, status: e.target.value })}
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
            )}

            <div>
              <label className="label">
                <span className="label-text">Notes (Optional)</span>
              </label>
              <textarea
                className="textarea textarea-bordered w-full"
                rows={3}
                placeholder="Additional notes or details"
                value={formData.notes}
                onChange={(e) => onFormDataChange({ ...formData, notes: e.target.value })}
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
                      onClick={onRemoveReceipt}
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
                  onChange={onReceiptUpload}
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
                onClick={onDelete}
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
                onClick={onClose}
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
  );
}
