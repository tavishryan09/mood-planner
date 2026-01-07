'use client';

import { useLongPress } from '@/hooks/useLongPress';

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

interface TaskCellProps {
  task: PlanningTask;
  visualRowIndex: number;
  visualRowSpan: number;
  draggedTask: PlanningTask | null;
  isResizing: boolean;
  selectedTask: PlanningTask | null;
  isCutTask: boolean;
  copiedTask: PlanningTask | null;
  isMobile: boolean;
  handleTaskDragStart: (e: React.DragEvent, task: PlanningTask) => void;
  handleTaskDragEnd: () => void;
  handleTaskClick: (e: React.MouseEvent, task: PlanningTask) => void;
  handleTaskEdit: (task: PlanningTask) => void;
  handleResizeStart: (e: React.MouseEvent | React.TouchEvent, task: PlanningTask, edge: 'top' | 'bottom') => void;
  handleTaskLongPress: (task: PlanningTask) => void;
}

export default function TaskCell({
  task,
  visualRowIndex,
  visualRowSpan,
  draggedTask,
  isResizing,
  selectedTask,
  isCutTask,
  copiedTask,
  isMobile,
  handleTaskDragStart,
  handleTaskDragEnd,
  handleTaskClick,
  handleTaskEdit,
  handleResizeStart,
  handleTaskLongPress
}: TaskCellProps) {
  const longPressHandlers = useLongPress({
    onLongPress: () => handleTaskLongPress(task),
    onClick: (e) => handleTaskClick(e as React.MouseEvent, task),
    threshold: 500
  });

  return (
    <div
      draggable
      onDragStart={(e) => handleTaskDragStart(e, task)}
      onDragEnd={handleTaskDragEnd}
      {...(isMobile ? longPressHandlers : { onClick: (e) => handleTaskClick(e, task) })}
      onDoubleClick={(e) => {
        e.stopPropagation();
        handleTaskEdit(task);
      }}
      className={`absolute rounded px-2 py-1 text-xs font-medium cursor-move z-10 flex items-center ${
        task.taskType === 'Project Task'
          ? 'bg-primary text-primary-content'
          : task.taskType === 'Out of Office'
          ? 'bg-secondary text-secondary-content'
          : task.taskType === 'PTO'
          ? 'bg-info text-info-content'
          : task.taskType === 'Internal'
          ? 'bg-success text-success-content'
          : task.taskType === 'Unavailable'
          ? 'bg-accent text-accent-content'
          : 'bg-error text-error-content'
      } ${draggedTask?.id === task.id ? 'opacity-50' : ''} ${isResizing ? 'ring-2 ring-base-content/30' : ''} ${selectedTask?.id === task.id ? 'ring-4 ring-accent' : ''} ${isCutTask && copiedTask?.id === task.id ? 'opacity-50 ring-2 ring-dashed ring-accent' : ''}`}
      style={{
        top: `${(visualRowIndex - task.rowIndex) * 60 + 6}px`,
        left: '4px',
        right: '4px',
        height: `${(visualRowSpan * 60) - 12}px`
      }}
    >
      {/* Top resize handle */}
      <div
        onMouseDown={(e) => handleResizeStart(e, task, 'top')}
        onTouchStart={(e) => handleResizeStart(e, task, 'top')}
        className={`absolute top-0 left-0 right-0 ${isMobile ? 'h-3' : 'h-1'} cursor-ns-resize hover:bg-base-content/20 z-10`}
        style={{ marginTop: '-2px' }}
      />

      <div className="flex flex-col gap-0.5 overflow-hidden w-full max-w-full h-full">
        <div className="flex-1 overflow-hidden">
          {/* Header line: Project name with task type in parentheses for non-Project tasks, or just project/task type */}
          <div className={`font-semibold w-full overflow-hidden ${visualRowSpan === 1 ? 'truncate' : ''}`}
            style={visualRowSpan > 1 ? {
              display: '-webkit-box',
              WebkitLineClamp: visualRowSpan,
              WebkitBoxOrient: 'vertical'
            } : undefined}>
            {task.taskType === 'Internal'
              ? task.internalTaskTypeName || 'Internal'
              : (task.projectCommonName || task.projectName) && task.taskType !== 'Project Task'
              ? `${task.projectCommonName || task.projectName} (${task.taskType})`
              : task.projectCommonName || task.projectName || task.taskType
            }
          </div>
          {/* Description line: Show custom description only if it's different from task type */}
          {task.taskDescription && task.taskDescription !== task.taskType ? (
            <div className={`opacity-90 w-full overflow-hidden ${visualRowSpan === 1 ? 'truncate' : ''}`}
              style={visualRowSpan > 1 ? {
                display: '-webkit-box',
                WebkitLineClamp: Math.max(1, visualRowSpan * 2 - 1),
                WebkitBoxOrient: 'vertical'
              } : undefined}>
              {task.taskDescription}
            </div>
          ) : null}
        </div>
      </div>

      {/* Bottom resize handle */}
      <div
        onMouseDown={(e) => handleResizeStart(e, task, 'bottom')}
        onTouchStart={(e) => handleResizeStart(e, task, 'bottom')}
        className={`absolute bottom-0 left-0 right-0 ${isMobile ? 'h-3' : 'h-1'} cursor-ns-resize hover:bg-base-content/20 z-10`}
        style={{ marginBottom: '-2px' }}
      />
    </div>
  );
}
