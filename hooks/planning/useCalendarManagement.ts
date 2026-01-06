import { useState, useEffect, useRef } from 'react';

export function useCalendarManagement() {
  const [quarterDays, setQuarterDays] = useState<Date[]>([]);
  const [currentQuarter, setCurrentQuarter] = useState('');
  const [selectedQuarterOffset, setSelectedQuarterOffset] = useState(0);
  const [loadedQuarterOffsets, setLoadedQuarterOffsets] = useState<number[]>([0]);
  const [currentWeekNumber, setCurrentWeekNumber] = useState(1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScroll = useRef(false);
  const pendingScrollTarget = useRef<Date | null>(null);

  const getQuarterInfo = (offset: number = 0) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let quarterStartMonth;
    if (currentMonth < 3) {
      quarterStartMonth = 0;
    } else if (currentMonth < 6) {
      quarterStartMonth = 3;
    } else if (currentMonth < 9) {
      quarterStartMonth = 6;
    } else {
      quarterStartMonth = 9;
    }

    const adjustedQuarter = Math.floor(quarterStartMonth / 3) + offset;
    const adjustedYear = currentYear + Math.floor(adjustedQuarter / 4);
    const adjustedStartMonth = (adjustedQuarter % 4) * 3;
    const normalizedStartMonth = adjustedStartMonth < 0 ? adjustedStartMonth + 12 : adjustedStartMonth;

    const quarterStart = new Date(adjustedYear, normalizedStartMonth, 1);
    const quarterEnd = new Date(adjustedYear, normalizedStartMonth + 3, 0);

    const quarterNames = ['Q1', 'Q2', 'Q3', 'Q4'];
    const quarterIndex = Math.floor(normalizedStartMonth / 3);
    const quarterName = `${quarterNames[quarterIndex]} ${adjustedYear}`;

    return {
      start: quarterStart,
      end: quarterEnd,
      name: quarterName
    };
  };

  const generateQuarterDaysArray = (offset: number = 0): Date[] => {
    const quarterInfo = getQuarterInfo(offset);
    const start = quarterInfo.start;
    const end = quarterInfo.end;

    const days: Date[] = [];
    const current = new Date(start);

    while (current <= end) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  const generateQuarterDays = (offset: number = 0) => {
    const days = generateQuarterDaysArray(offset);
    const quarterInfo = getQuarterInfo(offset);

    setQuarterDays(days);
    setCurrentQuarter(quarterInfo.name);
    setSelectedQuarterOffset(offset);
  };

  const appendQuarter = async (newOffset: number) => {
    if (loadedQuarterOffsets.includes(newOffset)) {
      return;
    }

    setLoadedQuarterOffsets(prev => [...prev, newOffset]);

    const newQuarterDays = generateQuarterDaysArray(newOffset);

    setQuarterDays(prevDays => {
      const allDays = [...prevDays, ...newQuarterDays];
      const uniqueDays = Array.from(
        new Map(allDays.map(day => [day.toISOString().split('T')[0], day])).values()
      ).sort((a, b) => a.getTime() - b.getTime());
      return uniqueDays;
    });
  };

  const prependQuarter = async (newOffset: number) => {
    if (loadedQuarterOffsets.includes(newOffset)) {
      return;
    }

    setLoadedQuarterOffsets(prev => [...prev, newOffset]);

    const newQuarterDays = generateQuarterDaysArray(newOffset);

    const scrollContainer = scrollContainerRef.current;
    const previousScrollLeft = scrollContainer?.scrollLeft || 0;
    const firstDateCell = scrollContainer?.querySelector('th:nth-child(2)');
    const cellWidth = firstDateCell?.getBoundingClientRect().width || 140;
    const newScrollLeft = previousScrollLeft + (newQuarterDays.length * cellWidth);

    setQuarterDays(prevDays => {
      const allDays = [...newQuarterDays, ...prevDays];
      const uniqueDays = Array.from(
        new Map(allDays.map(day => [day.toISOString().split('T')[0], day])).values()
      ).sort((a, b) => a.getTime() - b.getTime());

      requestAnimationFrame(() => {
        if (scrollContainer) {
          isProgrammaticScroll.current = true;
          scrollContainer.scrollLeft = newScrollLeft;
          setTimeout(() => {
            isProgrammaticScroll.current = false;
          }, 100);
        }
      });

      return uniqueDays;
    });
  };

  const getWeekNumber = (date: Date) => {
    if (quarterDays.length === 0) return 1;
    const firstQuarterDay = quarterDays[0];
    const diffTime = date.getTime() - firstQuarterDay.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 7) + 1;
  };

  const getMondayOfWeek = (date: Date) => {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.getFullYear(), date.getMonth(), diff);
  };

  const scrollToCurrentWeek = () => {
    const today = new Date();
    const monday = getMondayOfWeek(today);
    scrollToMonday(monday);
  };

  const scrollToMonday = (monday: Date) => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const mondayIndex = quarterDays.findIndex(
      day => day.toDateString() === monday.toDateString()
    );

    if (mondayIndex === -1) {
      pendingScrollTarget.current = monday;
      return;
    }

    const firstDateCell = scrollContainer.querySelector('th:nth-child(2)');
    const cellWidth = firstDateCell?.getBoundingClientRect().width || 140;
    const scrollLeft = mondayIndex * cellWidth;

    isProgrammaticScroll.current = true;
    scrollContainer.scrollLeft = scrollLeft;
    setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 100);

    setCurrentWeekNumber(getWeekNumber(monday));
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const firstDateCell = scrollContainer.querySelector('th:nth-child(2)');
    const cellWidth = firstDateCell?.getBoundingClientRect().width || 140;
    const currentScrollLeft = scrollContainer.scrollLeft;
    const currentColumnIndex = Math.round(currentScrollLeft / cellWidth);

    let targetColumnIndex;
    if (direction === 'next') {
      targetColumnIndex = Math.min(currentColumnIndex + 7, quarterDays.length - 1);
    } else {
      targetColumnIndex = Math.max(currentColumnIndex - 7, 0);
    }

    const targetDate = quarterDays[targetColumnIndex];
    const targetMonday = getMondayOfWeek(targetDate);

    scrollToMonday(targetMonday);
  };

  // Format helpers
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  };

  const formatMonthDay = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getDayName = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const getMonthName = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long' });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  return {
    quarterDays,
    currentQuarter,
    selectedQuarterOffset,
    loadedQuarterOffsets,
    currentWeekNumber,
    scrollContainerRef,
    isProgrammaticScroll,
    pendingScrollTarget,
    setCurrentWeekNumber,
    generateQuarterDays,
    appendQuarter,
    prependQuarter,
    getWeekNumber,
    getMondayOfWeek,
    scrollToCurrentWeek,
    scrollToMonday,
    navigateWeek,
    formatDate,
    formatMonthDay,
    getDayName,
    getMonthName,
    isToday,
    isWeekend
  };
}
