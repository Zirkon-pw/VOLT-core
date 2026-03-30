import { useEffect, useRef } from 'react';

export function useDoubleShift(onTrigger: () => void): void {
  const lastShiftTime = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Shift') {
        return;
      }

      // Ignore if focus is on input/textarea
      const target = e.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea') {
        return;
      }

      const now = Date.now();
      if (now - lastShiftTime.current < 300) {
        lastShiftTime.current = 0;
        onTrigger();
      } else {
        lastShiftTime.current = now;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onTrigger]);
}
