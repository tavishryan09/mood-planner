'use client';

import { useState } from 'react';
import DatePicker from '@/components/DatePicker';
import { CloseIcon, PlusIcon } from '@/components/shared/Icons';

interface Project {
  id: number;
  projectNumber?: string;
  projectName: string;
  commonName?: string;
  archived?: boolean;
}

interface InternalTaskType {
  id: number;
  name: string;
}

interface PlanningTask {
  id: number;
  userId: number;
  projectId?: number;
  taskDescription?: string;
  taskType: 'Project Task' | 'Out of Office' | 'Unavailable' | 'PTO' | 'Internal';
  taskDate: string;
  projectCommonName?: string;
  projectName?: string;
  rowIndex: number;
  rowSpan: number;
  internalTaskTypeId?: number;
  internalTaskTypeName?: string;
}

interface TaskFormData {
  projectId: string;
  taskDescription: string;
  taskType: 'Project Task' | 'Out of Office' | 'Unavailable' | 'PTO' | 'Internal';
  internalTaskTypeId: string;
  repeatEnabled: boolean;
  repeatType: 'daily' | 'weekly' | 'monthly';
  repeatWeekDays: number[];
  repeatMonthDates: number[];
  repeatEndDate: string;
}

interface TaskModalProps {
  show: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
  onDelete?: () => Promise<void>;
  editingTask: PlanningTask | null;
  projects: Project[];
  internalTaskTypes: InternalTaskType[];
  formData: TaskFormData;
  setFormData: (data: TaskFormData) => void;
  onAddInternalTaskType: (type: InternalTaskType) => void;
}

