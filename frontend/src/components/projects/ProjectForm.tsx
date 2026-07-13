import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Project } from '../../types';

const schema = z.object({
  name: z.string().min(1, 'Nama project wajib diisi'),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface ProjectFormProps {
  project?: Project;
  onSubmit: (data: { name: string; description?: string; startDate?: string | null; endDate?: string | null }) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ProjectForm: React.FC<ProjectFormProps> = ({ project, onSubmit, onCancel, isLoading }) => {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: project?.name || '',
      description: project?.description || '',
      startDate: project?.startDate?.split('T')[0] || '',
      endDate: project?.endDate?.split('T')[0] || '',
    },
  });

  const handleFormSubmit = async (data: FormData) => {
    await onSubmit({
      name: data.name,
      description: data.description,
      startDate: data.startDate ? new Date(data.startDate).toISOString() : null,
      endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-4">
      <div>
        <label className="label" htmlFor="proj-name">Nama Project <span className="text-red-500">*</span></label>
        <input id="proj-name" {...register('name')} className="input" placeholder="Contoh: Website Redesign 2026" autoFocus />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
      </div>
      <div>
        <label className="label" htmlFor="proj-desc">Deskripsi</label>
        <textarea id="proj-desc" {...register('description')} className="input resize-none" rows={3} placeholder="Deskripsi singkat tujuan project..." />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="proj-start">Tanggal Mulai</label>
          <input id="proj-start" type="date" {...register('startDate')} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="proj-end">Tanggal Selesai</label>
          <input id="proj-end" type="date" {...register('endDate')} className="input" />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-md btn-secondary flex-1" disabled={isLoading}>Batal</button>
        <button type="submit" className="btn-md btn-primary flex-1" disabled={isLoading}>
          {isLoading ? 'Menyimpan...' : project ? 'Simpan' : 'Buat Project'}
        </button>
      </div>
    </form>
  );
};
