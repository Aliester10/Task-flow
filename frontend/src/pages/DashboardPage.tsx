import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle, ListTodo, ArrowRight,
  Folder, RefreshCw, CheckCircle2
} from 'lucide-react';
import { DashboardData } from '../types';
import { dashboardService } from '../services/dashboard.service';
import { useAuthStore } from '../store/auth.store';
import { formatDate } from '../utils';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Avatar } from '../components/ui/Avatar';
import { SkeletonCard } from '../components/ui/Spinner';

const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardService.get().then(setData).finally(() => setLoading(false));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Selamat pagi' : hour < 17 ? 'Selamat siang' : 'Selamat malam';

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="mb-2">
        <p className="text-sm text-gray-500 mb-1 font-medium">{greeting} 👋</p>
        <h1 className="text-3xl font-bold text-gray-900">
          {user?.name?.split(' ')[0] || 'User'}
        </h1>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {Array(5).fill(0).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : data && (
        <>
          {/* Top Row - Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard label="TOTAL TASKS" value={data.stats.totalTasks} icon={<ListTodo className="w-5 h-5 text-gray-900" />} color="blue" />
            <StatCard label="IN PROGRESS" value={data.stats.inProgressTasks} icon={<RefreshCw className="w-5 h-5" />} color="yellow" />
            <StatCard label="COMPLETED" value={data.stats.doneTasks} icon={<CheckCircle2 className="w-5 h-5" />} color="lime" />
            <StatCard label="OVERDUE" value={data.stats.overdueTasks} icon={<AlertCircle className="w-5 h-5" />} color="red" />
            <StatCard label="ACTIVE PROJECTS" value={data.stats.activeProjects} icon={<Folder className="w-5 h-5" />} color="purple" />
          </div>

          {/* Middle Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Kanban Board Preview */}
            <div className="lg:col-span-2">
              <SectionCard title="KANBAN BOARD" headerColor="bg-neo-blue text-gray-900" action={{ label: '', to: '/projects' }}>
                <div className="flex-1 p-4 bg-white grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 overflow-x-auto">
                  <KanbanColumn title="TO DO" count={data.kanbanTasks.TODO.length} tasks={data.kanbanTasks.TODO} headerColor="bg-[#A3C8FF]" />
                  <KanbanColumn title="IN PROGRESS" count={data.kanbanTasks.IN_PROGRESS.length} tasks={data.kanbanTasks.IN_PROGRESS} headerColor="bg-neo-yellow" />
                  <KanbanColumn title="REVIEW" count={data.kanbanTasks.REVIEW.length} tasks={data.kanbanTasks.REVIEW} headerColor="bg-[#C5A3FF]" />
                  <KanbanColumn title="DONE" count={data.kanbanTasks.DONE.length} tasks={data.kanbanTasks.DONE} headerColor="bg-neo-lime" />
                  <KanbanColumn title="BLOCKED" count={data.kanbanTasks.BLOCKED.length} tasks={data.kanbanTasks.BLOCKED} headerColor="bg-neo-red text-white" />
                </div>
              </SectionCard>
            </div>

            {/* Right Column: Sprint Progress & Deadlines */}
            <div className="space-y-6 flex flex-col">
              <SectionCard title="SPRINT PROGRESS" headerColor="bg-[#C5A3FF] text-gray-900">
                <div className="p-5 bg-white flex-1">
                  {data.activeSprint ? (
                    <>
                      <h3 className="font-bold text-gray-900 mb-2">{data.activeSprint.name}</h3>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-3xl font-black text-gray-900">
                          {data.activeSprint.totalTasks! > 0
                            ? Math.round((data.activeSprint.doneTasks! / data.activeSprint.totalTasks!) * 100)
                            : 0}%
                        </span>
                      </div>
                      <ProgressBar value={data.activeSprint.totalTasks! > 0 ? (data.activeSprint.doneTasks! / data.activeSprint.totalTasks!) * 100 : 0} showLabel={false} size="md" color="bg-[#C5A3FF]" />
                      <p className="text-xs text-gray-600 font-medium mt-3">
                        {data.activeSprint.doneTasks} / {data.activeSprint.totalTasks} tasks completed
                      </p>
                    </>
                  ) : (
                    <EmptyState message="No Active Sprint" />
                  )}
                </div>
              </SectionCard>

              <SectionCard title="UPCOMING DEADLINES" headerColor="bg-neo-yellow text-gray-900">
                <div className="bg-white divide-y-2 divide-gray-900 flex-1">
                  {data.upcomingTasks.length === 0 ? (
                    <EmptyState message="Tidak ada deadline terdekat" />
                  ) : (
                    data.upcomingTasks.map((task, idx) => {
                      const bgColors = ['bg-neo-red', 'bg-[#C5A3FF]', 'bg-neo-lime', 'bg-neo-blue'];
                      const iconBg = bgColors[idx % bgColors.length];
                      return (
                        <Link key={task.id} to={`/projects/${task.projectId}`} className="flex items-center gap-3 p-4 hover:bg-gray-50 group transition-colors">
                          <div className={`w-12 h-12 rounded ${iconBg} border-2 border-gray-900 flex flex-col items-center justify-center flex-shrink-0`} style={{ boxShadow: '2px 2px 0px 0px #1a1a1a' }}>
                            <span className="text-[10px] font-black text-gray-900 uppercase">{new Date(task.dueDate!).toLocaleString('en-US', { month: 'short' })}</span>
                            <span className="text-lg font-black text-gray-900 leading-none">{new Date(task.dueDate!).getDate()}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 truncate text-sm">{task.title}</p>
                            <p className="text-xs font-medium text-gray-500 mt-0.5">Due in {Math.ceil((new Date(task.dueDate!).getTime() - Date.now()) / (1000 * 3600 * 24))} days</p>
                          </div>
                          <PriorityBox priority={task.priority} />
                        </Link>
                      )
                    })
                  )}
                </div>
              </SectionCard>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <SectionCard title="PROJECT OVERVIEW" headerColor="bg-neo-lime text-gray-900" action={{ label: '', to: '/projects' }}>
                <div className="bg-white overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="border-b-3 border-gray-900 bg-gray-50">
                        <th className="py-3 px-4 font-black text-xs uppercase tracking-wider text-gray-900">Project</th>
                        <th className="py-3 px-4 font-black text-xs uppercase tracking-wider text-gray-900">Progress</th>
                        <th className="py-3 px-4 font-black text-xs uppercase tracking-wider text-gray-900">Tasks</th>
                        <th className="py-3 px-4 font-black text-xs uppercase tracking-wider text-gray-900">Deadline</th>
                        <th className="py-3 px-4 font-black text-xs uppercase tracking-wider text-gray-900">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-gray-900">
                      {data.projects.length === 0 ? (
                        <tr><td colSpan={5}><EmptyState message="Belum ada project aktif" /></td></tr>
                      ) : (
                        data.projects.map((p, idx) => {
                          const status = p.overdueTasks && p.overdueTasks > 0 ? 'At Risk' : 'On Track';
                          const bgColors = ['bg-neo-blue', 'bg-[#C5A3FF]', 'bg-neo-pink', 'bg-neo-lime'];
                          const avatarBg = bgColors[idx % bgColors.length];

                          return (
                            <tr key={p.id} className="hover:bg-gray-50 transition-colors group">
                              <td className="py-3 px-4 flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-neo ${avatarBg} border-2 border-gray-900 flex items-center justify-center text-gray-900 font-black text-sm flex-shrink-0`} style={{ boxShadow: '2px 2px 0px 0px #1a1a1a' }}>
                                  {p.name[0].toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <Link to={`/projects/${p.id}`} className="font-bold text-gray-900 text-sm group-hover:underline truncate block">{p.name}</Link>
                                  <p className="text-[11px] text-gray-500 font-medium truncate w-[150px]">{p.description || 'No description'}</p>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold w-8 text-gray-900">{p.progress}%</span>
                                  <div className="w-24"><ProgressBar value={p.progress || 0} showLabel={false} size="xs" color="bg-neo-blue" /></div>
                                </div>
                              </td>
                              <td className="py-3 px-4 font-bold text-sm text-gray-900">
                                {p.doneTasks} / {p.totalTasks}
                              </td>
                              <td className="py-3 px-4 font-bold text-sm text-gray-900">
                                {p.endDate ? formatDate(p.endDate) : '-'}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`text-[10px] px-2 py-1 font-black uppercase tracking-wider rounded border-2 border-gray-900 ${status === 'At Risk' ? 'bg-neo-red text-white' : 'bg-neo-lime text-gray-900'}`} style={{ boxShadow: '2px 2px 0px 0px #1a1a1a' }}>
                                  {status}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            </div>

            <div className="space-y-6">
              <SectionCard title="ACTIVITY FEED" headerColor="bg-neo-blue text-white">
                <div className="bg-white divide-y-2 divide-gray-900 flex flex-col h-full min-h-[250px]">
                  {data.activities.length === 0 ? (
                    <EmptyState message="Belum ada aktivitas" />
                  ) : (
                    data.activities.map(act => (
                      <div key={act.id} className="p-4 flex gap-3 hover:bg-gray-50 transition-colors">
                        <Avatar name={act.user.name} avatarUrl={act.user.avatarUrl} size="sm" className="flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 leading-snug">
                            <span className="font-bold">{act.user.name}</span> {act.action === 'status_changed' ? 'changed status of' : act.action === 'created' ? 'created task' : act.action} <span className="font-medium text-gray-700">"{act.task.title}"</span>
                          </p>
                          <p className="text-xs text-gray-500 mt-1 font-medium">{formatDate(act.createdAt)}</p>
                        </div>
                      </div>
                    ))
                  )}
                  <div className="mt-auto p-3 text-center border-t-2 border-gray-900">
                    <Link to="#" className="text-xs font-black text-gray-900 uppercase hover:underline">
                      VIEW ALL ACTIVITY
                    </Link>
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Subcomponents
const StatCard: React.FC<{ label: string; value: number; icon: React.ReactNode; color: string }> = ({ label, value, icon, color }) => {
  const colors: Record<string, string> = {
    blue: 'bg-neo-blue text-white',
    yellow: 'bg-neo-yellow text-gray-900',
    lime: 'bg-neo-lime text-gray-900',
    red: 'bg-neo-red text-white',
    purple: 'bg-[#C5A3FF] text-gray-900',
  };

  return (
    <div className="bg-white border-3 border-gray-900 p-4 rounded-neo flex items-center justify-between" style={{ boxShadow: '4px 4px 0px 0px #1a1a1a' }}>
      <div>
        <p className="text-[10px] font-black uppercase text-gray-900 tracking-wider mb-1">{label}</p>
        <p className="text-3xl font-black text-gray-900 leading-none tabular-nums">{value}</p>
      </div>
      <div className={`w-10 h-10 ${colors[color]} border-2 border-gray-900 rounded-neo flex items-center justify-center flex-shrink-0`} style={{ boxShadow: '2px 2px 0px 0px #1a1a1a' }}>
        {icon}
      </div>
    </div>
  );
};

const SectionCard: React.FC<{ title: string; headerColor: string; action?: { label: string; to: string }; children: React.ReactNode }> = ({ title, headerColor, action, children }) => (
  <div className="border-3 border-gray-900 rounded-neo flex flex-col h-full bg-white" style={{ boxShadow: '6px 6px 0px 0px #1a1a1a' }}>
    <div className={`flex items-center justify-between px-5 py-3 border-b-3 border-gray-900 ${headerColor}`}>
      <h2 className="text-sm font-black uppercase tracking-wider">{title}</h2>
      {action && (
        <Link to={action.to} className="hover:opacity-80 transition-opacity">
          <ArrowRight className="w-5 h-5" />
        </Link>
      )}
    </div>
    <div className="flex-1 flex flex-col">
      {children}
    </div>
  </div>
);

const KanbanColumn: React.FC<{ title: string; count: number; tasks: any[]; headerColor: string }> = ({ title, count, tasks, headerColor }) => (
  <div className="flex flex-col bg-gray-50 border-2 border-gray-900 rounded-neo h-full min-h-[350px]">
    <div className={`flex items-center justify-between px-3 py-2 border-b-2 border-gray-900 ${headerColor}`}>
      <span className="font-black text-[11px] text-gray-900 uppercase">{title}</span>
      <span className="font-bold text-[11px] text-gray-900 bg-white px-1.5 rounded border border-gray-900">{count}</span>
    </div>
    <div className="p-2 space-y-2 flex-1 overflow-y-auto custom-scrollbar">
      {tasks.map(task => (
        <div key={task.id} className="bg-white border-2 border-gray-900 p-3 rounded-neo hover:-translate-y-0.5 hover:translate-x-0.5 transition-transform cursor-pointer" style={{ boxShadow: '2px 2px 0px 0px #1a1a1a' }}>
          <p className="font-bold text-xs text-gray-900 mb-3 line-clamp-2 leading-snug">{task.title}</p>
          <div className="flex items-center justify-between">
            <PriorityBox priority={task.priority} />
            <Avatar name={task.assignee?.name || '?'} avatarUrl={task.assignee?.avatarUrl} size="xs" />
          </div>
        </div>
      ))}
    </div>
    <Link to="/projects" className="p-2 border-t-2 border-gray-900 border-dashed text-center text-xs font-bold hover:bg-gray-100 transition-colors text-gray-700 m-2 mt-auto">
      + Add task
    </Link>
  </div>
);

const PriorityBox: React.FC<{ priority: string }> = ({ priority }) => {
  const colors: Record<string, string> = {
    LOW: 'bg-neo-blue text-gray-900',
    MEDIUM: 'bg-neo-yellow text-gray-900',
    HIGH: 'bg-neo-lime text-gray-900',
    URGENT: 'bg-neo-red text-white'
  };
  return (
    <span className={`text-[9px] font-black px-1.5 py-0.5 uppercase border-2 border-gray-900 ${colors[priority] || colors.MEDIUM}`} style={{ boxShadow: '1px 1px 0px 0px #1a1a1a' }}>
      {priority}
    </span>
  );
};

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="py-8 text-center px-4 m-auto">
    <p className="text-sm font-bold text-gray-500">{message}</p>
  </div>
);

export default DashboardPage;
