import React from 'react';
import { TaskStatus, Priority } from '../../types';
import { StatusIcon, PriorityIcon } from './StatusIcon';

// ── Config (tetap dipakai untuk warna teks/bg) ─────────────────────────────

export const STATUS_STYLES: Record<TaskStatus, { label: string; className: string; dot: string; text: string }> = {
  BACKLOG:     { label: 'Backlog',     className: 'bg-gray-100  text-gray-700',    dot: 'bg-gray-500',    text: '#8993A4' },
  TODO:        { label: 'To Do',       className: 'bg-neo-cream text-gray-900',    dot: 'bg-gray-600',    text: '#44546F' },
  IN_PROGRESS: { label: 'In Progress', className: 'bg-neo-yellow text-gray-900',   dot: 'bg-amber-600',   text: '#E2A400' },
  REVIEW:      { label: 'Review',      className: 'bg-neo-purple text-gray-900',   dot: 'bg-purple-600',  text: '#6554C0' },
  DONE:        { label: 'Done',        className: 'bg-neo-lime  text-gray-900',    dot: 'bg-emerald-600', text: '#22A06B' },
  BLOCKED:     { label: 'Blocked',     className: 'bg-neo-red   text-white',       dot: 'bg-red-600',     text: '#FF5630' },
};

export const PRIORITY_STYLES: Record<Priority, { label: string; className: string }> = {
  LOW:    { label: 'Low',    className: 'bg-gray-100    text-gray-600'   },
  MEDIUM: { label: 'Medium', className: 'bg-neo-blue    text-gray-900'   },
  HIGH:   { label: 'High',   className: 'bg-neo-orange  text-gray-900'   },
  URGENT: { label: 'Urgent', className: 'bg-neo-red     text-white'      },
};

// ── Status Badge ───────────────────────────────────────────────────────────

export const StatusBadge: React.FC<{
  status: TaskStatus;
  className?: string;
  iconOnly?: boolean;
}> = ({ status, className = '', iconOnly = false }) => {
  const s = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-neo text-xs font-bold
        ${iconOnly ? 'p-0' : `px-2.5 py-1 border-2 border-gray-900 ${s.className}`} ${className}`}
      style={!iconOnly ? { boxShadow: '2px 2px 0px 0px #1a1a1a' } : {}}
      title={iconOnly ? s.label : undefined}
    >
      <StatusIcon status={status} size={iconOnly ? 14 : 12} />
      {!iconOnly && s.label}
    </span>
  );
};

// ── Priority Badge ─────────────────────────────────────────────────────────

export const PriorityBadge: React.FC<{
  priority: Priority;
  className?: string;
  iconOnly?: boolean;
}> = ({ priority, className = '', iconOnly = false }) => {
  const p = PRIORITY_STYLES[priority];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-neo text-xs font-bold
        ${iconOnly ? 'p-0' : `px-2 py-0.5 border-2 border-gray-900 ${p.className}`} ${className}`}
      style={!iconOnly ? { boxShadow: '1px 1px 0px 0px #1a1a1a' } : {}}
      title={iconOnly ? p.label : undefined}
    >
      <PriorityIcon priority={priority} size={iconOnly ? 14 : 12} />
      {!iconOnly && p.label}
    </span>
  );
};
