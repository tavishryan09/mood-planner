'use client';

interface UserDisplay {
  id: number;
  name: string;
  visible: boolean;
  order: number;
  billingRate: number;
}

interface UserSettingsModalProps {
  show: boolean;
  tempUsers: UserDisplay[];
  draggedUser: number | null;
  onClose: () => void;
  onSave: () => void;
  onDragStart: (userId: number) => void;
  onDragOver: (e: React.DragEvent, targetUserId: number) => void;
  onDragEnd: () => void;
  onToggleVisibility: (userId: number) => void;
}

export default function UserSettingsModal({
  show,
  tempUsers,
  draggedUser,
  onClose,
  onSave,
  onDragStart,
  onDragOver,
  onDragEnd,
  onToggleVisibility
}: UserSettingsModalProps) {
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
        <h3 className="font-bold text-lg mb-4">Manage Team Members</h3>
        <p className="text-sm opacity-70 mb-4">
          Drag team members to reorder them. Toggle visibility to show/hide team members in the dashboard.
        </p>

        <div className="space-y-2">
          {tempUsers.map((user) => (
            <div
              key={user.id}
              draggable
              onDragStart={() => onDragStart(user.id)}
              onDragOver={(e) => onDragOver(e, user.id)}
              onDragEnd={onDragEnd}
              className={`flex items-center justify-between p-3 rounded-lg border border-base-300 bg-base-100 cursor-move ${
                draggedUser === user.id ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="size-5 opacity-50">
                  <line x1="3" y1="9" x2="21" y2="9"></line>
                  <line x1="3" y1="15" x2="21" y2="15"></line>
                </svg>
                <div>
                  <div className="font-medium">{user.name}</div>
                </div>
              </div>
              <label className="cursor-pointer">
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={user.visible}
                  onChange={() => onToggleVisibility(user.id)}
                  onClick={(e) => e.stopPropagation()}
                />
              </label>
            </div>
          ))}
        </div>

        <div className="modal-action">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onSave}>
            Save
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
