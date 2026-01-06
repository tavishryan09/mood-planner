'use client';

interface ClientFormData {
  businessName: string;
  businessAddress: string;
  website: string;
  primaryContact: string;
  email: string;
  phone: string;
  avatarUrl: string;
}

interface ClientModalProps {
  show: boolean;
  editingClient: number | null;
  formData: ClientFormData;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
  onFormDataChange: (data: ClientFormData) => void;
  onPhoneChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function ClientModal({
  show,
  editingClient,
  formData,
  onClose,
  onSave,
  onDelete,
  onFormDataChange,
  onPhoneChange,
  onImageUpload
}: ClientModalProps) {
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
          {editingClient ? 'Edit Client' : 'Add New Client'}
        </h3>

        <label className="input input-bordered w-full mb-5">
          <span className="label">Business Name</span>
          <input
            type="text"
            value={formData.businessName}
            onChange={(e) => onFormDataChange({ ...formData, businessName: e.target.value })}
            required
          />
        </label>

        <label className="input input-bordered w-full mb-5">
          <span className="label">Business Address</span>
          <input
            type="text"
            value={formData.businessAddress}
            onChange={(e) => onFormDataChange({ ...formData, businessAddress: e.target.value })}
          />
        </label>

        <label className="input input-bordered w-full mb-5">
          <span className="label">Website</span>
          <input
            type="url"
            value={formData.website}
            onChange={(e) => onFormDataChange({ ...formData, website: e.target.value })}
            placeholder="https://example.com"
          />
        </label>

        <label className="input input-bordered w-full mb-5">
          <span className="label">Primary Contact</span>
          <input
            type="text"
            value={formData.primaryContact}
            onChange={(e) => onFormDataChange({ ...formData, primaryContact: e.target.value })}
          />
        </label>

        <label className="input input-bordered w-full mb-5">
          <span className="label">Email</span>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => onFormDataChange({ ...formData, email: e.target.value })}
            placeholder="name@example.com"
          />
        </label>

        <label className="input input-bordered w-full mb-5">
          <span className="label">Phone</span>
          <input
            type="tel"
            value={formData.phone}
            onChange={onPhoneChange}
            placeholder="(555) 123-4567"
          />
        </label>

        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Avatar Image</span>
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={onImageUpload}
            className="file-input file-input-bordered w-full"
          />
          {formData.avatarUrl && (
            <div className="mt-2 flex items-center gap-3">
              <img
                src={formData.avatarUrl}
                alt="Avatar preview"
                className="w-20 h-20 object-cover rounded-lg"
              />
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => onFormDataChange({ ...formData, avatarUrl: '' })}
              >
                Remove
              </button>
            </div>
          )}
        </div>

        <div className="modal-action">
          {editingClient && (
            <button className="btn btn-error mr-auto" onClick={onDelete}>
              Delete
            </button>
          )}
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onSave}>
            {editingClient ? 'Save Changes' : 'Add Client'}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
