import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Settings, Users, LayoutGrid, List, Plus, Upload,
  UserPlus, Trash2, Archive, MoreHorizontal, BarChart2, Zap,
} from 'lucide-react';
import { useProjectStore } from '../store/project.store';
import { useTaskStore } from '../store/task.store';
import { useAuthStore } from '../store/auth.store';
import { Task, TaskStatus } from '../types';
import { KanbanBoard } from '../components/board/KanbanBoard';
import { TaskDetail } from '../components/tasks/TaskDetail';
import { TaskForm } from '../components/tasks/TaskForm';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Avatar } from '../components/ui/Avatar';
import { SkeletonProjectDetail } from '../components/ui/Spinner';
import { ProjectForm } from '../components/projects/ProjectForm';
import { projectService } from '../services/project.service';
import { StatusIcon, SprintIcon } from '../components/ui/StatusIcon';
import { ProjectSummary } from '../components/project/ProjectSummary';
import { SprintManager } from '../components/project/SprintManager';

type ActiveTab = 'summary' | 'board' | 'backlog' | 'sprint' | 'members';

const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentProject, fetchProject, updateProject, deleteProject, archiveProject } = useProjectStore();
  const { tasks, fetchTasks, createTask, updateTask, deleteTask, importTasks } = useTaskStore();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<ActiveTab>('summary');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>('TODO');
  const [showEditProject, setShowEditProject] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviting, setInviting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProject(id);
      fetchTasks(id);
    }
  }, [id, fetchProject, fetchTasks]);

  if (!currentProject || currentProject.id !== id) {
    return <SkeletonProjectDetail />;
  }

  const project = currentProject;
  const isOwner = project.ownerId === user?.id;

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setEditingTask(null);
  };

  const handleAddTask = (status: TaskStatus = 'TODO') => {
    setDefaultStatus(status);
    setEditingTask(null);
    setSelectedTask(null);
    setShowTaskForm(true);
  };

  const handleCreateTask = async (data: Partial<Task>) => {
    setSaving(true);
    try {
      await createTask(id!, data as Parameters<typeof createTask>[1]);
      setShowTaskForm(false);
    } finally { setSaving(false); }
  };

  const handleUpdateTask = async (data: Partial<Task>) => {
    if (!editingTask) return;
    setSaving(true);
    try {
      await updateTask(id!, editingTask.id, data as Parameters<typeof updateTask>[2]);
      setEditingTask(null);
      setSelectedTask(null);
    } finally { setSaving(false); }
  };

  const handleInvite = async () => {
    setInviteError('');
    setInviting(true);
    try {
      await projectService.inviteMember(id!, inviteEmail);
      await fetchProject(id!);
      setInviteEmail('');
      setShowInviteModal(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setInviteError(msg || 'Gagal mengundang member.');
    } finally { setInviting(false); }
  };

  const handleDeleteProject = async () => {
    setDeleting(true);
    try {
      await deleteProject(id!);
      navigate('/projects');
    } finally { setDeleting(false); }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const json = JSON.parse(text);
        if (Array.isArray(json)) {
          setSaving(true);
          await importTasks(id!, json);
          // Optional: Add a success toast here
        }
      } catch (err) {
        console.error('Failed to parse JSON', err);
        alert('Gagal membaca file JSON. Pastikan formatnya benar.');
      } finally {
        setSaving(false);
        // Reset file input
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const boardTasks = tasks.filter((t) => t.status !== 'BACKLOG');
  const backlogTasks = tasks.filter((t) => t.status === 'BACKLOG');

  const tabs: { key: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { key: 'summary', label: 'Summary',                        icon: <BarChart2 className="w-3.5 h-3.5" />   },
    { key: 'board',   label: 'Board',                          icon: <LayoutGrid className="w-3.5 h-3.5" /> },
    { key: 'backlog', label: `Backlog`,                        icon: <List className="w-3.5 h-3.5" />       },
    { key: 'sprint',  label: 'Sprint',                         icon: <SprintIcon size={14} active />         },
    { key: 'members', label: `Members (${project.members.length})`, icon: <Users className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Project Header */}
      <div className="px-6 py-4 border-b-3 border-gray-900 bg-white flex-shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-neo-pink rounded-neo border-3 border-gray-900 flex items-center justify-center text-gray-900 font-bold text-base flex-shrink-0"
                 style={{ boxShadow: '3px 3px 0px 0px #1a1a1a' }}>
              {project.name[0].toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
              {project.description && <p className="text-sm text-gray-500 mt-0.5 line-clamp-1 font-medium">{project.description}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Members mini */}
            <div className="hidden sm:flex -space-x-1.5 mr-2">
              {project.members.slice(0, 4).map((m) => (
                <Avatar key={m.id} name={m.user.name} avatarUrl={m.user.avatarUrl} size="xs" className="ring-2 ring-white" />
              ))}
            </div>

            <button onClick={() => setShowImportModal(true)} className="btn-md btn-secondary flex items-center gap-1.5" title="Import Testcase dari JSON">
              <Upload className="w-4 h-4" /> Import
            </button>

            <button onClick={() => handleAddTask()} className="btn-md btn-primary">
              <Plus className="w-4 h-4" /> Task
            </button>

            {isOwner && (
              <div className="relative">
                <button onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                  className="btn-ghost p-2 border-2 border-gray-900 rounded-neo"
                  style={{ boxShadow: '2px 2px 0px 0px #1a1a1a' }}
                  aria-label="Pengaturan project">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                {showSettingsMenu && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white border-3 border-gray-900 rounded-neo z-10 py-1"
                       style={{ boxShadow: '4px 4px 0px 0px #1a1a1a' }}>
                    <button onClick={() => { setShowEditProject(true); setShowSettingsMenu(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-bold text-gray-900 hover:bg-neo-yellow transition-colors">
                      <Settings className="w-3.5 h-3.5" /> Edit Project
                    </button>
                    <button onClick={() => { setShowInviteModal(true); setShowSettingsMenu(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-bold text-gray-900 hover:bg-neo-blue transition-colors">
                      <UserPlus className="w-3.5 h-3.5" /> Undang Member
                    </button>
                    <button onClick={() => { archiveProject(id!); setShowSettingsMenu(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-bold text-gray-900 hover:bg-neo-purple transition-colors">
                      <Archive className="w-3.5 h-3.5" /> Arsip Project
                    </button>
                    <hr className="my-1 border-t-2 border-gray-900" />
                    <button onClick={() => { setShowDeleteConfirm(true); setShowSettingsMenu(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-bold text-neo-red hover:bg-neo-red/10 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" /> Hapus Project
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="mt-3 max-w-xs">
          <ProgressBar value={project.progress ?? 0} size="md" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 mt-4 -mb-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-all rounded-t-neo border-3
                ${activeTab === tab.key
                  ? 'text-gray-900 border-gray-900 bg-neo-yellow border-b-0 relative z-10'
                  : 'text-gray-500 border-transparent hover:text-gray-900 hover:bg-neo-cream'}`}
              style={activeTab === tab.key ? { marginBottom: '-3px', paddingBottom: 'calc(0.625rem + 3px)' } : {}}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'summary' && (
          <ProjectSummary project={project} tasks={tasks} />
        )}

        {activeTab === 'board' && (
          <KanbanBoard
            projectId={id!}
            tasks={boardTasks}
            onTaskClick={handleTaskClick}
            onAddTask={handleAddTask}
          />
        )}

        {activeTab === 'backlog' && (
          <BacklogView tasks={backlogTasks} onTaskClick={handleTaskClick} onAddTask={() => handleAddTask('BACKLOG')} projectId={id!} />
        )}

        {activeTab === 'sprint' && (
          <SprintManager
            project={project}
            backlogTasks={backlogTasks}
            onTaskClick={handleTaskClick}
            onRefresh={() => { fetchProject(id!); fetchTasks(id!); }}
          />
        )}

        {activeTab === 'members' && (
          <MembersView project={project} isOwner={isOwner} onInvite={() => setShowInviteModal(true)} onRefresh={() => fetchProject(id!)} />
        )}
      </div>

      {/* Task Create Modal */}
      <Modal isOpen={showTaskForm} onClose={() => setShowTaskForm(false)} title="Buat Task Baru" size="lg">
        <TaskForm project={project} defaultStatus={defaultStatus} onSubmit={handleCreateTask} onCancel={() => setShowTaskForm(false)} isLoading={saving} />
      </Modal>

      {/* Task Detail / Edit Modal */}
      <Modal isOpen={!!selectedTask && !editingTask} onClose={() => setSelectedTask(null)} size="xl">
        {selectedTask && (
          <TaskDetail
            task={selectedTask}
            projectId={id!}
            onEdit={() => { setEditingTask(selectedTask); setSelectedTask(null); }}
            onClose={() => setSelectedTask(null)}
          />
        )}
      </Modal>

      <Modal isOpen={!!editingTask} onClose={() => setEditingTask(null)} title="Edit Task" size="lg">
        {editingTask && (
          <TaskForm project={project} task={editingTask} onSubmit={handleUpdateTask} onCancel={() => setEditingTask(null)} isLoading={saving} />
        )}
      </Modal>

      {/* Edit Project Modal */}
      <Modal isOpen={showEditProject} onClose={() => setShowEditProject(false)} title="Edit Project">
        <ProjectForm
          project={project}
          onSubmit={async (data) => { setSaving(true); try { await updateProject(id!, data); setShowEditProject(false); } finally { setSaving(false); } }}
          onCancel={() => setShowEditProject(false)}
          isLoading={saving}
        />
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteProject}
        title="Hapus Project"
        message={`Yakin ingin menghapus project "${project.name}"? Semua task dan data akan terhapus permanen.`}
        isLoading={deleting}
      />

      {/* Invite Modal */}
      <Modal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} title="Undang Member" size="sm">
        <div className="p-6">
          <label className="label" htmlFor="invite-email">Email Member</label>
          <input
            id="invite-email"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="input mb-2"
            placeholder="nama@email.com"
            onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
          />
          {inviteError && <p className="text-xs text-neo-red mb-2 font-bold">{inviteError}</p>}
          <div className="flex gap-3 mt-4">
            <button onClick={() => setShowInviteModal(false)} className="btn-md btn-secondary flex-1">Batal</button>
            <button onClick={handleInvite} className="btn-md btn-primary flex-1" disabled={inviting || !inviteEmail}>
              {inviting ? 'Mengundang...' : 'Undang'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Import Modal */}
      <Modal isOpen={showImportModal} onClose={() => setShowImportModal(false)} title="Import Testcase">
        <div className="p-6">
          <p className="text-sm text-gray-700 mb-4 font-medium">
            Unggah file JSON untuk mengimpor banyak testcase sekaligus.
          </p>
          
          <div className="bg-neo-cream border-2 border-gray-900 p-4 rounded-neo mb-6" style={{ boxShadow: '2px 2px 0px 0px #1a1a1a' }}>
            <h4 className="font-bold text-gray-900 text-sm mb-2">Contoh Format JSON:</h4>
            <pre className="text-xs bg-white p-3 border-2 border-gray-900 rounded overflow-x-auto text-gray-800">
{`[
  {
    "title": "[QA] Uji Coba Form",
    "description": "Langkah:\\n1. Buka form\\n2. Isi form",
    "priority": "HIGH",
    "status": "TODO",
    "labels": ["QA", "Testing"]
  }
]`}
            </pre>
            <div className="mt-3 text-xs text-gray-600 font-medium">
              <p>• <b>title</b> (Wajib): Judul dari task/testcase.</p>
              <p>• <b>description</b> (Opsional): Langkah pengujian & hasil.</p>
              <p>• <b>priority</b> (Opsional): LOW, MEDIUM, HIGH, URGENT.</p>
              <p>• <b>status</b> (Opsional): BACKLOG, TODO, IN_PROGRESS, dll.</p>
              <p>• <b>labels</b> (Opsional): Daftar label dalam Array.</p>
            </div>
            <a href="/testcase-template.json" download className="text-xs font-bold text-neo-blue underline mt-3 inline-block hover:opacity-80">
              Unduh Template JSON Lengkap
            </a>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setShowImportModal(false)} className="btn-md btn-secondary flex-1">Batal</button>
            <label className="btn-md btn-primary flex-1 text-center cursor-pointer">
              {saving ? 'Mengimpor...' : 'Pilih File & Import'}
              <input type="file" accept=".json" hidden onChange={(e) => { handleImport(e); setShowImportModal(false); }} disabled={saving} />
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// --- Sub components ---

const BacklogView: React.FC<{ tasks: Task[]; onTaskClick: (t: Task) => void; onAddTask: () => void; projectId: string }> = ({ tasks, onTaskClick, onAddTask }) => (
  <div>
    <div className="flex items-center justify-between mb-4">
      <h2 className="font-bold text-gray-900 text-lg">Backlog ({tasks.length} task)</h2>
      <button onClick={onAddTask} className="btn-sm btn-secondary gap-1.5"><Plus className="w-3.5 h-3.5" /> Tambah</button>
    </div>
    {tasks.length === 0 ? (
      <div className="text-center py-12 border-3 border-dashed border-gray-900 rounded-neo bg-neo-cream">
        <p className="text-gray-500 text-sm font-bold">Backlog kosong</p>
        <button onClick={onAddTask} className="btn-sm btn-primary gap-1.5 mt-3"><Plus className="w-3.5 h-3.5" /> Tambah Task</button>
      </div>
    ) : (
      <div className="space-y-2">
        {tasks.map((task) => (
          <button key={task.id} onClick={() => onTaskClick(task)}
            className="w-full text-left card p-4 transition-all flex items-center gap-3 group"
            style={{ transition: 'transform 0.15s, box-shadow 0.15s' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translate(2px, 2px)';
              e.currentTarget.style.boxShadow = '2px 2px 0px 0px #1a1a1a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = '';
              e.currentTarget.style.boxShadow = '4px 4px 0px 0px #1a1a1a';
            }}
          >
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 group-hover:text-gray-700 text-sm">{task.title}</p>
              {task.description && <p className="text-xs text-gray-500 truncate mt-0.5 font-medium">{task.description}</p>}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {task.assignee && <Avatar name={task.assignee.name} avatarUrl={task.assignee.avatarUrl} size="xs" />}
            </div>
          </button>
        ))}
      </div>
    )}
  </div>
);

const SprintView: React.FC<{ projectId: string; project: { sprints?: { id: string; name: string; status: string; totalTasks?: number; doneTasks?: number; tasks?: Task[] }[] }; onTaskClick: (t: Task) => void }> = ({ project, onTaskClick }) => {
  const sprints = project.sprints || [];
  return (
    <div className="space-y-6">
      {sprints.length === 0 ? (
        <div className="text-center py-12 border-3 border-dashed border-gray-900 rounded-neo bg-neo-cream">
          <div className="w-12 h-12 mx-auto mb-3 rounded-neo border-3 border-gray-900 bg-neo-yellow flex items-center justify-center"
               style={{ boxShadow: '3px 3px 0px 0px #1a1a1a' }}>
            <Zap className="w-5 h-5 text-gray-900" />
          </div>
          <p className="text-gray-500 text-sm font-bold">Belum ada sprint. Buat sprint dari halaman sprint management.</p>
        </div>
      ) : (
        sprints.map((sprint) => (
          <div key={sprint.id} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900">{sprint.name}</h3>
                <span className={`badge ${sprint.status === 'ACTIVE' ? 'bg-neo-lime' : sprint.status === 'COMPLETED' ? 'bg-gray-100' : 'bg-neo-blue'}`}>
                  {sprint.status}
                </span>
              </div>
              <span className="text-sm text-gray-600 font-bold">{sprint.doneTasks}/{sprint.totalTasks} selesai</span>
            </div>
            {sprint.tasks && sprint.tasks.length > 0 ? (
              <div className="space-y-2">
                {sprint.tasks.map((task) => (
                  <button key={task.id} onClick={() => onTaskClick(task)}
                    className="w-full text-left px-3 py-2 rounded-neo hover:bg-neo-yellow/30 transition-colors flex items-center gap-3 group border-2 border-transparent hover:border-gray-900">
                    <span className="text-sm font-bold text-gray-900 group-hover:text-gray-700 flex-1 text-left">{task.title}</span>
                    {task.assignee && <Avatar name={task.assignee.name} avatarUrl={task.assignee.avatarUrl} size="xs" />}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4 font-medium">Tidak ada task di sprint ini</p>
            )}
          </div>
        ))
      )}
    </div>
  );
};

const MembersView: React.FC<{ project: { members: { id: string; user: { id: string; name: string; email: string; avatarUrl?: string | null }; role: string; joinedAt: string }[]; ownerId: string }; isOwner: boolean; onInvite: () => void; onRefresh: () => void }> = ({ project, isOwner, onInvite }) => (
  <div>
    <div className="flex items-center justify-between mb-4">
      <h2 className="font-bold text-gray-900 text-lg">{project.members.length} Member</h2>
      {isOwner && (
        <button onClick={onInvite} className="btn-sm btn-primary gap-1.5"><UserPlus className="w-3.5 h-3.5" /> Undang</button>
      )}
    </div>
    <div className="space-y-3">
      {project.members.map((m) => (
        <div key={m.id} className="card p-4 flex items-center gap-4">
          <Avatar name={m.user.name} avatarUrl={m.user.avatarUrl} size="md" />
          <div className="flex-1">
            <p className="font-bold text-gray-900">{m.user.name}</p>
            <p className="text-sm text-gray-500 font-medium">{m.user.email}</p>
          </div>
          <span className={`badge ${m.role === 'OWNER' ? 'bg-neo-yellow' : 'bg-gray-100'}`}>
            {m.role}
          </span>
        </div>
      ))}
    </div>
  </div>
);

export default ProjectDetailPage;
