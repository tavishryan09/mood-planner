'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface DatePickerProps {
  value: string; // YYYY-MM-DD format
  onChange: (date: string) => void;
  label?: string;
  required?: boolean;
  className?: string;
}

export default function DatePicker({ value, onChange, label, required, className = '' }: DatePickerProps) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(value);
  const [calendarPosition, setCalendarPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setSelectedDate(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setShowCalendar(false);
      }
    };

    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCalendar]);

  useEffect(() => {
    const updatePosition = () => {
      if (showCalendar && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();

        // Calculate position
        let top = rect.bottom + window.scrollY + 8;
        let left = rect.left + window.scrollX;

        // Ensure calendar doesn't go off screen
        const calendarWidth = 320; // 80 * 4 (w-80 in pixels)
        const calendarHeight = 400; // approximate height

        // Check if calendar would go off right edge
        if (left + calendarWidth > window.innerWidth) {
          left = window.innerWidth - calendarWidth - 16;
        }

        // Check if calendar would go off bottom edge, show above if needed
        if (top + calendarHeight > window.innerHeight + window.scrollY) {
          top = rect.top + window.scrollY - calendarHeight - 8;
        }

        // Ensure minimum left position
        left = Math.max(16, left);

        setCalendarPosition({ top, left });
      }
    };

    if (showCalendar) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [showCalendar]);

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return 'Select date';
    // Parse YYYY-MM-DD without timezone conversion
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleDateSelect = (dateStr: string) => {
    setSelectedDate(dateStr);
    onChange(dateStr);
    setShowCalendar(false);
  };

  const getCurrentMonth = () => {
    if (selectedDate) {
      const [year, month, day] = selectedDate.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    return new Date();
  };

  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth());

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];

    // Add empty cells for days before the first of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add the days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    const [year, month, dayOfMonth] = selectedDate.split('-').map(Number);
    return (
      day === dayOfMonth &&
      currentMonth.getMonth() === month - 1 &&
      currentMonth.getFullYear() === year
    );
  };

  const formatDateString = (day: number) => {
    const year = currentMonth.getFullYear();
    const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${year}-${month}-${dayStr}`;
  };

  const days = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className={`form-control w-full ${className}`}>
      {label && (
        <div className="label">
          <span className="label-text">
            {label}
            {required && ' *'}
          </span>
        </div>
      )}

      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          className="input input-bordered w-full text-left flex items-center justify-between"
          onClick={() => setShowCalendar(!showCalendar)}
        >
          <span className={selectedDate ? '' : 'opacity-50'}>
            {formatDisplayDate(selectedDate)}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5 opacity-50"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
            />
          </svg>
        </button>

        {showCalendar && typeof window !== 'undefined' && createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[1000] p-4 bg-base-100 border border-base-300 rounded-lg shadow-xl w-80"
            style={{
              top: `${calendarPosition.top}px`,
              left: `${calendarPosition.left}px`
            }}
          >
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                className="btn btn-sm btn-ghost btn-circle"
                onClick={previousMonth}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <h3 className="font-semibold text-sm">{monthName}</h3>
              <button
                type="button"
                className="btn btn-sm btn-ghost btn-circle"
                onClick={nextMonth}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>

            {/* Day labels */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                <div key={day} className="text-center text-xs font-semibold opacity-50 p-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, index) => (
                <div key={index} className="aspect-square">
                  {day !== null ? (
                    <button
                      type="button"
                      className={`btn btn-sm w-full h-full p-0 ${
                        isSelected(day)
                          ? 'btn-primary'
                          : isToday(day)
                          ? 'btn-outline'
                          : 'btn-ghost'
                      }`}
                      onClick={() => handleDateSelect(formatDateString(day))}
                    >
                      {day}
                    </button>
                  ) : (
                    <div />
                  )}
                </div>
              ))}
            </div>

            {/* Today button */}
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => {
                  const today = new Date();
                  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                  handleDateSelect(todayStr);
                }}
              >
                Today
              </button>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}
