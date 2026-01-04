'use client';

import { useEffect, useRef, useState } from 'react';

interface CalendarDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  id?: string;
  placeholder?: string;
  required?: boolean;
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
  const calendarRef = useRef<any>(null);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  // Load Cally dynamically on client side only
  useEffect(() => {
    import('cally').then(() => {
      setCallyLoaded(true);
    });
  }, []);

  useEffect(() => {
    // Format the display value
    if (value) {
      // Parse date in local timezone to avoid off-by-one errors
      const [year, month, day] = value.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      setDisplayValue(date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }));
    } else {
      setDisplayValue('');
    }
  }, [value]);

  useEffect(() => {
    // Set up calendar change handler and initial value
    const calendar = calendarRef.current;
    if (calendar && callyLoaded) {
      // Set initial value
      if (value) {
        calendar.value = value;
      }

      const handleChange = (e: any) => {
        const selectedDate = e.target.value;
        console.log('Cally selected date:', selectedDate);
        onChange(selectedDate);
        // Close the dropdown after selection
        if (detailsRef.current) {
          detailsRef.current.open = false;
        }
      };

      calendar.addEventListener('change', handleChange);
      return () => calendar.removeEventListener('change', handleChange);
    }
  }, [onChange, value, callyLoaded]);

  return (
    <details ref={detailsRef} className="dropdown dropdown-top w-full">
      <summary className="input input-bordered w-full text-left flex items-center justify-between cursor-pointer" id={id}>
        <span className={displayValue ? '' : 'text-base-content/50'}>
          {displayValue || placeholder}
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </summary>

      {callyLoaded && (
        <div className="dropdown-content z-50 bg-base-100 border border-base-300 shadow-lg rounded-box mt-2">
          {/* @ts-ignore - calendar-date is a web component */}
          <calendar-date
            ref={calendarRef}
            class="cally"
            value={value}
          >
            {/* @ts-ignore - slot is valid for web components */}
            <svg
              aria-label="Previous"
              className="fill-current size-4"
              slot="previous"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
            >
              <path fill="currentColor" d="M15.75 19.5 8.25 12l7.5-7.5"></path>
            </svg>
            {/* @ts-ignore - slot is valid for web components */}
            <svg
              aria-label="Next"
              className="fill-current size-4"
              slot="next"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
            >
              <path fill="currentColor" d="m8.25 4.5 7.5 7.5-7.5 7.5"></path>
            </svg>
            {/* @ts-ignore - calendar-month is a web component */}
            <calendar-month></calendar-month>
          </calendar-date>
        </div>
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
    </details>
  );
}
