'use client';

interface Task {
  id: number;
  taskName: string;
  description?: string;
  startDate: string;
  endDate: string;
  status: 'not-started' | 'in-progress' | 'completed' | 'blocked';
  category?: string;
  assignedUsers: Array<{ id: number; name: string }>;
  progress: number;
  dependencies?: number[];
  createdAt: string;
}

interface TeamMember {
  id: number;
  name: string;
  email: string;
  billingRate?: number;
}

interface Category {
  id: number;
  name: string;
  color?: string;
  createdAt: string;
}

interface TaskFormData {
  taskName: string;
  description: string;
  startDate: string;
  endDate: string;
  status: Task['status'];
  category: string;
  assignedUserIds: number[];
  progress: number;
}

interface TaskModalProps {
  show: boolean;
  editingTask: Task | null;
  taskFormData: TaskFormData;
  teamMembers: TeamMember[];
  categories: Category[];
  showNewCategoryInput: boolean;
  newCategoryName: string;
  onClose: () => void;
  onSave: () => void;
  onDelete: (taskId: number) => void;
  onFormDataChange: (data: TaskFormData) => void;
  onAddCategory: () => void;
  onNewCategoryNameChange: (name: string) => void;
  onShowNewCategoryInput: (show: boolean) => void;
}

export default function TaskModal({
  show,
  editingTask,
  taskFormData,
  teamMembers,
  categories,
  showNewCategoryInput,
  newCategoryName,
  onClose,
  onSave,
  onDelete,
  onFormDataChange,
  onAddCategory,
  onNewCategoryNameChange,
  onShowNewCategoryInput
}: TaskModalProps) {
  if (!show) return null;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <button
          className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          onClick={onClose}
        >
          ✕
        </button>
        <h3 className="font-bold text-lg mb-5">
          {editingTask ? 'Edit Task' : 'Add New Task'}
        </h3>

        <div className="space-y-4">
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">Task Name *</span>
            </div>
            <input
              type="text"
              className="input input-bordered w-full"
              value={taskFormData.taskName}
              onChange={(e) => onFormDataChange({ ...taskFormData, taskName: e.target.value })}
              placeholder="e.g., Design mockups"
            />
          </label>

          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">Description</span>
            </div>
            <textarea
              className="textarea textarea-bordered w-full"
              rows={3}
              value={taskFormData.description}
              onChange={(e) => onFormDataChange({ ...taskFormData, description: e.target.value })}
              placeholder="Optional task description"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="form-control w-full">
              <div className="label">
                <span className="label-text">Start Date *</span>
              </div>
              <input
                type="date"
                className="input input-bordered w-full"
                value={taskFormData.startDate}
                onChange={(e) => onFormDataChange({ ...taskFormData, startDate: e.target.value })}
              />
            </label>

            <label className="form-control w-full">
              <div className="label">
                <span className="label-text">End Date *</span>
              </div>
              <input
                type="date"
                className="input input-bordered w-full"
                value={taskFormData.endDate}
                onChange={(e) => onFormDataChange({ ...taskFormData, endDate: e.target.value })}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="form-control w-full">
              <div className="label">
                <span className="label-text">Status</span>
              </div>
              <select
                className="select select-bordered w-full"
                value={taskFormData.status}
                onChange={(e) => onFormDataChange({ ...taskFormData, status: e.target.value as Task['status'] })}
              >
                <option value="not-started">Not Started</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="blocked">Blocked</option>
              </select>
            </label>

            <label className="form-control w-full">
              <div className="label">
                <span className="label-text">Category</span>
              </div>
              {showNewCategoryInput ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    placeholder="Enter new category name"
                    value={newCategoryName}
                    onChange={(e) => onNewCategoryNameChange(e.target.value)}
                    onKeyPress={async (e) => {
                      if (e.key === 'Enter' && newCategoryName.trim()) {
                        await onAddCategory();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={onAddCategory}
                    disabled={!newCategoryName.trim()}
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      onShowNewCategoryInput(false);
                      onNewCategoryNameChange('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <select
                  className="select select-bordered w-full"
                  value={taskFormData.category}
                  onChange={(e) => {
                    if (e.target.value === '__add_new__') {
                      onShowNewCategoryInput(true);
                    } else {
                      onFormDataChange({ ...taskFormData, category: e.target.value });
                    }
                  }}
                >
                  <option value="">No Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                  <option value="__add_new__">+ Add New Category</option>
                </select>
              )}
            </label>
          </div>

          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">Assign To (select multiple)</span>
            </div>
            <div className="border border-base-300 rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
              {teamMembers.length === 0 ? (
                <p className="text-sm opacity-60">No team members available</p>
              ) : (
                teamMembers.map((member) => (
                  <label key={member.id} className="flex items-center gap-2 cursor-pointer hover:bg-base-200 p-2 rounded">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm checkbox-primary"
                      checked={taskFormData.assignedUserIds.includes(member.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          onFormDataChange({
                            ...taskFormData,
                            assignedUserIds: [...taskFormData.assignedUserIds, member.id]
                          });
                        } else {
                          onFormDataChange({
                            ...taskFormData,
                            assignedUserIds: taskFormData.assignedUserIds.filter(id => id !== member.id)
                          });
                        }
                      }}
                    />
                    <span className="text-sm">{member.name}</span>
                  </label>
                ))
              )}
            </div>
            {taskFormData.assignedUserIds.length > 0 && (
              <div className="label">
                <span className="label-text-alt">{taskFormData.assignedUserIds.length} member{taskFormData.assignedUserIds.length !== 1 ? 's' : ''} selected</span>
              </div>
            )}
          </label>

          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">Progress: {taskFormData.progress}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              className="range range-primary w-full"
              value={taskFormData.progress}
              onChange={(e) => onFormDataChange({ ...taskFormData, progress: parseInt(e.target.value) })}
            />
            <div className="w-full flex justify-between text-xs opacity-60 px-2 mt-1">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </label>
        </div>

        <div className="modal-action">
          {editingTask && (
            <button
              className="btn btn-error mr-auto"
              onClick={() => {
                onDelete(editingTask.id);
                onClose();
              }}
            >
              Delete
            </button>
          )}
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={onSave}
            disabled={!taskFormData.taskName || !taskFormData.startDate || !taskFormData.endDate}
          >
            {editingTask ? 'Save Changes' : 'Add Task'}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
