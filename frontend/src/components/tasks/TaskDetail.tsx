import React, { useState, useEffect } from 'react';
import {
  Send, Trash2, Edit2, Clock, User, Tag,
  Calendar, Loader2, MessageSquare, Activity,
  ChevronDown, X,
} from 'lucide-react';
import { Task, Comment } from '../../types';
import { useAuthStore } from '../../store/auth.store';
import { useTaskStore } from '../../store/task.store';
import { taskService } from '../../services/task.service';
import { formatDate, formatDateTime } from '../../utils';
import { Avatar } from '../ui/Avatar';
import { StatusBadge, PriorityBadge } from '../ui/Badge';
import { StatusIcon, PriorityIcon, TaskTypeIcon } from '../ui/StatusIcon';

interface TaskDetailProps {
  task: Task;
  projectId: string;
  onEdit: () => void;
  onClose: () => void;
}

export const TaskDetail: React.FC<TaskDetailProps> = ({ task, projectId, onEdit, onClose }) => {
  const { user } = useAuthStore();
  const { fetchTask, currentTask } = useTaskStore();
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingComment, setDeletingComment] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'comments' | 'activity'>('comments');

  useEffect(() => {
    fetchTask(projectId, task.id);
  }, [task.id, projectId, fetchTask]);

  const detail = currentTask?.id === task.id ? currentTask : task;
  const comments = detail.comments || [];
  const logs = detail.activityLogs || [];

  const submitComment = async () => {
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      await taskService.addComment(projectId, task.id, comment.trim());
      setComment('');
      await fetchTask(projectId, task.id);
    } finally {
      setSubmitting(false);
    }
  };

  const removeComment = async (commentId: string) => {
    setDeletingComment(commentId);
    try {
      await taskService.deleteComment(projectId, task.id, commentId);
      await fetchTask(projectId, task.id);
    } finally {
      setDeletingComment(null);
    }
  };

  const actionLabel: Record<string, string> = {
    created: 'membuat task ini',
    status_changed: 'mengubah status',
    commented: 'menambahkan komentar',
  };

  return (
    <div className="flex h-full max-h-[88vh]">
      {/* ── Main content ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-start gap-3 mb-3">
            <TaskTypeIcon type="task" size={16} className="mt-0.5 flex-shrink-0" />
            <h2 className="text-lg font-semibold text-gray-900 leading-snug flex-1">{detail.title}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={detail.status} />
            <PriorityBadge priority={detail.priority} />
            {detail.labels.map((l) => (
              <span key={l} className="badge bg-indigo-50 text-indigo-700">{l}</span>
            ))}
            <button
              onClick={onEdit}
              className="ml-auto btn-sm btn-secondary gap-1.5 flex-shrink-0"
            >
              <Edit2 className="w-3 h-3" /> Edit
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Description */}
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Deskripsi</h3>
            {detail.description ? (
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{detail.description}</p>
            ) : (
              <p className="text-sm text-gray-400 italic">Tidak ada deskripsi</p>
            )}
          </div>

          {/* Comments & Activity Tabs */}
          <div className="px-6 pt-4">
            <div className="flex gap-1 mb-4 border-b border-gray-100">
              <button
                onClick={() => setActiveSection('comments')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-px
                  ${activeSection === 'comments' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Komentar {comments.length > 0 && `(${comments.length})`}
              </button>
              <button
                onClick={() => setActiveSection('activity')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-px
                  ${activeSection === 'activity' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                <Activity className="w-3.5 h-3.5" />
                Aktivitas {logs.length > 0 && `(${logs.length})`}
              </button>
            </div>

            {/* Comments */}
            {activeSection === 'comments' && (
              <div className="space-y-4 pb-4">
                {/* Input */}
                <div className="flex gap-3">
                  {user && <Avatar name={user.name} avatarUrl={user.avatarUrl} size="sm" className="flex-shrink-0 mt-0.5" />}
                  <div className="flex-1">
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submitComment();
                      }}
                      className="input resize-none text-sm"
                      placeholder="Tambahkan komentar... (Ctrl+Enter untuk kirim)"
                      rows={2}
                    />
                    {comment.trim() && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={submitComment}
                          disabled={submitting}
                          className="btn-sm btn-primary gap-1.5"
                        >
                          {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                          Kirim
                        </button>
                        <button onClick={() => setComment('')} className="btn-sm btn-ghost">
                          Batal
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Comment list */}
                {comments.length === 0 ? (
                  <div className="text-center py-6">
                    <MessageSquare className="w-7 h-7 text-gray-200 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">Belum ada komentar</p>
                  </div>
                ) : (
                  comments.map((c: Comment) => (
                    <div key={c.id} className="flex gap-3 group">
                      <Avatar name={c.user.name} avatarUrl={c.user.avatarUrl} size="sm" className="flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-gray-800">{c.user.name}</span>
                          <span className="text-[11px] text-gray-400">{formatDateTime(c.createdAt)}</span>
                        </div>
                        <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700 leading-relaxed">
                          {c.content}
                        </div>
                      </div>
                      {c.userId === user?.id && (
                        <button
                          onClick={() => removeComment(c.id)}
                          disabled={deletingComment === c.id}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-all self-start mt-1 flex-shrink-0"
                          aria-label="Hapus komentar"
                        >
                          {deletingComment === c.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />
                          }
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Activity Log */}
            {activeSection === 'activity' && (
              <div className="space-y-1 pb-4">
                {logs.length === 0 ? (
                  <div className="text-center py-6">
                    <Activity className="w-7 h-7 text-gray-200 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">Belum ada aktivitas</p>
                  </div>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
                      <Avatar name={log.user.name} avatarUrl={log.user.avatarUrl} size="xs" className="flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 leading-relaxed">
                          <span className="font-semibold">{log.user.name}</span>{' '}
                          {actionLabel[log.action] || log.action}
                          {log.action === 'status_changed' && (
                            <span className="inline-flex items-center gap-1 ml-1">
                              <StatusIcon status={log.oldValue as Task['status']} size={11} />
                              <span className="text-gray-400">→</span>
                              <StatusIcon status={log.newValue as Task['status']} size={11} />
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{formatDateTime(log.createdAt)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Sidebar metadata ──────────────────────────────────────── */}
      <div className="w-56 flex-shrink-0 border-l border-gray-100 bg-gray-50/50 overflow-y-auto">
        <div className="p-4 space-y-5">
          <MetaRow icon={<User className="w-3.5 h-3.5" />} label="Assignee">
            {detail.assignee ? (
              <div className="flex items-center gap-2 mt-1">
                <Avatar name={detail.assignee.name} avatarUrl={detail.assignee.avatarUrl} size="xs" />
                <span className="text-xs text-gray-700 truncate">{detail.assignee.name}</span>
              </div>
            ) : (
              <p className="text-xs text-gray-400 mt-1">Tidak ada</p>
            )}
          </MetaRow>

          <MetaRow icon={<StatusIcon status={detail.status} size={13} />} label="Status">
            <div className="mt-1">
              <StatusBadge status={detail.status} />
            </div>
          </MetaRow>

          <MetaRow icon={<PriorityIcon priority={detail.priority} size={13} />} label="Prioritas">
            <div className="mt-1">
              <PriorityBadge priority={detail.priority} />
            </div>
          </MetaRow>

          <MetaRow icon={<Calendar className="w-3.5 h-3.5" />} label="Due Date">
            <p className={`text-xs mt-1 font-medium ${
              detail.dueDate && new Date(detail.dueDate) < new Date() && detail.status !== 'DONE'
                ? 'text-red-500' : 'text-gray-700'
            }`}>
              {detail.dueDate ? formatDate(detail.dueDate) : '—'}
            </p>
          </MetaRow>

          <MetaRow icon={<Tag className="w-3.5 h-3.5" />} label="Sprint">
            <p className="text-xs text-gray-700 mt-1">{detail.sprint?.name || 'Backlog'}</p>
          </MetaRow>

          {detail.labels.length > 0 && (
            <MetaRow icon={<Tag className="w-3.5 h-3.5" />} label="Labels">
              <div className="flex flex-wrap gap-1 mt-1">
                {detail.labels.map((l) => (
                  <span key={l} className="badge-sm bg-indigo-50 text-indigo-700">{l}</span>
                ))}
              </div>
            </MetaRow>
          )}

          <MetaRow icon={<Clock className="w-3.5 h-3.5" />} label="Dibuat">
            <p className="text-xs text-gray-500 mt-1">{formatDateTime(detail.createdAt)}</p>
          </MetaRow>

          <MetaRow icon={<Clock className="w-3.5 h-3.5" />} label="Diupdate">
            <p className="text-xs text-gray-500 mt-1">{formatDateTime(detail.updatedAt)}</p>
          </MetaRow>
        </div>
      </div>
    </div>
  );
};

const MetaRow: React.FC<{ icon: React.ReactNode; label: string; children: React.ReactNode }> = ({
  icon, label, children,
}) => (
  <div>
    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
      {icon}
      {label}
    </div>
    {children}
  </div>
);
