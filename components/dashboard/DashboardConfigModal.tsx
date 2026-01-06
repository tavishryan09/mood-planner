'use client';

interface DashboardWidget {
  id: string;
  name: string;
  width: 'full' | '1/2' | '1/3' | '1/4';
  order: number;
  visible: boolean;
}

interface DashboardConfigModalProps {
  show: boolean;
  tempWidgets: DashboardWidget[];
  draggedWidget: string | null;
  onClose: () => void;
  onSave: () => void;
  onWidgetDragStart: (widgetId: string) => void;
  onWidgetDragOver: (e: React.DragEvent, targetWidgetId: string) => void;
  onWidgetDragEnd: () => void;
  onUpdateWidgetWidth: (widgetId: string, width: 'full' | '1/2' | '1/3' | '1/4') => void;
  onToggleWidgetVisibility: (widgetId: string) => void;
}

export default function DashboardConfigModal({
  show,
  tempWidgets,
  draggedWidget,
  onClose,
  onSave,
  onWidgetDragStart,
  onWidgetDragOver,
  onWidgetDragEnd,
  onUpdateWidgetWidth,
  onToggleWidgetVisibility
}: DashboardConfigModalProps) {
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
        <h3 className="font-bold text-lg mb-4">Configure Dashboard</h3>
        <p className="text-sm opacity-70 mb-4">
          Drag widgets to reorder them. Select widget width from the dropdown. Toggle visibility to show/hide widgets.
        </p>

        <div className="space-y-2">
          {tempWidgets.map((widget) => (
            <div
              key={widget.id}
              draggable
              onDragStart={() => onWidgetDragStart(widget.id)}
              onDragOver={(e) => onWidgetDragOver(e, widget.id)}
              onDragEnd={onWidgetDragEnd}
              className={`flex items-center justify-between p-3 rounded-lg border border-base-300 bg-base-100 cursor-move ${
                draggedWidget === widget.id ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="size-5 opacity-50">
                  <line x1="3" y1="9" x2="21" y2="9"></line>
                  <line x1="3" y1="15" x2="21" y2="15"></line>
                </svg>
                <div className="font-medium">{widget.name}</div>
              </div>
              <div className="flex items-center gap-3">
                <select
                  className="select select-sm select-bordered"
                  value={widget.width}
                  onChange={(e) => onUpdateWidgetWidth(widget.id, e.target.value as 'full' | '1/2' | '1/3' | '1/4')}
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="full">Full Width</option>
                  <option value="1/2">1/2 Width</option>
                  <option value="1/3">1/3 Width</option>
                  <option value="1/4">1/4 Width</option>
                </select>
                <label className="cursor-pointer">
                  <input
                    type="checkbox"
                    className="toggle toggle-primary"
                    checked={widget.visible}
                    onChange={() => onToggleWidgetVisibility(widget.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </label>
              </div>
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
