import { Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma/client';
import { AuthRequest } from '../types/index';
import { TaskStatus } from '@prisma/client';
import { io } from '../index';
import { invalidateProjectCache } from '../utils/cache';

const taskSchema = z.object({
  title: z.string().min(1, 'Judul task wajib diisi').max(200),
  description: z.string().max(5000, 'Deskripsi maksimal 5000 karakter').optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'BLOCKED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  labels: z.array(z.string().max(50)).max(10, 'Maksimal 10 label').optional(),
  sprintId: z.string().optional().nullable(),
});

// GET /projects/:projectId/tasks
export const getTasks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { status, assigneeId, sprintId, search } = req.query;

    // Pagination — default page 1, limit 50
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const skip = (page - 1) * limit;

    // Pastikan user adalah member project
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: req.user!.id } },
    });
    if (!member) {
      res.status(403).json({ success: false, error: 'Akses ditolak.' });
      return;
    }

    const where: Record<string, unknown> = { projectId };
    if (status) where.status = status as TaskStatus;
    if (assigneeId) where.assigneeId = assigneeId as string;
    if (sprintId === 'null') where.sprintId = null;
    else if (sprintId) where.sprintId = sprintId as string;
    if (search) where.title = { contains: search as string, mode: 'insensitive' };

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        select: {
          id: true, title: true, status: true, priority: true, dueDate: true,
          labels: true, order: true, sprintId: true, projectId: true,
          createdAt: true, updatedAt: true,
          assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
          _count: { select: { comments: true } },
        },
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.task.count({ where }),
    ]);

    res.json({
      success: true,
      data: tasks,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Terjadi kesalahan server.' });
  }
};

// GET /projects/:projectId/tasks/:taskId
export const getTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId, taskId } = req.params;

    // Pagination untuk activity logs
    const activityPage = Math.max(1, parseInt(req.query.activityPage as string) || 1);
    const activityLimit = Math.min(50, parseInt(req.query.activityLimit as string) || 20);

    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: req.user!.id } },
    });
    if (!member) {
      res.status(403).json({ success: false, error: 'Akses ditolak.' });
      return;
    }

    // 1 query gabungan + 1 count untuk total activity logs
    const [task, totalActivityLogs] = await Promise.all([
      prisma.task.findFirst({
        where: { id: taskId, projectId },
        include: {
          assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
          sprint: { select: { id: true, name: true, status: true } },
          comments: {
            include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
            orderBy: { createdAt: 'asc' },
          },
          activityLogs: {
            include: { user: { select: { id: true, name: true, avatarUrl: true } } },
            orderBy: { createdAt: 'desc' },
            take: activityLimit,
            skip: (activityPage - 1) * activityLimit,
          },
        },
      }),
      prisma.activityLog.count({ where: { taskId } }),
    ]);

    if (!task) {
      res.status(404).json({ success: false, error: 'Task tidak ditemukan.' });
      return;
    }

    res.json({
      success: true,
      data: task,
      activityPagination: {
        page: activityPage,
        limit: activityLimit,
        total: totalActivityLogs,
        totalPages: Math.ceil(totalActivityLogs / activityLimit),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Terjadi kesalahan server.' });
  }
};

// POST /projects/:projectId/tasks
export const createTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: req.user!.id } },
    });
    if (!member) {
      res.status(403).json({ success: false, error: 'Akses ditolak.' });
      return;
    }

    const parsed = taskSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors });
      return;
    }

    const { title, description, assigneeId, status, priority, dueDate, labels, sprintId } = parsed.data;

    const lastTask = await prisma.task.findFirst({
      where: { projectId, status: status || 'BACKLOG' },
      orderBy: { order: 'desc' },
    });

    const task = await prisma.task.create({
      data: {
        title,
        description,
        assigneeId: assigneeId || null,
        status: status || 'BACKLOG',
        priority: priority || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : null,
        labels: labels || [],
        sprintId: sprintId || null,
        projectId,
        order: (lastTask?.order ?? -1) + 1,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    // Notifikasi ke assignee
    if (assigneeId && assigneeId !== req.user!.id) {
      const notif = await prisma.notification.create({
        data: {
          userId: assigneeId,
          message: `${req.user!.name} menugaskan task "${title}" kepada Anda`,
          type: 'assign',
          link: `/projects/${projectId}/tasks/${task.id}`,
        },
      });
      io.to(`user:${assigneeId}`).emit('new-notification', notif);
    }

    // Log aktivitas
    await prisma.activityLog.create({
      data: { taskId: task.id, userId: req.user!.id, action: 'created', newValue: status || 'BACKLOG' },
    });

    await invalidateProjectCache(projectId);

    res.status(201).json({ success: true, data: task });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Terjadi kesalahan server.' });
  }
};

// PUT /projects/:projectId/tasks/:taskId
export const updateTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId, taskId } = req.params;
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: req.user!.id } },
    });
    if (!member) {
      res.status(403).json({ success: false, error: 'Akses ditolak.' });
      return;
    }

    const parsed = taskSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors });
      return;
    }

    const existing = await prisma.task.findFirst({ where: { id: taskId, projectId } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Task tidak ditemukan.' });
      return;
    }

    const { title, description, assigneeId, status, priority, dueDate, labels, sprintId } = parsed.data;

    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(labels !== undefined && { labels }),
        ...(sprintId !== undefined && { sprintId: sprintId || null }),
      },
      include: {
        assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    // Log perubahan status
    if (status && status !== existing.status) {
      await prisma.activityLog.create({
        data: { taskId, userId: req.user!.id, action: 'status_changed', oldValue: existing.status, newValue: status },
      });
    }

    // Notifikasi jika assignee berubah
    if (assigneeId && assigneeId !== existing.assigneeId && assigneeId !== req.user!.id) {
      const notif = await prisma.notification.create({
        data: {
          userId: assigneeId,
          message: `${req.user!.name} menugaskan task "${existing.title}" kepada Anda`,
          type: 'assign',
          link: `/projects/${projectId}/tasks/${taskId}`,
        },
      });
      io.to(`user:${assigneeId}`).emit('new-notification', notif);
    }

    await invalidateProjectCache(projectId);

    res.json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Terjadi kesalahan server.' });
  }
};

