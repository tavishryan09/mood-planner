'use client';

import { useState } from 'react';

interface ExpenseReportModalProps {
  show: boolean;
  selectedExpenseCount: number;
  onClose: () => void;
  onSubmit: (reportName: string, notes: string) => void;
  submitting: boolean;
}

export default function ExpenseReportModal({
  show,
  selectedExpenseCount,
  onClose,
  onSubmit,
  submitting
}: ExpenseReportModalProps) {
  const [reportName, setReportName] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (reportName.trim()) {
      onSubmit(reportName, notes);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setReportName('');
      setNotes('');
      onClose();
    }
  };

  if (!show) return null;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box">
        <button
          className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          onClick={handleClose}
          disabled={submitting}
        >
          ✕
        </button>
        <h3 className="font-bold text-lg mb-4">Create Expense Report</h3>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="alert alert-info">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>{selectedExpenseCount} expense{selectedExpenseCount !== 1 ? 's' : ''} will be included in this report</span>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Report Name *</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                placeholder="e.g., December 2023 Travel Expenses"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                disabled={submitting}
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Notes</span>
              </label>
              <textarea
                className="textarea textarea-bordered h-24"
                placeholder="Add any additional notes for this report..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="modal-action">
            <button
              type="button"
              className="btn"
              onClick={handleClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || !reportName.trim()}
            >
              {submitting ? (
                <>
                  <span className="loading loading-spinner"></span>
                  Creating...
                </>
              ) : (
                'Create Report'
              )}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={handleClose} disabled={submitting}>close</button>
      </form>
    </dialog>
  );
}
