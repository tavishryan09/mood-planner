'use client';

import { CloseIcon } from '@/components/shared/Icons';

interface Project {
  id: number;
  projectNumber?: string;
  projectName: string;
  commonName?: string;
}

interface MilestoneTask {
  id: number;
  projectId?: number;
  taskDescription?: string;
  taskType: 'Deadline' | 'Internal Deadline' | 'Milestone';
  taskDate: string;
  rowIndex: number;
  projectCommonName?: string;
  projectName?: string;
}

interface MilestoneFormData {
  projectId: string;
  taskDescription: string;
  taskType: 'Deadline' | 'Internal Deadline' | 'Milestone';
}

interface MilestoneModalProps {
  show: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
  onDelete?: () => Promise<void>;
  editingMilestone: MilestoneTask | null;
  projects: Project[];
  formData: MilestoneFormData;
  setFormData: (data: MilestoneFormData) => void;
}

export default function MilestoneModal({
  show,
  onClose,
  onSave,
  onDelete,
  editingMilestone,
  projects,
  formData,
  setFormData
}: MilestoneModalProps) {
  if (!show) return null;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box">
        <button
          className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          onClick={onClose}
        >
          <CloseIcon />
        </button>
        <h3 className="font-bold text-lg mb-4">
          {editingMilestone ? 'Edit Milestone/Deadline' : 'New Milestone/Deadline'}
        </h3>

        <div className="space-y-4">
          {/* Task Type */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Type</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={formData.taskType}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  taskType: e.target.value as 'Deadline' | 'Internal Deadline' | 'Milestone'
                })
              }
            >
              <option value="Deadline">Deadline</option>
              <option value="Internal Deadline">Internal Deadline</option>
              <option value="Milestone">Milestone</option>
            </select>
          </div>

          {/* Project (optional) */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Project (optional)</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={formData.projectId}
              onChange={(e) =>
                setFormData({ ...formData, projectId: e.target.value })
              }
            >
              <option value="">Select a project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.commonName || project.projectName}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Description (optional)</span>
            </label>
            <textarea
              className="textarea textarea-bordered w-full"
              rows={3}
              value={formData.taskDescription}
              onChange={(e) =>
                setFormData({ ...formData, taskDescription: e.target.value })
              }
              placeholder="Enter description..."
            />
          </div>
        </div>

        <div className="modal-action">
          {editingMilestone && onDelete && (
            <button className="btn btn-error mr-auto" onClick={onDelete}>
              Delete
            </button>
          )}
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
