'use client';

interface CalendarHeaderProps {
  quarterDays: Date[];
  formatMonthDay: (date: Date) => string;
  getDayName: (date: Date) => string;
  isToday: (date: Date) => boolean;
  isWeekend: (date: Date) => boolean;
  milestoneRowCount: number;
  setMilestoneRowCount: (count: number | ((prev: number) => number)) => void;
  getMilestoneForCell: (day: Date, rowIndex: number) => any;
  handleMilestoneCellDoubleClick: (day: Date, rowIndex: number) => void;
  handleMilestoneCellDragOver: (e: React.DragEvent, day: Date, rowIndex: number) => void;
  handleMilestoneCellDrop: (e: React.DragEvent, day: Date, rowIndex: number) => void;
  setSelectedMilestoneCell: (cell: { date: Date; rowIndex: number } | null) => void;
  setSelectedTask: (task: any) => void;
  setSelectedMilestone: (milestone: any) => void;
  setSelectedCell: (cell: any) => void;
  draggedMilestone: any;
  dragOverMilestoneCell: { date: Date; rowIndex: number } | null;
  handleMilestoneClick: (e: React.MouseEvent, milestone: any) => void;
  handleMilestoneEdit: (milestone: any) => void;
  handleMilestoneDragStart: (e: React.DragEvent, milestone: any) => void;
  handleMilestoneDragEnd: () => void;
}

export default function CalendarHeader({
  quarterDays,
  formatMonthDay,
  getDayName,
  isToday,
  isWeekend,
  milestoneRowCount,
  setMilestoneRowCount,
  getMilestoneForCell,
  handleMilestoneCellDoubleClick,
  handleMilestoneCellDragOver,
  handleMilestoneCellDrop,
  setSelectedMilestoneCell,
  setSelectedTask,
  setSelectedMilestone,
  setSelectedCell,
  draggedMilestone,
  dragOverMilestoneCell,
  handleMilestoneClick,
  handleMilestoneEdit,
  handleMilestoneDragStart,
  handleMilestoneDragEnd
}: CalendarHeaderProps) {
  return (
    <thead className="bg-base-100 sticky top-0 z-30">
      <tr>
        <th className="bg-base-100 sticky left-0 z-50 text-center" style={{ minWidth: '120px', width: '120px' }}>
          Date
        </th>
        {quarterDays.map((day, index) => {
          const isNewMonth = index === 0 || day.getDate() === 1;
          return (
            <th
              key={day.toISOString()}
              className={`text-center px-2 ${
                isToday(day)
                  ? 'bg-primary text-primary-content'
                  : isWeekend(day)
                  ? 'bg-base-300'
                  : 'bg-base-100'
              } ${isNewMonth ? 'border-l-2 border-base-300' : ''}`}
              style={{ minWidth: '140px', width: '140px' }}
            >
              <div className="flex flex-col items-center">
                <div className="text-xs font-normal opacity-70">
                  {getDayName(day)}
                </div>
                <div className="text-sm font-bold">
                  {formatMonthDay(day)}
                </div>
              </div>
            </th>
          );
        })}
      </tr>
      {/* Deadlines/Milestones Rows */}
      {Array.from({ length: milestoneRowCount }).map((_, rowIndex) => (
        <tr key={`milestone-${rowIndex}`} className="bg-base-200">
          {rowIndex === 0 ? (
            <th
              rowSpan={milestoneRowCount}
              className="bg-base-200 font-semibold text-sm text-center align-middle sticky left-0 z-50 relative"
              style={{ minWidth: '120px', width: '120px' }}
            >
              <div className="flex flex-col items-center justify-center h-full">
                <div>
                  Deadlines/
                  <br />
                  Milestones
                </div>
                <button
                  onClick={() => setMilestoneRowCount(prev => prev + 1)}
                  className="absolute bottom-2 btn btn-xs btn-circle btn-ghost opacity-50 hover:opacity-100"
                  title="Add row"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </button>
              </div>
            </th>
          ) : null}
          {quarterDays.map((day, colIndex) => {
            const isNewMonth = colIndex === 0 || day.getDate() === 1;
            const milestone = getMilestoneForCell(day, rowIndex);

            return (
              <td
                key={`milestone-${rowIndex}-${day.toISOString()}`}
                onClick={() => {
                  if (!milestone) {
                    setSelectedMilestoneCell({ date: day, rowIndex });
                    setSelectedTask(null);
                    setSelectedMilestone(null);
                    setSelectedCell(null);
                  }
                }}
                onDoubleClick={() => {
                  if (!milestone) {
                    handleMilestoneCellDoubleClick(day, rowIndex);
                  }
                }}
                onDragOver={(e) => handleMilestoneCellDragOver(e, day, rowIndex)}
                onDrop={(e) => handleMilestoneCellDrop(e, day, rowIndex)}
                className={`p-0 hover:bg-base-200 transition-colors cursor-pointer relative border-b-0 bg-base-200 ${
                  isToday(day)
                    ? 'bg-primary/10'
                    : isWeekend(day)
                    ? 'bg-base-300/30'
                    : ''
                } ${isNewMonth ? 'border-l-2 border-base-300' : ''} ${
                  draggedMilestone && !milestone ? 'bg-primary/10' : ''
                } ${
                  dragOverMilestoneCell?.date.toISOString().split('T')[0] === day.toISOString().split('T')[0] &&
                  dragOverMilestoneCell?.rowIndex === rowIndex
                    ? !milestone || milestone?.id === draggedMilestone?.id
                      ? 'bg-success/30 border-2 border-success'
                      : 'bg-error/30 border-2 border-error'
                    : ''
                }`}
                style={{
                  minWidth: '140px',
                  maxWidth: '140px',
                  width: '140px',
                  minHeight: '60px',
                  height: '60px'
                }}
              >
                {(() => {
                  if (!milestone) return <div className="h-full w-full"></div>;

                  const bgColor =
                    milestone.taskType === 'Deadline'
                      ? 'bg-error'
                      : milestone.taskType === 'Internal Deadline'
                      ? 'bg-warning'
                      : 'bg-success';

                  const textColor =
                    milestone.taskType === 'Deadline'
                      ? 'text-error-content'
                      : milestone.taskType === 'Internal Deadline'
                      ? 'text-warning-content'
                      : 'text-success-content';

                  return (
                    <div
                      draggable
                      onDragStart={(e) => handleMilestoneDragStart(e, milestone)}
                      onDragEnd={handleMilestoneDragEnd}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMilestoneClick(e, milestone);
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        handleMilestoneEdit(milestone);
                      }}
                      className={`${bgColor} ${textColor} text-xs cursor-move h-full w-full flex items-center justify-center text-center hover:opacity-90 transition-opacity`}
                    >
                      {milestone.projectCommonName || milestone.taskDescription || milestone.taskType}
                    </div>
                  );
                })()}
              </td>
            );
          })}
        </tr>
      ))}
    </thead>
  );
}
