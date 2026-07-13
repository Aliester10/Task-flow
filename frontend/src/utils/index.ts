import { TaskStatus, Priority } from '../types';

export const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const formatDateTime = (dateStr?: string | null): string => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export const isOverdue = (dueDate?: string | null, status?: TaskStatus): boolean => {
  if (!dueDate || status === 'DONE') return false;
  return new Date(dueDate) < new Date();
};

export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string }> = {
  LOW: { label: 'Low', color: 'text-gray-600', bg: 'bg-gray-100' },
  MEDIUM: { label: 'Medium', color: 'text-blue-600', bg: 'bg-blue-100' },
  HIGH: { label: 'High', color: 'text-orange-600', bg: 'bg-orange-100' },
  URGENT: { label: 'Urgent', color: 'text-red-600', bg: 'bg-red-100' },
};

export const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string; border: string; dot: string }> = {
  BACKLOG:     { label: 'Backlog',     color: 'text-gray-600',    bg: 'bg-gray-100',    border: 'border-gray-300',    dot: 'bg-gray-400'    },
  TODO:        { label: 'To Do',       color: 'text-blue-700',    bg: 'bg-blue-50',     border: 'border-blue-300',    dot: 'bg-blue-500'    },
  IN_PROGRESS: { label: 'In Progress', color: 'text-amber-700',   bg: 'bg-amber-50',    border: 'border-amber-300',   dot: 'bg-amber-500'   },
  REVIEW:      { label: 'Review',      color: 'text-purple-700',  bg: 'bg-purple-50',   border: 'border-purple-300',  dot: 'bg-purple-500'  },
  DONE:        { label: 'Done',        color: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-300', dot: 'bg-emerald-500' },
  BLOCKED:     { label: 'Blocked',     color: 'text-red-700',     bg: 'bg-red-50',      border: 'border-red-300',     dot: 'bg-red-500'     },
};

export const KANBAN_COLUMNS: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'BLOCKED'];

export const PRIORITY_ORDER: Priority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];

export const getAvatarUrl = (user: { avatarUrl?: string | null; name: string }): string | null => {
  return user.avatarUrl || null;
};

export const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};
