import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, FolderKanban, Users, CheckSquare, AlertCircle, MoreHorizontal, Archive } from 'lucide-react';
import { useProjectStore } from '../store/project.store';
import { ProgressBar } from '../components/ui/ProgressBar';
import { SkeletonCard } from '../components/ui/Spinner';
import { Modal } from '../components/ui/Modal';
import { ProjectForm } from '../components/projects/ProjectForm';
import { AvatarGroup } from '../components/ui/Avatar';
import { formatDate } from '../utils';

const ProjectsPage: React.FC = () => {
  const { projects, isLoading, fetchProjects, createProject } = useProjectStore();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (data: Parameters<typeof createProject>[0]) => {
    setCreating(true);
    try {
      await createProject(data);
      setShowCreate(false);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500 mt-0.5 font-medium">
            {projects.length} project aktif
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-md btn-primary">
          <Plus className="w-4 h-4" /> Project Baru
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10 py-2.5 text-sm"
            placeholder="Cari project..."
            aria-label="Cari project"
          />
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-neo-yellow rounded-neo border-3 border-gray-900 flex items-center justify-center mb-4"
               style={{ boxShadow: '4px 4px 0px 0px #1a1a1a' }}>
            <FolderKanban className="w-7 h-7 text-gray-900" />
          </div>
          <h3 className="font-bold text-gray-900 mb-1 text-lg">
            {search ? 'Project tidak ditemukan' : 'Belum ada project'}
          </h3>
          <p className="text-sm text-gray-500 mb-5 font-medium">
            {search ? `Tidak ada project yang cocok dengan "${search}"` : 'Mulai dengan membuat project pertama Anda'}
          </p>
          {!search && (
            <button onClick={() => setShowCreate(true)} className="btn-md btn-primary">
              <Plus className="w-4 h-4" /> Buat Project Pertama
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="card group transition-all duration-200 flex flex-col"
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
              <div className="p-5 flex-1">
                {/* Top */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-neo bg-neo-pink border-3 border-gray-900 flex items-center justify-center text-gray-900 font-bold text-base flex-shrink-0"
                         style={{ boxShadow: '2px 2px 0px 0px #1a1a1a' }}>
                      {project.name[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 group-hover:text-gray-700 transition-colors text-sm truncate max-w-[160px]">
                        {project.name}
                      </h3>
                      {project.isArchived && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 font-bold">
                          <Archive className="w-2.5 h-2.5" /> Diarsipkan
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.preventDefault(); }}
                    className="p-1.5 rounded-neo text-gray-400 hover:text-gray-900 hover:bg-neo-yellow transition-colors opacity-0 group-hover:opacity-100 border-2 border-transparent hover:border-gray-900"
                    aria-label="Menu project"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>

                {project.description && (
                  <p className="text-xs text-gray-500 mb-4 line-clamp-2 leading-relaxed font-medium">
                    {project.description}
                  </p>
                )}

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-gray-500 font-bold">Progress</span>
                    <span className="text-xs font-bold text-gray-900 tabular-nums bg-neo-yellow px-1.5 py-0.5 rounded border-2 border-gray-900">{project.progress ?? 0}%</span>
                  </div>
                  <ProgressBar value={project.progress ?? 0} showLabel={false} size="sm" />
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 text-xs text-gray-600 font-bold">
                  <span className="flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5" />
                    {project.doneTasks ?? 0}/{project.totalTasks ?? 0}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    {project.members?.length ?? 0}
                  </span>
                  {(project.overdueTasks ?? 0) > 0 && (
                    <span className="flex items-center gap-1.5 text-neo-red font-bold">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {project.overdueTasks} overdue
                    </span>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-3.5 border-t-3 border-gray-900 flex items-center justify-between bg-neo-cream rounded-b-neo">
                <AvatarGroup users={project.members?.map(m => m.user) || []} max={4} size="xs" />
                {project.endDate && (
                  <span className="text-[11px] text-gray-600 flex items-center gap-1 font-bold">
                    <span>Deadline</span>
                    <span className="text-gray-900 bg-white px-1.5 py-0.5 rounded border-2 border-gray-900">{formatDate(project.endDate)}</span>
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Buat Project Baru"
        description="Isi detail project untuk memulai kolaborasi tim"
      >
        <ProjectForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} isLoading={creating} />
      </Modal>
    </div>
  );
};

export default ProjectsPage;
