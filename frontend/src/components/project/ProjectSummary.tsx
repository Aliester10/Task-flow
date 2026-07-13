import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2, RefreshCw, Plus, Clock, ArrowUpRight,
  AlertCircle, TrendingUp, Users, Activity,
} from 'lucide-react';
import { Task, Project, TaskStatus, Priority } from '../../types';
import { formatDateTime, isOverdue } from '../../utils';
import { Avatar } from '../ui/Avatar';
import { StatusIcon, PriorityIcon, TaskTypeIcon } from '../ui/StatusIcon';
import { StatusBadge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';

interface ProjectSummaryProps {
  project: Project;
  tasks: Task[];
}

// ── Donut Chart (pure SVG, no lib) ─────────────────────────────────────────
const DonutChart: React.FC<{
  segments: { value: number; color: string; label: string }[];
  total: number;
}> = ({ segments, total }) => {
  const size = 140;
  const r = 52;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const arcs = segments
    .filter(s => s.value > 0)
    .map(s => {
      const pct = s.value / (total || 1);
      const dash = pct * circumference;
      const gap = circumference - dash;
      const arc = { ...s, dash, gap, offset, pct };
      offset += dash;
      return arc;
    });

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F0F0F0" strokeWidth="18" />
        {arcs.map((arc, i) => (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={arc.color}
            strokeWidth="18"
            strokeDasharray={`${arc.dash} ${arc.gap}`}
            strokeDashoffset={-arc.offset}
            strokeLinecap="butt"
            className="transition-all duration-700"
          />
        ))}
      </svg>
      {/* Center label */}
      <div className="absolute text-center">
        <p className="text-2xl font-bold text-gray-900 leading-none">{total}</p>
        <p className="text-[10px] text-gray-400 mt-0.5">Total</p>
      </div>
    </div>
  );
};

