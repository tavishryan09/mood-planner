'use client';

interface Milestone {
  id: number;
  milestoneName: string;
  description?: string;
  dueDate: string;
  status: 'pending' | 'completed' | 'missed';
  createdAt: string;
  updatedAt: string;
}

interface MilestoneFormData {
  milestoneName: string;
  description: string;
  dueDate: string;
  status: Milestone['status'];
}

interface MilestoneModalProps {
  show: boolean;
  editingMilestone: Milestone | null;
  milestoneFormData: MilestoneFormData;
  deadlineType: 'milestone' | 'deadline' | 'internal-deadline';
  projectId: number | null;
  onClose: () => void;
  onSave: () => void;
  onDelete: (milestoneId: number) => void;
  onRemoveDeadline: (type: 'deadline' | 'internal-deadline') => Promise<void>;
  onFormDataChange: (data: MilestoneFormData) => void;
  onDeadlineTypeChange: (type: 'milestone' | 'deadline' | 'internal-deadline') => void;
}

export default function MilestoneModal({
  show,
  editingMilestone,
  milestoneFormData,
  deadlineType,
  projectId,
  onClose,
  onSave,
  onDelete,
  onRemoveDeadline,
  onFormDataChange,
  onDeadlineTypeChange
}: MilestoneModalProps) {
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
          {editingMilestone ? 'Edit Milestone' :
           deadlineType === 'deadline' ? 'Project Deadline' :
           deadlineType === 'internal-deadline' ? 'Internal Deadline' :
           'Add Deadline/Milestone'}
        </h3>

        <div className="space-y-4">
          {!editingMilestone && (
            <label className="form-control w-full">
              <div className="label">
                <span className="label-text">Type *</span>
              </div>
              <select
                className="select select-bordered w-full"
                value={deadlineType}
                onChange={(e) => onDeadlineTypeChange(e.target.value as typeof deadlineType)}
              >
                <option value="milestone">Milestone</option>
                <option value="deadline">Project Deadline</option>
                <option value="internal-deadline">Internal Deadline</option>
              </select>
            </label>
          )}

          {deadlineType === 'milestone' && (
            <label className="form-control w-full">
              <div className="label">
                <span className="label-text">Milestone Name *</span>
              </div>
              <input
                type="text"
                className="input input-bordered w-full"
                value={milestoneFormData.milestoneName}
                onChange={(e) => onFormDataChange({ ...milestoneFormData, milestoneName: e.target.value })}
                placeholder="e.g., Launch Beta"
              />
            </label>
          )}

          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">
                {deadlineType === 'milestone' ? 'Description' :
                 deadlineType === 'deadline' ? 'Deadline Description' :
                 'Internal Deadline Description'}
              </span>
            </div>
            <textarea
              className="textarea textarea-bordered w-full"
              rows={3}
              value={milestoneFormData.description}
              onChange={(e) => onFormDataChange({ ...milestoneFormData, description: e.target.value })}
              placeholder={
                deadlineType === 'milestone' ? 'Optional milestone description' :
                deadlineType === 'deadline' ? 'e.g., Client presentation and final deliverables' :
                'e.g., Internal review and QA testing'
              }
            />
          </label>

          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">
                {deadlineType === 'deadline' ? 'Deadline Date *' :
                 deadlineType === 'internal-deadline' ? 'Internal Deadline Date *' :
                 'Due Date *'}
              </span>
            </div>
            <input
              type="date"
              className="input input-bordered w-full"
              value={milestoneFormData.dueDate}
              onChange={(e) => onFormDataChange({ ...milestoneFormData, dueDate: e.target.value })}
            />
          </label>
        </div>

        <div className="modal-action">
          {editingMilestone ? (
            <button
              className="btn btn-error mr-auto"
              onClick={() => {
                onDelete(editingMilestone.id);
                onClose();
              }}
            >
              Delete
            </button>
          ) : (deadlineType === 'deadline' || deadlineType === 'internal-deadline') && projectId && (
            <button
              className="btn btn-error mr-auto"
              onClick={async () => {
                if (!confirm(`Are you sure you want to remove the ${deadlineType === 'deadline' ? 'project deadline' : 'internal deadline'}?`)) return;

                await onRemoveDeadline(deadlineType);
                onClose();
              }}
            >
              Remove {deadlineType === 'deadline' ? 'Deadline' : 'Internal Deadline'}
            </button>
          )}
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={onSave}
            disabled={
              !milestoneFormData.dueDate ||
              (deadlineType === 'milestone' && !milestoneFormData.milestoneName)
            }
          >
            {editingMilestone ? 'Save Changes' :
             deadlineType === 'deadline' ? 'Set Deadline' :
             deadlineType === 'internal-deadline' ? 'Set Internal Deadline' :
             'Add Milestone'}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
