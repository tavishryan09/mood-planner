'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface CalendarDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  id?: string;
  placeholder?: string;
  required?: boolean;
}

// Helper to normalize date strings to YYYY-MM-DD format
function normalizeDate(dateStr: string): string {
  if (!dateStr) return '';

  // If it's already in YYYY-MM-DD format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // Handle ISO timestamps (e.g., "2026-01-29T00:00:00.000Z")
  if (dateStr.includes('T')) {
    return dateStr.split('T')[0];
  }

  // Try parsing as a date and formatting
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return dateStr;
}

export default function CalendarDatePicker({
  value,
  onChange,
  id = 'calendar-picker',
  placeholder = 'Pick a date',
  required = false
}: CalendarDatePickerProps) {
  const [displayValue, setDisplayValue] = useState('');
  const [callyLoaded, setCallyLoaded] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [calendarPosition, setCalendarPosition] = useState({ top: 0, left: 0 });
  const calendarRef = useRef<any>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Normalize the value to YYYY-MM-DD format
  const normalizedValue = normalizeDate(value);

  // Load Cally dynamically on client side only
  useEffect(() => {
    import('cally').then(() => {
      setCallyLoaded(true);
    });
  }, []);

  useEffect(() => {
    // Format the display value
    if (normalizedValue) {
      // Parse date in local timezone to avoid off-by-one errors
      const [year, month, day] = normalizedValue.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      setDisplayValue(date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }));
    } else {
      setDisplayValue('');
    }
  }, [normalizedValue]);

  useEffect(() => {
    // Set up calendar change handler and initial value
    const calendar = calendarRef.current;
    if (calendar && callyLoaded) {
      // Set initial value
      if (normalizedValue) {
        calendar.value = normalizedValue;
      }

      const handleChange = (e: any) => {
        const selectedDate = e.target.value;
        onChange(selectedDate);
        // Close the dropdown after selection
        setIsOpen(false);
      };

      calendar.addEventListener('change', handleChange);
      return () => calendar.removeEventListener('change', handleChange);
    }
  }, [onChange, normalizedValue, callyLoaded]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Update position when open
  useEffect(() => {
    const updatePosition = () => {
      if (isOpen && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();

        let top = rect.bottom + 8;
        let left = rect.left;

        // Calendar approximate dimensions
        const calendarWidth = 300;
        const calendarHeight = 320;

        // Check if calendar would go off right edge
        if (left + calendarWidth > window.innerWidth) {
          left = window.innerWidth - calendarWidth - 16;
        }

        // Check if calendar would go off bottom edge, show above if needed
        if (top + calendarHeight > window.innerHeight) {
          top = rect.top - calendarHeight - 8;
        }

        // Ensure minimum positions
        left = Math.max(16, left);
        top = Math.max(8, top);

        setCalendarPosition({ top, left });
      }
    };

    if (isOpen) {
      updatePosition();
      const rafId = requestAnimationFrame(updatePosition);
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);

      return () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen]);

  return (
    <div className="w-full">
      <button
        ref={buttonRef}
        type="button"
        className="input input-bordered w-full text-left flex items-center justify-between cursor-pointer"
        id={id}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={displayValue ? '' : 'text-base-content/50'}>
          {displayValue || placeholder}
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      {isOpen && callyLoaded && typeof window !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[1000] bg-base-100 border border-base-300 shadow-xl rounded-box p-2"
          style={{
            top: `${calendarPosition.top}px`,
            left: `${calendarPosition.left}px`
          }}
        >
          {/* @ts-expect-error - calendar-date is a web component */}
          <calendar-date
            ref={calendarRef}
            class="cally"
            value={normalizedValue}
          >
            <svg
              aria-label="Previous"
              className="fill-current size-4"
              {...({ slot: 'previous' } as any)}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
            >
              <path fill="currentColor" d="M15.75 19.5 8.25 12l7.5-7.5"></path>
            </svg>
            <svg
              aria-label="Next"
              className="fill-current size-4"
              {...({ slot: 'next' } as any)}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
            >
              <path fill="currentColor" d="m8.25 4.5 7.5 7.5-7.5 7.5"></path>
            </svg>
            {/* @ts-expect-error - calendar-month is a web component */}
            <calendar-month></calendar-month>
          {/* @ts-expect-error - calendar-date is a web component */}
          </calendar-date>
        </div>,
        document.body
      )}

      {required && !value && (
        <input
          type="text"
          required
          value={value}
          onChange={() => {}}
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0 }}
          tabIndex={-1}
        />
      )}
    </div>
  );
}
