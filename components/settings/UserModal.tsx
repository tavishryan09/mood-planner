'use client';

interface UserFormData {
  name: string;
  email: string;
  password: string;
  role: 'Admin' | 'Manager' | 'Designer' | 'Accountant';
  billingRate: number;
}

interface UserModalProps {
  show: boolean;
  editingUser: number | null;
  formData: UserFormData;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
  onFormDataChange: (data: UserFormData) => void;
}

export default function UserModal({
  show,
  editingUser,
  formData,
  onClose,
  onSave,
  onDelete,
  onFormDataChange
}: UserModalProps) {
  if (!show) return null;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box">
        <button
          className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          onClick={onClose}
        >
          ✕
        </button>
        <h3 className="font-bold text-lg mb-5">
          {editingUser ? 'Edit User' : 'Add New User'}
        </h3>

        <label className="input input-bordered w-full mb-5">
          <span className="label">Name</span>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })}
            required
          />
        </label>

        <label className="input input-bordered w-full mb-5">
          <span className="label">Email</span>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => onFormDataChange({ ...formData, email: e.target.value })}
            required
          />
        </label>

        <label className="input input-bordered w-full mb-5">
          <span className="label">
            Password {editingUser && '(leave blank to keep current)'}
          </span>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => onFormDataChange({ ...formData, password: e.target.value })}
            placeholder={editingUser ? 'Leave blank to keep current' : ''}
          />
        </label>

        <div className="form-control w-full mb-5">
          <label className="label">
            <span className="label-text">Role</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={formData.role}
            onChange={(e) => onFormDataChange({ ...formData, role: e.target.value as 'Admin' | 'Manager' | 'Designer' | 'Accountant' })}
          >
            <option value="Designer">Designer</option>
            <option value="Manager">Manager</option>
            <option value="Accountant">Accountant</option>
            <option value="Admin">Admin</option>
          </select>
        </div>

        {/* Only show billing rate for Designer and Manager roles */}
        {(formData.role === 'Designer' || formData.role === 'Manager') && (
          <div className="form-control w-full mb-5">
            <label className="label">
              <span className="label-text">Billing Rate ($/hr)</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="input input-bordered w-full"
              value={formData.billingRate}
              onChange={(e) => onFormDataChange({ ...formData, billingRate: parseFloat(e.target.value) || 0 })}
              placeholder="0.00"
            />
          </div>
        )}

        <div className="modal-action">
          {editingUser && (
            <button className="btn btn-error mr-auto" onClick={onDelete}>
              Delete
            </button>
          )}
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onSave}>
            {editingUser ? 'Save Changes' : 'Add User'}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
