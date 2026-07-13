import { Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma/client';
import { AuthRequest } from '../types/index';
import { io } from '../index';
import { cacheService, invalidateUserCache, invalidateProjectCache } from '../utils/cache';

const projectSchema = z.object({
  name: z.string().min(1, 'Nama project wajib diisi').max(100),
  description: z.string().max(1000, 'Deskripsi maksimal 1000 karakter').optional(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
});

// GET /projects — semua project yang diikuti user
export const getProjects = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const cacheKey = `projects_${userId}`;

    const cachedData = cacheService.get(cacheKey);
    if (cachedData) {
      res.json({ success: true, data: cachedData });
      return;
    }

    const projects = await prisma.project.findMany({
      where: {
        members: { some: { userId: req.user!.id } },
        isArchived: false,
      },
      include: {
        owner: { select: { id: true, name: true, email: true, avatarUrl: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const projectIds = projects.map((p) => p.id);
    const now = new Date();

    // Agregasi done & overdue tasks sekaligus — 2 query, bukan N*2 query
    const [doneGroups, overdueGroups] = await Promise.all([
      prisma.task.groupBy({
        by: ['projectId'],
        where: { projectId: { in: projectIds }, status: 'DONE' },
        _count: { id: true },
      }),
      prisma.task.groupBy({
        by: ['projectId'],
        where: { projectId: { in: projectIds }, dueDate: { lt: now }, status: { notIn: ['DONE'] } },
        _count: { id: true },
      }),
    ]);

    const doneMap = new Map(doneGroups.map((r) => [r.projectId, r._count.id]));
    const overdueMap = new Map(overdueGroups.map((r) => [r.projectId, r._count.id]));

    const projectsWithProgress = projects.map((p) => {
      const total = p._count.tasks;
      const done = doneMap.get(p.id) ?? 0;
      const overdue = overdueMap.get(p.id) ?? 0;
      return { ...p, totalTasks: total, doneTasks: done, overdueTasks: overdue, progress: total > 0 ? Math.round((done / total) * 100) : 0 };
    });

    // TTL 10 menit — daftar project jarang berubah
    cacheService.set(cacheKey, projectsWithProgress, 600);

    res.json({ success: true, data: projectsWithProgress });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Terjadi kesalahan server.' });
  }
};

// GET /projects/:id
export const getProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const cacheKey = `project_${id}_${userId}`;

    const cachedData = cacheService.get(cacheKey);
    if (cachedData) {
      res.json({ success: true, data: cachedData });
      return;
    }

    const project = await prisma.project.findFirst({
      where: { id, members: { some: { userId: req.user!.id } } },
      include: {
        owner: { select: { id: true, name: true, email: true, avatarUrl: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
        sprints: { orderBy: { createdAt: 'desc' } },
        _count: { select: { tasks: true } },
      },
    });

    if (!project) {
      res.status(404).json({ success: false, error: 'Project tidak ditemukan.' });
      return;
    }

    const now = new Date();
    const [totalTasks, doneTasks, overdueTasks] = await Promise.all([
      prisma.task.count({ where: { projectId: id } }),
      prisma.task.count({ where: { projectId: id, status: 'DONE' } }),
      prisma.task.count({ where: { projectId: id, dueDate: { lt: now }, status: { notIn: ['DONE'] } } }),
    ]);

    const responseData = { ...project, totalTasks, doneTasks, overdueTasks, progress: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0 };
    // TTL 10 menit — detail project + member list jarang berubah
    cacheService.set(cacheKey, responseData, 600);

    res.json({
      success: true,
      data: responseData,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Terjadi kesalahan server.' });
  }
};

// POST /projects
export const createProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = projectSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors });
      return;
    }

    const { name, description, startDate, endDate } = parsed.data;
    const project = await prisma.project.create({
      data: {
        name,
        description,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        ownerId: req.user!.id,
        members: { create: { userId: req.user!.id, role: 'OWNER' } },
      },
      include: {
        owner: { select: { id: true, name: true, email: true, avatarUrl: true } },
        members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
      },
    });

    invalidateUserCache(req.user!.id);

    res.status(201).json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Terjadi kesalahan server.' });
  }
};

// PUT /projects/:id
export const updateProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: id, userId: req.user!.id } },
    });
    if (!member || member.role !== 'OWNER') {
      res.status(403).json({ success: false, error: 'Hanya owner yang bisa mengubah project.' });
      return;
    }

    const schema = projectSchema.partial();
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors });
      return;
    }

    const { name, description, startDate, endDate } = parsed.data;
    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      },
      include: {
        owner: { select: { id: true, name: true, email: true, avatarUrl: true } },
        members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
      },
    });

    await invalidateProjectCache(id);

    res.json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Terjadi kesalahan server.' });
  }
};

// DELETE /projects/:id
export const deleteProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project || project.ownerId !== req.user!.id) {
      res.status(403).json({ success: false, error: 'Hanya owner yang bisa menghapus project.' });
      return;
    }

    // Invalidate caches before deletion (so we still know the members)
    await invalidateProjectCache(id);
    
    await prisma.project.delete({ where: { id } });

    res.json({ success: true, message: 'Project berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Terjadi kesalahan server.' });
  }
};

// PATCH /projects/:id/archive
export const archiveProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project || project.ownerId !== req.user!.id) {
      res.status(403).json({ success: false, error: 'Hanya owner yang bisa mengarsip project.' });
      return;
    }
    const updated = await prisma.project.update({ where: { id }, data: { isArchived: !project.isArchived } });
    
    await invalidateProjectCache(id);
    
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Terjadi kesalahan server.' });
  }
};

// POST /projects/:id/members — invite member
export const inviteMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const schema = z.object({ email: z.string().email() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Email tidak valid.' });
      return;
    }

    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: id, userId: req.user!.id } },
    });
    if (!member || member.role !== 'OWNER') {
      res.status(403).json({ success: false, error: 'Hanya owner yang bisa mengundang member.' });
      return;
    }

    const invitee = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!invitee) {
      res.status(404).json({ success: false, error: 'User dengan email tersebut tidak ditemukan.' });
      return;
    }

    const existing = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: id, userId: invitee.id } },
    });
    if (existing) {
      res.status(409).json({ success: false, error: 'User sudah menjadi member project ini.' });
      return;
    }

    const newMember = await prisma.projectMember.create({
      data: { projectId: id, userId: invitee.id, role: 'MEMBER' },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    });

    // Notifikasi
    const notif = await prisma.notification.create({
      data: {
        userId: invitee.id,
        message: `Anda diundang ke project oleh ${req.user!.name}`,
        type: 'invite',
        link: `/projects/${id}`,
      },
    });
    io.to(`user:${invitee.id}`).emit('new-notification', notif);

    await invalidateProjectCache(id);
    invalidateUserCache(invitee.id);

    res.status(201).json({ success: true, data: newMember });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Terjadi kesalahan server.' });
  }
};

// DELETE /projects/:id/members/:userId
export const removeMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id, userId } = req.params;
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: id, userId: req.user!.id } },
    });
    if (!member || member.role !== 'OWNER') {
      res.status(403).json({ success: false, error: 'Hanya owner yang bisa menghapus member.' });
      return;
    }
    if (userId === req.user!.id) {
      res.status(400).json({ success: false, error: 'Owner tidak bisa menghapus dirinya sendiri.' });
      return;
    }
    
    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId: id, userId } },
    });
    
    await invalidateProjectCache(id);
    invalidateUserCache(userId);

    res.json({ success: true, message: 'Member berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Terjadi kesalahan server.' });
  }
};
