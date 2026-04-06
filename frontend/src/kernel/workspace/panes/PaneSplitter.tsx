import type { MouseEventHandler } from 'react';

interface PaneSplitterProps {
  onMouseDown?: MouseEventHandler<HTMLDivElement>;
  className?: string;
}

export function PaneSplitter({ onMouseDown, className }: PaneSplitterProps) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      className={className}
      onMouseDown={onMouseDown}
    />
  );
}