// ── Horizontal bar ─────────────────────────────────────────────────────────
const HBar: React.FC<{ value: number; total: number; color: string }> = ({ value, total, color }) => {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-2 rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs text-gray-500 tabular-nums w-8 text-right">{Math.round(pct)}%</span>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────
export const ProjectSummary: React.FC<ProjectSummaryProps> = ({ project, tasks }) => {
  // ── Computed stats ────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const completed7d = tasks.filter(t =>
      t.status === 'DONE' && new Date(t.updatedAt) >= sevenDaysAgo
    ).length;
    const updated7d = tasks.filter(t =>
      new Date(t.updatedAt) >= sevenDaysAgo && t.status !== 'DONE'
    ).length;
    const created7d = tasks.filter(t =>
      new Date(t.createdAt) >= sevenDaysAgo
    ).length;
    const dueSoon = tasks.filter(t =>
      t.dueDate && new Date(t.dueDate) <= sevenDaysLater &&
      new Date(t.dueDate) >= now && t.status !== 'DONE'
    ).length;

    return { completed7d, updated7d, created7d, dueSoon };
  }, [tasks]);

  // ── Status distribution ───────────────────────────────────────────────
  const statusDist = useMemo(() => {
    const map: Record<TaskStatus, number> = {
      BACKLOG: 0, TODO: 0, IN_PROGRESS: 0, REVIEW: 0, DONE: 0, BLOCKED: 0,
    };
    tasks.forEach(t => map[t.status]++);
    return map;
  }, [tasks]);

  const statusSegments = [
    { label: 'Backlog',     value: statusDist.BACKLOG,     color: '#C1C7D0' },
    { label: 'To Do',       value: statusDist.TODO,        color: '#8993A4' },
    { label: 'In Progress', value: statusDist.IN_PROGRESS, color: '#E2A400' },
    { label: 'Review',      value: statusDist.REVIEW,      color: '#6554C0' },
    { label: 'Done',        value: statusDist.DONE,        color: '#22A06B' },
    { label: 'Blocked',     value: statusDist.BLOCKED,     color: '#FF5630' },
  ].filter(s => s.value > 0);

  // ── Priority distribution ─────────────────────────────────────────────
  const priorityDist = useMemo(() => {
    const map: Record<Priority, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 };
    tasks.filter(t => t.status !== 'DONE').forEach(t => map[t.priority]++);
    return map;
  }, [tasks]);

  const priorityConfig = [
    { key: 'URGENT' as Priority, label: 'Urgent', color: '#FF5630', bg: 'bg-red-500'    },
    { key: 'HIGH'   as Priority, label: 'High',   color: '#FF7452', bg: 'bg-orange-500' },
    { key: 'MEDIUM' as Priority, label: 'Medium', color: '#2684FF', bg: 'bg-blue-500'   },
    { key: 'LOW'    as Priority, label: 'Low',    color: '#8993A4', bg: 'bg-gray-400'   },
  ];
  const maxPriority = Math.max(...Object.values(priorityDist), 1);
  const totalActive = tasks.filter(t => t.status !== 'DONE').length;

  // ── Team workload ─────────────────────────────────────────────────────
  const workload = useMemo(() => {
    const map: Record<string, { user: { name: string; avatarUrl?: string | null }; count: number }> = {};
    let unassigned = 0;
    tasks.filter(t => t.status !== 'DONE').forEach(t => {
      if (t.assignee) {
        if (!map[t.assignee.id]) map[t.assignee.id] = { user: t.assignee, count: 0 };
        map[t.assignee.id].count++;
      } else {
        unassigned++;
      }
    });
    const result = Object.values(map).sort((a, b) => b.count - a.count);
    if (unassigned > 0) result.push({ user: { name: 'Unassigned' }, count: unassigned });
    return result;
  }, [tasks]);

  const maxWorkload = Math.max(...workload.map(w => w.count), 1);

  // ── Recent activity (last 10 tasks updated) ───────────────────────────
  const recentActivity = useMemo(() => {
    return [...tasks]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 8);
  }, [tasks]);

  // ── Overdue ───────────────────────────────────────────────────────────
  const overdueTasks = tasks.filter(t => isOverdue(t.dueDate, t.status));

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Top stat cards (Jira-style) ─────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          value={stats.completed7d}
          label="completed"
          sub="in the last 7 days"
          iconBg="bg-emerald-50"
        />
        <StatCard
          icon={<RefreshCw className="w-4 h-4 text-blue-600" />}
          value={stats.updated7d}
          label="updated"
          sub="in the last 7 days"
          iconBg="bg-blue-50"
        />
        <StatCard
          icon={<Plus className="w-4 h-4 text-violet-600" />}
          value={stats.created7d}
          label="created"
          sub="in the last 7 days"
          iconBg="bg-violet-50"
        />
        <StatCard
          icon={<Clock className="w-4 h-4 text-amber-600" />}
          value={stats.dueSoon}
          label="due soon"
          sub="in the next 7 days"
          iconBg="bg-amber-50"
          urgent={stats.dueSoon > 0}
        />
      </div>

      {/* ── Row 1: Status Overview + Recent Activity ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Status Overview — donut chart */}
        <SectionCard
          title="Status overview"
          subtitle="Get a snapshot of the status of your work items."
        >
          <div className="flex items-center gap-6 p-5">
            <DonutChart segments={statusSegments} total={tasks.length} />
            <div className="flex-1 space-y-2.5">
              {statusSegments.map((s) => (
                <div key={s.label} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-xs text-gray-600 truncate">{s.label}</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-800 tabular-nums flex-shrink-0">{s.value}</span>
                </div>
              ))}
              {tasks.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">Belum ada task</p>
              )}
            </div>
          </div>
        </SectionCard>

        {/* Recent Activity */}
        <SectionCard
          title="Recent activity"
          subtitle="Stay up to date with what's happening."
        >
          <div className="divide-y divide-gray-50">
            {recentActivity.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8 px-5">Belum ada aktivitas</p>
            ) : (
              recentActivity.map((task) => (
                <div key={task.id} className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                  {task.assignee ? (
                    <Avatar name={task.assignee.name} avatarUrl={task.assignee.avatarUrl} size="sm" className="flex-shrink-0 mt-0.5" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Users className="w-3 h-3 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 leading-snug">
                      <span className="font-medium">{task.assignee?.name || 'Unassigned'}</span>
                      {' '}updated{' '}
                      <span className="text-blue-600 hover:underline cursor-pointer font-medium">{task.title}</span>
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <StatusIcon status={task.status} size={12} />
                      <span className="text-[11px] text-gray-400">{formatDateTime(task.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>

      {/* ── Row 2: Priority Breakdown + Team Workload ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Priority Breakdown — bar chart */}
        <SectionCard
          title="Priority breakdown"
          subtitle="Get a holistic view of how work is being prioritized."
        >
          <div className="p-5">
            {/* Bar chart */}
            <div className="flex items-end gap-3 h-28 mb-4">
              {priorityConfig.map((p) => {
                const count = priorityDist[p.key];
                const heightPct = maxPriority > 0 ? (count / maxPriority) * 100 : 0;
                return (
                  <div key={p.key} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-bold text-gray-700 tabular-nums">
                      {count > 0 ? count : ''}
                    </span>
                    <div className="w-full flex items-end justify-center" style={{ height: '80px' }}>
                      <div
                        className="w-full rounded-t-sm transition-all duration-700"
                        style={{
                          height: count > 0 ? `${Math.max(heightPct, 8)}%` : '0%',
                          backgroundColor: p.color,
                          opacity: count > 0 ? 1 : 0,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Legend */}
            <div className="flex items-center justify-center gap-4 pt-2 border-t border-gray-100">
              {priorityConfig.map((p) => (
                <div key={p.key} className="flex items-center gap-1.5">
                  <PriorityIcon priority={p.key} size={12} />
                  <span className="text-[11px] text-gray-500">{p.label}</span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* Team Workload */}
        <SectionCard
          title="Team workload"
          subtitle="Monitor the capacity of your team."
        >
          <div className="p-5 space-y-3">
            {workload.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">Belum ada task terassign</p>
            ) : (
              workload.map((w, i) => (
                <div key={i} className="flex items-center gap-3">
                  {w.user.name === 'Unassigned' ? (
                    <div className="w-7 h-7 rounded-full bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center flex-shrink-0">
                      <Users className="w-3 h-3 text-gray-400" />
                    </div>
                  ) : (
                    <Avatar name={w.user.name} avatarUrl={w.user.avatarUrl} size="sm" className="flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700 truncate">{w.user.name}</span>
                      <span className="text-xs text-gray-500 tabular-nums flex-shrink-0 ml-2">
                        {w.count} task
                      </span>
                    </div>
                    <HBar value={w.count} total={maxWorkload} color="#2684FF" />
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>

      {/* ── Row 3: Overdue + Project Info ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Overdue Tasks */}
        {overdueTasks.length > 0 && (
          <SectionCard
            title={`⚠️ Overdue (${overdueTasks.length})`}
            titleClass="text-red-600"
            subtitle="These tasks have passed their due date."
          >
            <div className="divide-y divide-gray-50">
              {overdueTasks.slice(0, 6).map((task) => (
                <div key={task.id} className="flex items-center gap-3 px-5 py-3 hover:bg-red-50/40 transition-colors">
                  <TaskTypeIcon type="task" size={14} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StatusIcon status={task.status} size={11} />
                      <span className="text-[11px] text-red-500 flex items-center gap-0.5">
                        <AlertCircle className="w-2.5 h-2.5" />
                        Due {new Date(task.dueDate!).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>
                  {task.assignee && (
                    <Avatar name={task.assignee.name} avatarUrl={task.assignee.avatarUrl} size="xs" showTooltip />
                  )}
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Project Progress Summary */}
        <SectionCard
          title="Project progress"
          subtitle="Overall completion status of this project."
        >
          <div className="p-5 space-y-4">
            {/* Big progress */}
            <div className="text-center py-3">
              <div className="relative inline-flex items-center justify-center w-28 h-28">
                <svg width="112" height="112" className="-rotate-90">
                  <circle cx="56" cy="56" r="44" fill="none" stroke="#F0F0F0" strokeWidth="12" />
                  <circle
                    cx="56" cy="56" r="44"
                    fill="none"
                    stroke={project.progress === 100 ? '#22A06B' : '#2684FF'}
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${(2 * Math.PI * 44 * (project.progress ?? 0)) / 100} ${2 * Math.PI * 44}`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute text-center">
                  <p className="text-2xl font-bold text-gray-900">{project.progress ?? 0}%</p>
                </div>
              </div>
            </div>

            {/* Status breakdown mini */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { status: 'DONE' as TaskStatus,        label: 'Done',     value: statusDist.DONE        },
                { status: 'IN_PROGRESS' as TaskStatus, label: 'Active',   value: statusDist.IN_PROGRESS },
                { status: 'BLOCKED' as TaskStatus,     label: 'Blocked',  value: statusDist.BLOCKED     },
              ].map(({ status, label, value }) => (
                <div key={status} className="text-center p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                  <StatusIcon status={status} size={16} className="mx-auto mb-1" />
                  <p className="text-lg font-bold text-gray-900 tabular-nums">{value}</p>
                  <p className="text-[10px] text-gray-500">{label}</p>
                </div>
              ))}
            </div>

            {/* Members */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className="text-xs text-gray-500">{project.members.length} member</span>
              <div className="flex -space-x-1.5">
                {project.members.slice(0, 5).map((m) => (
                  <Avatar key={m.id} name={m.user.name} avatarUrl={m.user.avatarUrl} size="xs"
                    className="ring-2 ring-white" showTooltip />
                ))}
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

// ── Subcomponents ──────────────────────────────────────────────────────────

const StatCard: React.FC<{
  icon: React.ReactNode; iconBg: string;
  value: number; label: string; sub: string; urgent?: boolean;
}> = ({ icon, iconBg, value, label, sub, urgent }) => (
  <div className={`card p-4 flex items-start gap-3 ${urgent && value > 0 ? 'ring-1 ring-amber-200' : ''}`}>
    <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
      {icon}
    </div>
    <div>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-2xl font-bold tabular-nums ${urgent && value > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
          {value}
        </span>
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
    </div>
  </div>
);

const SectionCard: React.FC<{
  title: string; subtitle?: string; titleClass?: string;
  action?: { label: string; to: string }; children: React.ReactNode;
}> = ({ title, subtitle, titleClass, action, children }) => (
  <div className="card overflow-hidden">
    <div className="px-5 py-4 border-b border-gray-100">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className={`text-sm font-semibold text-gray-900 ${titleClass || ''}`}>{title}</h3>
          {subtitle && <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {action && (
          <Link to={action.to} className="text-xs text-blue-600 hover:underline flex items-center gap-0.5 flex-shrink-0">
            {action.label} <ArrowUpRight className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
    {children}
  </div>
);
