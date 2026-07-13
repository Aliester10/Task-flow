import React from 'react';
import { TaskStatus, Priority } from '../../types';

// ── Status Icons (Jira-style) ──────────────────────────────────────────────

export const StatusIcon: React.FC<{ status: TaskStatus; size?: number; className?: string }> = ({
  status, size = 16, className = '',
}) => {
  const s = size;
  const props = { width: s, height: s, viewBox: '0 0 16 16', fill: 'none', className };

  switch (status) {
    case 'BACKLOG':
      return (
        <svg {...props} aria-label="Backlog">
          <circle cx="8" cy="8" r="6.5" stroke="#8993A4" strokeWidth="1.5" strokeDasharray="3 2" />
        </svg>
      );
    case 'TODO':
      return (
        <svg {...props} aria-label="To Do">
          <circle cx="8" cy="8" r="6.5" stroke="#8993A4" strokeWidth="1.5" />
        </svg>
      );
    case 'IN_PROGRESS':
      return (
        <svg {...props} aria-label="In Progress">
          <circle cx="8" cy="8" r="6.5" stroke="#E2A400" strokeWidth="1.5" />
          {/* Half-fill arc */}
          <path
            d="M8 1.5 A6.5 6.5 0 0 1 8 14.5"
            stroke="none"
            fill="#E2A400"
            clipPath="url(#half)"
          />
          <circle cx="8" cy="8" r="5" fill="#E2A400" clipPath="url(#leftHalf)" />
          <defs>
            <clipPath id="leftHalf">
              <rect x="0" y="0" width="8" height="16" />
            </clipPath>
          </defs>
          <circle cx="8" cy="8" r="6.5" stroke="#E2A400" strokeWidth="1.5" fill="none" />
        </svg>
      );
    case 'REVIEW':
      return (
        <svg {...props} aria-label="Review">
          <circle cx="8" cy="8" r="6.5" stroke="#6554C0" strokeWidth="1.5" />
          {/* Three-quarter fill */}
          <circle cx="8" cy="8" r="5" fill="#6554C0" clipPath="url(#threeQuarter)" />
          <defs>
            <clipPath id="threeQuarter">
              <path d="M8 8 L8 1 A7 7 0 1 1 1 8 Z" />
            </clipPath>
          </defs>
          <circle cx="8" cy="8" r="6.5" stroke="#6554C0" strokeWidth="1.5" fill="none" />
        </svg>
      );
    case 'DONE':
      return (
        <svg {...props} aria-label="Done">
          <circle cx="8" cy="8" r="7" fill="#22A06B" />
          <path
            d="M5 8.5L7 10.5L11 6"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'BLOCKED':
      return (
        <svg {...props} aria-label="Blocked">
          <circle cx="8" cy="8" r="7" fill="#FF5630" />
          <path d="M5.5 8H10.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
};

// ── Priority Icons (Jira-style) ────────────────────────────────────────────

export const PriorityIcon: React.FC<{ priority: Priority; size?: number; className?: string }> = ({
  priority, size = 14, className = '',
}) => {
  const s = size;
  const props = { width: s, height: s, viewBox: '0 0 16 16', className };

  switch (priority) {
    case 'URGENT':
      // Red double up arrow
      return (
        <svg {...props} fill="none" aria-label="Urgent">
          <path d="M8 2L13 8H10V14H6V8H3L8 2Z" fill="#FF5630" />
        </svg>
      );
    case 'HIGH':
      // Orange up arrow
      return (
        <svg {...props} fill="none" aria-label="High">
          <path d="M8 3L12 9H9.5V13H6.5V9H4L8 3Z" fill="#FF7452" />
        </svg>
      );
    case 'MEDIUM':
      // Blue equal/dash (medium)
      return (
        <svg {...props} fill="none" aria-label="Medium">
          <rect x="2" y="5.5" width="12" height="2" rx="1" fill="#2684FF" />
          <rect x="2" y="8.5" width="12" height="2" rx="1" fill="#2684FF" />
        </svg>
      );
    case 'LOW':
      // Gray down arrow
      return (
        <svg {...props} fill="none" aria-label="Low">
          <path d="M8 13L4 7H6.5V3H9.5V7H12L8 13Z" fill="#8993A4" />
        </svg>
      );
    default:
      return null;
  }
};

// ── Type Icons (Story, Bug, Task, Sub-task) ────────────────────────────────

export const TaskTypeIcon: React.FC<{ type?: 'task' | 'bug' | 'story' | 'subtask'; size?: number; className?: string }> = ({
  type = 'task', size = 14, className = '',
}) => {
  const s = size;
  switch (type) {
    case 'bug':
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none" aria-label="Bug" className={className}>
          <circle cx="8" cy="8" r="7" fill="#FF5630" />
          <path d="M6 6.5C6 5.4 6.9 4.5 8 4.5C9.1 4.5 10 5.4 10 6.5V9.5C10 10.6 9.1 11.5 8 11.5C6.9 11.5 6 10.6 6 9.5V6.5Z" fill="white" />
          <circle cx="8" cy="8" r="1.5" fill="#FF5630" />
        </svg>
      );
    case 'story':
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none" aria-label="Story" className={className}>
          <rect width="16" height="16" rx="3" fill="#63BA3C" />
          <path d="M4 5H12M4 8H10M4 11H8" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 'subtask':
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none" aria-label="Subtask" className={className}>
          <rect x="1" y="1" width="14" height="14" rx="3" fill="#2684FF" opacity="0.2" stroke="#2684FF" strokeWidth="1.2" />
          <path d="M5 8L7.5 10.5L11 6" stroke="#2684FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default: // task
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none" aria-label="Task" className={className}>
          <rect width="16" height="16" rx="3" fill="#2684FF" />
          <path d="M4.5 8L7 10.5L11.5 5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
};

// ── Sprint Icon ────────────────────────────────────────────────────────────

export const SprintIcon: React.FC<{ size?: number; active?: boolean }> = ({ size = 14, active }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-label="Sprint">
    <path
      d="M8 2C4.69 2 2 4.69 2 8C2 11.31 4.69 14 8 14"
      stroke={active ? '#22A06B' : '#8993A4'}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M8 2C11.31 2 14 4.69 14 8"
      stroke={active ? '#22A06B' : '#8993A4'}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeDasharray="3 2"
    />
    <path
      d="M11 8L8 5L5 8"
      stroke={active ? '#22A06B' : '#8993A4'}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// ── Epic Icon ──────────────────────────────────────────────────────────────

export const EpicIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-label="Epic">
    <rect width="16" height="16" rx="3" fill="#8777D9" />
    <path d="M9 2L4 9H8L7 14L12 7H8L9 2Z" fill="white" />
  </svg>
);
