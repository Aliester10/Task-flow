import React from 'react';

interface ProgressBarProps {
  value: number;
  showLabel?: boolean;
  size?: 'xs' | 'sm' | 'md';
  color?: string;
  animated?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value, showLabel = true, size = 'sm', color, animated = false,
}) => {
  const v = Math.min(100, Math.max(0, value));
  const h = { xs: 'h-2', sm: 'h-2.5', md: 'h-3' }[size];
  const bar = color
    ?? (v === 100 ? 'bg-neo-lime' : v >= 60 ? 'bg-neo-yellow' : v >= 30 ? 'bg-neo-orange' : 'bg-neo-red');

  return (
    <div className="flex items-center gap-2.5">
      <div className={`flex-1 bg-white rounded-neo overflow-hidden ${h} border-2 border-gray-900`}>
        <div
          className={`${h} ${bar} transition-all duration-700 ease-out ${animated ? 'animate-pulse' : ''}`}
          style={{ width: `${v}%` }}
          role="progressbar"
          aria-valuenow={v}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {showLabel && (
        <span className="text-[11px] text-gray-900 font-bold tabular-nums w-7 text-right flex-shrink-0">
          {v}%
        </span>
      )}
    </div>
  );
};
