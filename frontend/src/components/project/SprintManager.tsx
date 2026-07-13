import React, { useEffect, useState } from 'react';
import {
  Plus, Play, CheckCircle, Trash2, Edit2,
  ChevronDown, ChevronRight, MoreHorizontal,
  Calendar, Target, Zap,
} from 'lucide-react';
import { Sprint, Task, Project } from '../../types';
import { sprintService } from '../../services/sprint.service';
import { taskService } from '../../services/task.service';
import { formatDate } from '../../utils';
import { StatusIcon, SprintIcon } from '../ui/StatusIcon';
import { StatusBadge, PriorityBadge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { ProgressBar } from '../ui/ProgressBar';
import { Spinner, SkeletonList } from '../ui/Spinner';

interface SprintManagerProps {
  project: Project;
  backlogTasks: Task[];
  onTaskClick: (task: Task) => void;
  onRefresh: () => void;
}

export const SprintManager: React.FC<SprintManagerProps> = ({
  project, backlogTasks, onTaskClick, onRefresh,
}) => {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [deletingSprint, setDeletingSprint] = useState<Sprint | null>(null);
  const [collapsedSprints, setCollapsedSprints] = useState<Set<string>>(new Set());
  const [savingSprint, setSavingSprint] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadSprints = async () => {
    try {
      const data = await sprintService.getAll(project.id);
      setSprints(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSprints(); }, [project.id]);

  const toggleCollapse = (id: string) => {
    setCollapsedSprints(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleStatusChange = async (sprint: Sprint, status: Sprint['status']) => {
    await sprintService.update(project.id, sprint.id, { status });
    await loadSprints();
    onRefresh();
  };

  const handleDelete = async () => {
    if (!deletingSprint) return;
    setDeletingId(deletingSprint.id);
    try {
      await sprintService.delete(project.id, deletingSprint.id);
      setDeletingSprint(null);
      await loadSprints();
      onRefresh();
    } finally {
      setDeletingId(null);
    }
  };

  const handleMoveToSprint = async (taskId: string, sprintId: string) => {
    await sprintService.addTask(project.id, sprintId, taskId);
    await loadSprints();
    onRefresh();
  };

  const handleMoveToBacklog = async (taskId: string) => {
    await taskService.update(project.id, taskId, { sprintId: null, status: 'BACKLOG' });
    await loadSprints();
    onRefresh();
  };

  const activeSprint = sprints.find(s => s.status === 'ACTIVE');

  if (loading) {
    return <SkeletonList />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Sprint Planning</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {sprints.length} sprint · {backlogTasks.length} task di backlog
          </p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-sm btn-primary gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Buat Sprint
        </button>
      </div>

      {/* Active Sprint Banner */}
      {activeSprint && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <SprintIcon size={16} active />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-800">{activeSprint.name} — Sedang Berjalan</p>
            {activeSprint.endDate && (
              <p className="text-xs text-emerald-600 mt-0.5">
                Berakhir {formatDate(activeSprint.endDate)}
              </p>
            )}
          </div>
          <ProgressBar value={activeSprint.burndown ?? 0} showLabel size="sm" color="bg-emerald-500" />
        </div>
      )}

      {/* Sprint list */}
      {sprints.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Zap className="w-5 h-5 text-gray-400" />
          </div>
          <h3 className="font-medium text-gray-600 mb-1">Belum ada sprint</h3>
          <p className="text-xs text-gray-400 mb-4">Buat sprint untuk mulai merencanakan iterasi pengerjaan</p>
          <button onClick={() => setShowCreateModal(true)} className="btn-sm btn-primary gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Buat Sprint Pertama
          </button>
        </div>
      ) : (
        sprints.map((sprint) => {
          const isCollapsed = collapsedSprints.has(sprint.id);
          const sprintTasks = sprint.tasks || [];
          const done = sprintTasks.filter(t => t.status === 'DONE').length;
          const total = sprintTasks.length;

          return (
            <div key={sprint.id} className="card overflow-hidden">
              {/* Sprint Header */}
              <div className={`px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors
                ${sprint.status === 'ACTIVE' ? 'bg-emerald-50/30' : ''}`}
                onClick={() => toggleCollapse(sprint.id)}
              >
                <button className="text-gray-400 flex-shrink-0">
                  {isCollapsed
                    ? <ChevronRight className="w-4 h-4" />
                    : <ChevronDown className="w-4 h-4" />}
                </button>

                <SprintIcon size={14} active={sprint.status === 'ACTIVE'} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-800">{sprint.name}</span>
                    <SprintStatusBadge status={sprint.status} />
                    <span className="text-xs text-gray-400">{total} issue</span>
                    {(sprint.startDate || sprint.endDate) && (
                      <span className="text-[11px] text-gray-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {sprint.startDate && formatDate(sprint.startDate)}
                        {sprint.startDate && sprint.endDate && ' → '}
                        {sprint.endDate && formatDate(sprint.endDate)}
                      </span>
                    )}
                  </div>
                  {!isCollapsed && total > 0 && (
                    <div className="w-32 mt-1.5">
                      <ProgressBar value={total > 0 ? Math.round((done / total) * 100) : 0} showLabel={false} size="xs" />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  {sprint.status === 'PLANNED' && (
                    <button
                      onClick={() => handleStatusChange(sprint, 'ACTIVE')}
                      className="btn-sm btn-success gap-1"
                      title="Mulai sprint"
                    >
                      <Play className="w-3 h-3" /> Start
                    </button>
                  )}
                  {sprint.status === 'ACTIVE' && (
                    <button
                      onClick={() => handleStatusChange(sprint, 'COMPLETED')}
                      className="btn-sm bg-emerald-100 text-emerald-700 hover:bg-emerald-200 gap-1 btn"
                    >
                      <CheckCircle className="w-3 h-3" /> Complete
                    </button>
                  )}
                  <button
                    onClick={() => setEditingSprint(sprint)}
                    className="btn-sm btn-ghost p-1.5"
                    title="Edit sprint"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingSprint(sprint)}
                    className="btn-sm btn-ghost p-1.5 hover:text-red-500"
                    title="Hapus sprint"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Sprint Tasks */}
              {!isCollapsed && (
                <div>
                  {sprintTasks.length === 0 ? (
                    <div className="px-6 py-6 text-center border-t border-gray-100">
                      <p className="text-xs text-gray-400 mb-3">Belum ada task di sprint ini</p>
                      <p className="text-xs text-gray-400">
                        Drag task dari backlog ke sprint ini
                      </p>
                    </div>
                  ) : (
                    <div className="border-t border-gray-100">
                      {sprintTasks.map((task) => (
                        <SprintTaskRow
                          key={task.id}
                          task={task}
                          onClick={() => onTaskClick(task)}
                          onMoveToBacklog={() => handleMoveToBacklog(task.id)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Stats footer */}
                  {total > 0 && (
                    <div className="px-4 py-2.5 bg-gray-50/60 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        {done} selesai
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        {sprintTasks.filter(t => t.status === 'IN_PROGRESS').length} aktif
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-gray-300" />
                        {total - done - sprintTasks.filter(t => t.status === 'IN_PROGRESS').length} tersisa
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Backlog Section */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">Backlog</span>
            <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 text-[10px] font-bold flex items-center justify-center">
              {backlogTasks.length}
            </span>
          </div>
        </div>

        {backlogTasks.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-gray-400">Backlog kosong 🎉</p>
          </div>
        ) : (
          <div>
            {backlogTasks.map((task) => (
              <BacklogTaskRow
                key={task.id}
                task={task}
                sprints={sprints.filter(s => s.status !== 'COMPLETED')}
                onClick={() => onTaskClick(task)}
                onMoveToSprint={handleMoveToSprint}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Sprint Modal */}
      <Modal
        isOpen={showCreateModal || !!editingSprint}
        onClose={() => { setShowCreateModal(false); setEditingSprint(null); }}
        title={editingSprint ? 'Edit Sprint' : 'Buat Sprint Baru'}
        size="sm"
      >
        <SprintForm
          sprint={editingSprint}
          projectId={project.id}
          onSubmit={async (data) => {
            setSavingSprint(true);
            try {
              if (editingSprint) {
                await sprintService.update(project.id, editingSprint.id, data);
              } else {
                await sprintService.create(project.id, data);
              }
              setShowCreateModal(false);
              setEditingSprint(null);
              await loadSprints();
            } finally {
              setSavingSprint(false);
            }
          }}
          onCancel={() => { setShowCreateModal(false); setEditingSprint(null); }}
          isLoading={savingSprint}
        />
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deletingSprint}
        onClose={() => setDeletingSprint(null)}
        onConfirm={handleDelete}
        title="Hapus Sprint"
        message={`Sprint "${deletingSprint?.name}" akan dihapus. Semua task akan dipindahkan ke backlog.`}
        confirmLabel="Hapus Sprint"
        isLoading={!!deletingId}
      />
    </div>
  );
};

// ── Sub components ─────────────────────────────────────────────────────────

const SprintStatusBadge: React.FC<{ status: Sprint['status'] }> = ({ status }) => {
  const cfg = {
    PLANNED:   { label: 'Planned',   className: 'bg-blue-50 text-blue-700'     },
    ACTIVE:    { label: 'Active',    className: 'bg-emerald-50 text-emerald-700' },
    COMPLETED: { label: 'Completed', className: 'bg-gray-100 text-gray-500'    },
  }[status];
  return <span className={`badge ${cfg.className}`}>{cfg.label}</span>;
};

const SprintTaskRow: React.FC<{
  task: Task;
  onClick: () => void;
  onMoveToBacklog: () => void;
}> = ({ task, onClick, onMoveToBacklog }) => (
  <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0 group transition-colors">
    <StatusIcon status={task.status} size={14} className="flex-shrink-0" />
    <button
      onClick={onClick}
      className="flex-1 text-left text-sm text-gray-700 hover:text-indigo-600 truncate transition-colors"
    >
      {task.title}
    </button>
    <div className="flex items-center gap-2 flex-shrink-0">
      <PriorityBadge priority={task.priority} iconOnly />
      {task.assignee && (
        <Avatar name={task.assignee.name} avatarUrl={task.assignee.avatarUrl} size="xs" showTooltip />
      )}
      <button
        onClick={onMoveToBacklog}
        className="opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-gray-700 transition-all px-2 py-0.5 rounded hover:bg-gray-200"
        title="Pindah ke backlog"
      >
        → Backlog
      </button>
    </div>
  </div>
);

const BacklogTaskRow: React.FC<{
  task: Task;
  sprints: Sprint[];
  onClick: () => void;
  onMoveToSprint: (taskId: string, sprintId: string) => void;
}> = ({ task, sprints, onClick, onMoveToSprint }) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0 group transition-colors relative">
      <StatusIcon status={task.status} size={14} className="flex-shrink-0" />
      <button
        onClick={onClick}
        className="flex-1 text-left text-sm text-gray-700 hover:text-indigo-600 truncate transition-colors"
      >
        {task.title}
      </button>
      <div className="flex items-center gap-2 flex-shrink-0">
        <PriorityBadge priority={task.priority} iconOnly />
        {task.assignee && (
          <Avatar name={task.assignee.name} avatarUrl={task.assignee.avatarUrl} size="xs" showTooltip />
        )}

        {sprints.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="opacity-0 group-hover:opacity-100 text-xs btn btn-ghost px-2 py-0.5 gap-1 transition-all"
            >
              <SprintIcon size={12} active />
              Sprint <ChevronDown className="w-2.5 h-2.5" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1">
                {sprints.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { onMoveToSprint(task.id, s.id); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <SprintIcon size={12} active={s.status === 'ACTIVE'} />
                    <span className="truncate">{s.name}</span>
                    {s.status === 'ACTIVE' && (
                      <span className="ml-auto text-[10px] text-emerald-600 font-medium">Active</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const SprintForm: React.FC<{
  sprint?: Sprint | null;
  projectId: string;
  onSubmit: (data: { name: string; goal?: string; startDate?: string | null; endDate?: string | null }) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}> = ({ sprint, onSubmit, onCancel, isLoading }) => {
  const [name, setName] = useState(sprint?.name || '');
  const [goal, setGoal] = useState(sprint?.goal || '');
  const [startDate, setStartDate] = useState(sprint?.startDate?.split('T')[0] || '');
  const [endDate, setEndDate] = useState(sprint?.endDate?.split('T')[0] || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onSubmit({
      name: name.trim(),
      goal: goal || undefined,
      startDate: startDate ? new Date(startDate).toISOString() : null,
      endDate: endDate ? new Date(endDate).toISOString() : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div>
        <label className="label" htmlFor="sprint-name">Nama Sprint *</label>
        <input
          id="sprint-name"
          value={name}
          onChange={e => setName(e.target.value)}
          className="input"
          placeholder="Sprint 1"
          autoFocus
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="sprint-goal">Sprint Goal</label>
        <textarea
          id="sprint-goal"
          value={goal}
          onChange={e => setGoal(e.target.value)}
          className="input resize-none"
          rows={2}
          placeholder="Apa yang ingin dicapai di sprint ini?"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="sprint-start">Mulai</label>
          <input id="sprint-start" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="sprint-end">Selesai</label>
          <input id="sprint-end" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input" />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-md btn-secondary flex-1" disabled={isLoading}>Batal</button>
        <button type="submit" className="btn-md btn-primary flex-1" disabled={isLoading || !name.trim()}>
          {isLoading ? <Spinner size="sm" /> : sprint ? 'Simpan' : 'Buat Sprint'}
        </button>
      </div>
    </form>
  );
};