// DELETE /projects/:projectId/tasks/:taskId
export const deleteTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId, taskId } = req.params;
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: req.user!.id } },
    });
    if (!member || member.role !== 'OWNER') {
      res.status(403).json({ success: false, error: 'Hanya owner yang bisa menghapus task.' });
      return;
    }

    const task = await prisma.task.findFirst({ where: { id: taskId, projectId } });
    if (!task) {
      res.status(404).json({ success: false, error: 'Task tidak ditemukan.' });
      return;
    }

    await prisma.task.delete({ where: { id: taskId } });

    await invalidateProjectCache(projectId);

    res.json({ success: true, message: 'Task berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Terjadi kesalahan server.' });
  }
};

// PATCH /projects/:projectId/tasks/reorder — untuk drag & drop Kanban
export const reorderTasks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const schema = z.object({
      taskId: z.string(),
      newStatus: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'BLOCKED']),
      newOrder: z.number().int().min(0),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors });
      return;
    }

    const { taskId, newStatus, newOrder } = parsed.data;

    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: req.user!.id } },
    });
    if (!member) {
      res.status(403).json({ success: false, error: 'Akses ditolak.' });
      return;
    }

    const existing = await prisma.task.findFirst({ where: { id: taskId, projectId } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Task tidak ditemukan.' });
      return;
    }

    const oldStatus = existing.status;
    const task = await prisma.task.update({
      where: { id: taskId },
      data: { status: newStatus, order: newOrder },
    });

    if (oldStatus !== newStatus) {
      await prisma.activityLog.create({
        data: { taskId, userId: req.user!.id, action: 'status_changed', oldValue: oldStatus, newValue: newStatus },
      });
    }

    await invalidateProjectCache(projectId);

    res.json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Terjadi kesalahan server.' });
  }
};
