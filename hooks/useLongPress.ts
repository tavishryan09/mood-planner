import { useRef, useCallback } from 'react';

interface UseLongPressOptions {
  onLongPress: (e: React.TouchEvent | React.MouseEvent) => void;
  onClick?: (e: React.TouchEvent | React.MouseEvent) => void;
  threshold?: number;
}

export function useLongPress(options: UseLongPressOptions) {
  const { onLongPress, onClick, threshold = 500 } = options;
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const start = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    startPosRef.current = { x: clientX, y: clientY };
    isLongPressRef.current = false;

    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      onLongPress(e);
    }, threshold);
  }, [onLongPress, threshold]);

  const clear = useCallback((e: React.TouchEvent | React.MouseEvent, shouldTriggerClick = true) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (shouldTriggerClick && !isLongPressRef.current && onClick) {
      onClick(e);
    }

    startPosRef.current = null;
  }, [onClick]);

  const move = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!startPosRef.current) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const deltaX = Math.abs(clientX - startPosRef.current.x);
    const deltaY = Math.abs(clientY - startPosRef.current.y);

    // If moved more than 10px, cancel the long press
    if (deltaX > 10 || deltaY > 10) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  }, []);

  return {
    onTouchStart: start,
    onTouchEnd: clear,
    onTouchMove: move,
    onMouseDown: start,
    onMouseUp: clear,
    onMouseMove: move,
    onMouseLeave: (e: React.MouseEvent) => clear(e, false)
  };
}
