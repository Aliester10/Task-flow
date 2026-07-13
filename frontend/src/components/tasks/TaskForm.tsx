import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Task, TaskStatus, Priority, Project } from '../../types';
import { StatusIcon, PriorityIcon } from '../ui/StatusIcon';

// Status + Priority display names
const STATUS_LABELS: Record<TaskStatus, string> = {
  BACKLOG: 'Backlog', TODO: 'To Do', IN_PROGRESS: 'In Progress',
  REVIEW: 'Review', DONE: 'Done', BLOCKED: 'Blocked',
};
const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', URGENT: 'Urgent',
};

const schema = z.object({
  title: z.string().min(1, 'Judul wajib diisi'),
  description: z.string().optional(),
  status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'BLOCKED']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
  sprintId: z.string().optional(),
  labels: z.string().optional(), // comma-separated
});

type FormData = z.infer<typeof schema>;

interface TaskFormProps {
  project: Project;
  task?: Task;
  defaultStatus?: TaskStatus;
  onSubmit: (data: Partial<Task>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const TaskForm: React.FC<TaskFormProps> = ({ project, task, defaultStatus = 'TODO', onSubmit, onCancel, isLoading }) => {
  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: task?.title || '',
      description: task?.description || '',
      status: task?.status || defaultStatus,
      priority: task?.priority || 'MEDIUM',
      assigneeId: task?.assigneeId || '',
      dueDate: task?.dueDate ? task.dueDate.split('T')[0] : '',
      sprintId: task?.sprintId || '',
      labels: task?.labels.join(', ') || '',
    },
  });

  useEffect(() => { 
    if (task) {
      reset({ 
        title: task.title,
        description: task.description || undefined,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate?.split('T')[0] || undefined, 
        labels: task.labels.join(', '), 
        sprintId: task.sprintId || undefined, 
        assigneeId: task.assigneeId || undefined 
      }); 
    } 
  }, [task, reset]);

  const handleFormSubmit = async (data: FormData) => {
    await onSubmit({
      title: data.title,
      description: data.description || null,
      status: data.status as TaskStatus,
      priority: data.priority as Priority,
      assigneeId: data.assigneeId || null,
      dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
      sprintId: data.sprintId || null,
      labels: data.labels ? data.labels.split(',').map((l) => l.trim()).filter(Boolean) : [],
    });
  };

  const activeSprint = project.sprints?.find((s) => s.status === 'ACTIVE');

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-4">
      <div>
        <label className="label" htmlFor="task-title">Judul Task <span className="text-red-500">*</span></label>
        <input id="task-title" {...register('title')} className="input" placeholder="Deskripsi singkat task..." autoFocus />
        {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
      </div>

      <div>
        <label className="label" htmlFor="task-desc">Deskripsi</label>
        <textarea id="task-desc" {...register('description')} className="input resize-none" rows={3} placeholder="Detail tambahan..." />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="task-status">Status</label>
          <div className="relative">
            <select id="task-status" {...register('status')} className="input pl-8">
              {(['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'BLOCKED'] as TaskStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2">
              <StatusIcon status={watch('status') as TaskStatus || defaultStatus} size={14} />
            </div>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="task-priority">Prioritas</label>
          <div className="relative">
            <select id="task-priority" {...register('priority')} className="input pl-8">
              {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as Priority[]).map((p) => (
                <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2">
              <PriorityIcon priority={watch('priority') as Priority || 'MEDIUM'} size={14} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="task-assignee">Assignee</label>
          <select id="task-assignee" {...register('assigneeId')} className="input">
            <option value="">— Tidak ada —</option>
            {project.members.map((m) => (
              <option key={m.user.id} value={m.user.id}>{m.user.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="task-due">Due Date</label>
          <input id="task-due" type="date" {...register('dueDate')} className="input" />
        </div>
      </div>

      {project.sprints && project.sprints.length > 0 && (
        <div>
          <label className="label" htmlFor="task-sprint">Sprint</label>
          <select id="task-sprint" {...register('sprintId')} className="input">
            <option value="">— Backlog —</option>
            {project.sprints.map((s) => (
              <option key={s.id} value={s.id}>{s.name}{s.status === 'ACTIVE' ? ' (Aktif)' : ''}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="label" htmlFor="task-labels">Labels <span className="text-xs text-gray-400">(pisahkan dengan koma)</span></label>
        <input id="task-labels" {...register('labels')} className="input" placeholder="frontend, bug, urgent..." />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-md btn-secondary flex-1" disabled={isLoading}>Batal</button>
        <button type="submit" className="btn-md btn-primary flex-1" disabled={isLoading}>
          {isLoading ? 'Menyimpan...' : task ? 'Simpan Perubahan' : 'Buat Task'}
        </button>
      </div>
    </form>
  );
};