export default function TaskModal({
  show,
  onClose,
  onSave,
  onDelete,
  editingTask,
  projects,
  internalTaskTypes,
  formData,
  setFormData,
  onAddInternalTaskType
}: TaskModalProps) {
  const [showNewInternalTaskTypeModal, setShowNewInternalTaskTypeModal] = useState(false);
  const [newInternalTaskTypeName, setNewInternalTaskTypeName] = useState('');

  if (!show) return null;

  const handleAddInternalTaskType = async () => {
    if (!newInternalTaskTypeName.trim()) {
      alert('Please enter a task type name');
      return;
    }

    try {
      const response = await fetch('/api/internal-task-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newInternalTaskTypeName.trim() })
      });

      if (response.ok) {
        const newType = await response.json();
        onAddInternalTaskType(newType);
        setFormData({ ...formData, internalTaskTypeId: newType.id.toString() });
        setShowNewInternalTaskTypeModal(false);
        setNewInternalTaskTypeName('');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create internal task type');
      }
    } catch (error) {
      console.error('Error creating internal task type:', error);
      alert('An error occurred while creating the task type');
    }
  };

  return (
    <>
      <dialog className="modal modal-open">
        <div className="modal-box overflow-visible">
          <button
            className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
            onClick={onClose}
          >
            <CloseIcon />
          </button>
          <h3 className="font-bold text-lg mb-4">
            {editingTask ? 'Edit Planning Task' : 'New Planning Task'}
          </h3>

          <div className="space-y-4">
            {/* Task Type */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Task Type</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={formData.taskType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    taskType: e.target.value as 'Project Task' | 'Out of Office' | 'Unavailable' | 'PTO' | 'Internal',
                    projectId: (e.target.value !== 'Project Task' && e.target.value !== 'Out of Office') ? '' : formData.projectId,
                    internalTaskTypeId: e.target.value !== 'Internal' ? '' : formData.internalTaskTypeId
                  })
                }
              >
                <option value="Project Task">Project Task</option>
                <option value="Out of Office">Out of Office</option>
                <option value="Unavailable">Unavailable</option>
                <option value="PTO">PTO</option>
                <option value="Internal">Internal</option>
              </select>
            </div>

            {/* Internal Task Type (for Internal tasks) */}
            {formData.taskType === 'Internal' && (
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Internal Task Type</span>
                </label>
                <div className="flex gap-2">
                  <select
                    className="select select-bordered flex-1"
                    value={formData.internalTaskTypeId}
                    onChange={(e) =>
                      setFormData({ ...formData, internalTaskTypeId: e.target.value })
                    }
                    required
                  >
                    <option value="">Select internal task type</option>
                    {internalTaskTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-square btn-outline"
                    onClick={() => setShowNewInternalTaskTypeModal(true)}
                    title="Add new internal task type"
                  >
                    <PlusIcon />
                  </button>
                </div>
              </div>
            )}

            {/* Project (for Project Task and Out of Office) */}
            {(formData.taskType === 'Project Task' || formData.taskType === 'Out of Office') && (
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Project{formData.taskType === 'Out of Office' ? ' (optional)' : ''}</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={formData.projectId}
                  onChange={(e) =>
                    setFormData({ ...formData, projectId: e.target.value })
                  }
                  required={formData.taskType === 'Project Task'}
                >
                  <option value="">Select a project</option>
                  {projects.filter(p => !p.archived).map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.commonName || project.projectName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Task Description */}
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
                placeholder="Enter task description..."
              />
            </div>

            {/* Repeat Options */}
            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-2">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={formData.repeatEnabled}
                  onChange={(e) =>
                    setFormData({ ...formData, repeatEnabled: e.target.checked })
                  }
                />
                <span className="label-text">Repeat this task{editingTask ? ' (creates new tasks based on this one)' : ''}</span>
              </label>
            </div>

            {formData.repeatEnabled && (
              <>
                {/* Repeat Type */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Repeat Frequency</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={formData.repeatType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        repeatType: e.target.value as 'daily' | 'weekly' | 'monthly',
                        repeatWeekDays: e.target.value === 'weekly' ? formData.repeatWeekDays : [],
                        repeatMonthDates: e.target.value === 'monthly' ? formData.repeatMonthDates : []
                      })
                    }
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                {/* Weekly: Select Days */}
                {formData.repeatType === 'weekly' && (
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Repeat on days</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                        <label key={index} className="label cursor-pointer gap-2 flex-none">
                          <input
                            type="checkbox"
                            className="checkbox checkbox-sm"
                            checked={formData.repeatWeekDays.includes(index)}
                            onChange={(e) => {
                              const newDays = e.target.checked
                                ? [...formData.repeatWeekDays, index].sort()
                                : formData.repeatWeekDays.filter(d => d !== index);
                              setFormData({ ...formData, repeatWeekDays: newDays });
                            }}
                          />
                          <span className="label-text text-sm">{day}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Monthly: Select Dates */}
                {formData.repeatType === 'monthly' && (
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Repeat on dates (day of month)</span>
                    </label>
                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((date) => (
                        <label key={date} className="label cursor-pointer justify-center p-1 flex-col gap-0">
                          <input
                            type="checkbox"
                            className="checkbox checkbox-xs"
                            checked={formData.repeatMonthDates.includes(date)}
                            onChange={(e) => {
                              const newDates = e.target.checked
                                ? [...formData.repeatMonthDates, date].sort((a, b) => a - b)
                                : formData.repeatMonthDates.filter(d => d !== date);
                              setFormData({ ...formData, repeatMonthDates: newDates });
                            }}
                          />
                          <span className="label-text text-xs">{date}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Repeat End Date */}
                <DatePicker
                  label="Repeat until (optional)"
                  value={formData.repeatEndDate}
                  onChange={(date) =>
                    setFormData({ ...formData, repeatEndDate: date })
                  }
                />
              </>
            )}
          </div>

          <div className="modal-action">
            {editingTask && onDelete && (
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

      {/* Add New Internal Task Type Modal */}
      {showNewInternalTaskTypeModal && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Add New Internal Task Type</h3>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Task Type Name</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                value={newInternalTaskTypeName}
                onChange={(e) => setNewInternalTaskTypeName(e.target.value)}
                placeholder="e.g., Research, Development"
                autoFocus
              />
            </div>
            <div className="modal-action">
              <button
                className="btn"
                onClick={() => {
                  setShowNewInternalTaskTypeModal(false);
                  setNewInternalTaskTypeName('');
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddInternalTaskType}
              >
                Add
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => {
              setShowNewInternalTaskTypeModal(false);
              setNewInternalTaskTypeName('');
            }}>close</button>
          </form>
        </dialog>
      )}
    </>
  );
}
