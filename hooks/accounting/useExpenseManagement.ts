import { useState } from 'react';

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

interface ExpenseFormData {
  expenseDate: string;
  category: string;
  description: string;
  amount: string;
  projectId: string;
  notes: string;
  status: string;
}

export function useExpenseManagement(
  expenses: Expense[],
  setExpenses: (expenses: Expense[]) => void
) {
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState<ExpenseFormData>({
    expenseDate: '',
    category: '',
    description: '',
    amount: '',
    projectId: '',
    notes: '',
    status: 'Unsubmitted'
  });

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }

      setReceiptFile(file);

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

    // Normalize the expense date to YYYY-MM-DD format
    let normalizedDate = expense.expenseDate;
    if (normalizedDate && normalizedDate.includes('T')) {
      normalizedDate = normalizedDate.split('T')[0];
    }

    setFormData({
      expenseDate: normalizedDate,
      category: expense.category,
      description: expense.description,
      amount: expense.amount.toString(),
      projectId: expense.projectId?.toString() || '',
      notes: expense.notes || '',
      status: expense.status
    });
    if (expense.receiptImage) {
      setReceiptPreview(expense.receiptImage);
    }
    setShowExpenseModal(true);
  };

  const handleAddNew = () => {
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      expenseDate: today,
      category: '',
      description: '',
      amount: '',
      projectId: '',
      notes: '',
      status: 'Unsubmitted'
    });
    setEditingExpenseId(null);
    setShowNewCategory(false);
    setNewCategory('');
    setReceiptFile(null);
    setReceiptPreview(null);
    setShowExpenseModal(true);
  };

  const resetForm = () => {
    setFormData({
      expenseDate: '',
      category: '',
      description: '',
      amount: '',
      projectId: '',
      notes: '',
      status: 'Unsubmitted'
    });
    setShowNewCategory(false);
    setNewCategory('');
    setReceiptFile(null);
    setReceiptPreview(null);
    setEditingExpenseId(null);
  };

  const handleSubmitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const finalCategory = showNewCategory ? newCategory : formData.category;
    let receiptImageBase64 = receiptPreview;
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
          expenseDate: formData.expenseDate,
          category: finalCategory,
          description: formData.description,
          amount: parseFloat(formData.amount),
          projectId: formData.projectId ? parseInt(formData.projectId) : null,
          notes: formData.notes || null,
          status: formData.status,
          receiptImage: receiptImageBase64,
          receiptFilename: receiptFilename
        }),
      });

      if (response.ok) {
        const updatedExpense = await response.json();

        if (editingExpenseId) {
          setExpenses(expenses.map(exp =>
            exp.id === editingExpenseId ? updatedExpense : exp
          ));
        } else {
          setExpenses([updatedExpense, ...expenses]);
        }

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

  const closeModal = () => {
    resetForm();
    setShowExpenseModal(false);
  };

  return {
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
  };
}
