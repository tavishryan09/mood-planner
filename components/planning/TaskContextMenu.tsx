'use client';

interface TaskContextMenuProps {
  show: boolean;
  onClose: () => void;
  onCopy: () => void;
  onCut: () => void;
  taskName: string;
}

export default function TaskContextMenu({
  show,
  onClose,
  onCopy,
  onCut,
  taskName
}: TaskContextMenuProps) {
  if (!show) return null;

  const handleCopy = () => {
    onCopy();
    onClose();
  };

  const handleCut = () => {
    onCut();
    onClose();
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-xs">
        <h3 className="font-bold text-lg mb-2">Task Actions</h3>
        <p className="text-sm opacity-70 mb-4 truncate">{taskName}</p>

        <div className="space-y-2">
          <button
            className="btn btn-block btn-primary gap-2"
            onClick={handleCopy}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            Copy Task
          </button>

          <button
            className="btn btn-block btn-secondary gap-2"
            onClick={handleCut}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
              <circle cx="6" cy="6" r="3"></circle>
              <circle cx="6" cy="18" r="3"></circle>
              <line x1="20" y1="4" x2="8.12" y2="15.88"></line>
              <line x1="14.47" y1="14.48" x2="20" y2="20"></line>
              <line x1="8.12" y1="8.12" x2="12" y2="12"></line>
            </svg>
            Cut Task
          </button>

          <button
            className="btn btn-block btn-ghost"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
