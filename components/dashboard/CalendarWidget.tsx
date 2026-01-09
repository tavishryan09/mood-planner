'use client';

import React, { useState, useMemo } from 'react';
import { formatDateLocal, getDayName, isToday, isWeekend } from '@/lib/date-utils';

interface PlanningTask {
  id: number;
  userId: number;
  projectId: number | null;
  taskDescription: string;
  taskType: 'Project Task' | 'Out of Office' | 'Unavailable' | 'PTO' | 'Internal';
  taskDate: string;
  rowIndex: number;
  rowSpan: number;
  completed: boolean;
  projectCommonName?: string;
  projectName?: string;
  clientName?: string;
  internalTaskTypeId?: number;
  internalTaskTypeName?: string;
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

interface CalendarWidgetProps {
  tasks: PlanningTask[];
  milestones: MilestoneTask[];
}

const CalendarWidget: React.FC<CalendarWidgetProps> = ({ tasks, milestones }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Get first and last day of current month
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

  // Get the day of week for first day (0 = Sunday)
  const startingDayOfWeek = firstDayOfMonth.getDay();

  // Get number of days in month
  const daysInMonth = lastDayOfMonth.getDate();

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const days = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      days.push(date);
    }

    return days;
  }, [currentDate, startingDayOfWeek, daysInMonth]);

  // Group tasks and milestones by date
  const eventsByDate = useMemo(() => {
    const events: { [key: string]: { tasks: PlanningTask[]; milestones: MilestoneTask[] } } = {};

    // Helper to normalize date strings to YYYY-MM-DD format
    const normalizeDateString = (dateStr: string): string => {
      // If it's already in YYYY-MM-DD format, return as is
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
      }
      // Otherwise parse and format to YYYY-MM-DD
      const date = new Date(dateStr);
      return formatDateLocal(date);
    };

    tasks.forEach(task => {
      const normalizedDate = normalizeDateString(task.taskDate);
      if (!events[normalizedDate]) {
        events[normalizedDate] = { tasks: [], milestones: [] };
      }
      events[normalizedDate].tasks.push(task);
    });

    milestones.forEach(milestone => {
      const normalizedDate = normalizeDateString(milestone.taskDate);
      if (!events[normalizedDate]) {
        events[normalizedDate] = { tasks: [], milestones: [] };
      }
      events[normalizedDate].milestones.push(milestone);
    });

    return events;
  }, [tasks, milestones]);

  // Navigation handlers
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Format month/year for header
  const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Get task type color
  const getTaskTypeColor = (taskType: PlanningTask['taskType']) => {
    switch (taskType) {
      case 'Project Task':
        return 'badge-primary';
      case 'Out of Office':
        return 'badge-warning';
      case 'PTO':
        return 'badge-info';
      case 'Internal':
        return 'badge-secondary';
      case 'Unavailable':
        return 'badge-error';
      default:
        return 'badge-neutral';
    }
  };

  // Get milestone type color
  const getMilestoneTypeColor = (taskType: MilestoneTask['taskType']) => {
    switch (taskType) {
      case 'Deadline':
        return 'badge-error';
      case 'Internal Deadline':
        return 'badge-warning';
      case 'Milestone':
        return 'badge-success';
      default:
        return 'badge-neutral';
    }
  };

  return (
    <div className="card bg-base-100 shadow-sm h-full flex flex-col">
      <div className="card-body p-4 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="card-title text-lg">Calendar</h2>
          <div className="flex gap-2">
            <button
              onClick={goToPreviousMonth}
              className="btn btn-ghost btn-sm"
              aria-label="Previous month"
            >
              ←
            </button>
            <button
              onClick={goToToday}
              className="btn btn-ghost btn-sm"
            >
              Today
            </button>
            <button
              onClick={goToNextMonth}
              className="btn btn-ghost btn-sm"
              aria-label="Next month"
            >
              →
            </button>
          </div>
        </div>

        {/* Month/Year */}
        <div className="text-center font-semibold mb-4">{monthYear}</div>

        {/* Calendar Grid */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-semibold text-base-content/70 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1 flex-1 auto-rows-fr">
            {calendarDays.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="border border-base-300 rounded" />;
              }

              const dateStr = formatDateLocal(date);
              const dayEvents = eventsByDate[dateStr] || { tasks: [], milestones: [] };
              const hasEvents = dayEvents.tasks.length > 0 || dayEvents.milestones.length > 0;
              const isTodayDate = isToday(date);
              const isWeekendDate = isWeekend(date);

              return (
                <div
                  key={dateStr}
                  className={`
                    border rounded p-1 flex flex-col overflow-hidden
                    ${isTodayDate ? 'border-primary border-2 bg-primary/5' : 'border-base-300'}
                    ${isWeekendDate ? 'bg-base-200/50' : 'bg-base-100'}
                  `}
                >
                  {/* Day number */}
                  <div className={`text-xs font-semibold mb-1 ${isTodayDate ? 'text-primary' : ''}`}>
                    {date.getDate()}
                  </div>

                  {/* Events */}
                  {hasEvents && (
                    <div className="flex flex-col gap-0.5 overflow-hidden">
                      {/* Milestones */}
                      {dayEvents.milestones.slice(0, 2).map(milestone => (
                        <div
                          key={milestone.id}
                          className={`badge badge-xs ${getMilestoneTypeColor(milestone.taskType)} truncate w-full`}
                          title={milestone.taskDescription || milestone.projectCommonName || milestone.projectName}
                        >
                          <span className="truncate text-[10px]">
                            {milestone.taskDescription || milestone.projectCommonName || milestone.projectName}
                          </span>
                        </div>
                      ))}

                      {/* Tasks */}
                      {dayEvents.tasks.slice(0, 2).map(task => {
                        const projectName = task.projectCommonName || task.projectName;
                        const displayText = projectName
                          ? `${projectName}: ${task.taskDescription}`
                          : task.taskDescription;

                        return (
                          <div
                            key={task.id}
                            className={`badge badge-xs ${getTaskTypeColor(task.taskType)} truncate w-full`}
                            title={displayText}
                          >
                            <span className="truncate text-[10px]">
                              {displayText}
                            </span>
                          </div>
                        );
                      })}

                      {/* More indicator */}
                      {(dayEvents.tasks.length + dayEvents.milestones.length) > 4 && (
                        <div className="text-[10px] text-base-content/60 text-center">
                          +{(dayEvents.tasks.length + dayEvents.milestones.length) - 4} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-base-300">
          <div className="text-xs text-base-content/70 mb-2 font-semibold">Legend:</div>
          <div className="flex flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1">
              <span className="badge badge-primary badge-xs"></span>
              <span>Project Task</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="badge badge-error badge-xs"></span>
              <span>Deadline</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="badge badge-warning badge-xs"></span>
              <span>Internal Deadline</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="badge badge-success badge-xs"></span>
              <span>Milestone</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarWidget;
