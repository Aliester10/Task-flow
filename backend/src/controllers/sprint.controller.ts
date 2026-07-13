import { Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma/client';
import { AuthRequest } from '../types/index';

const sprintSchema = z.object({
  name: z.string().min(1, 'Nama sprint wajib diisi').max(100),
  goal: z.string().max(500, 'Sprint goal maksimal 500 karakter').optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
});

// GET /projects/:projectId/sprints
export const getSprints = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: req.user!.id } },
    });
    if (!member) {
      res.status(403).json({ success: false, error: 'Akses ditolak.' });
      return;
    }

    const sprints = await prisma.sprint.findMany({
      where: { projectId },
      include: {
        tasks: {
          include: { assignee: { select: { id: true, name: true, email: true, avatarUrl: true } } },
          orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        },
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Burndown data per sprint
    const sprintsWithStats = sprints.map((sprint) => {
      const total = sprint.tasks.length;
      const done = sprint.tasks.filter((t) => t.status === 'DONE').length;
      return { ...sprint, totalTasks: total, doneTasks: done, burndown: total > 0 ? Math.round((done / total) * 100) : 0 };
    });

    res.json({ success: true, data: sprintsWithStats });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Terjadi kesalahan server.' });
  }
};

// POST /projects/:projectId/sprints
export const createSprint = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: req.user!.id } },
    });
    if (!member || member.role !== 'OWNER') {
      res.status(403).json({ success: false, error: 'Hanya owner yang bisa membuat sprint.' });
      return;
    }

    const parsed = sprintSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors });
      return;
    }

    const { name, goal, startDate, endDate } = parsed.data;
    const sprint = await prisma.sprint.create({
      data: {
        projectId,
        name,
        goal,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    });

    res.status(201).json({ success: true, data: sprint });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Terjadi kesalahan server.' });
  }
};

// PUT /projects/:projectId/sprints/:sprintId
export const updateSprint = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId, sprintId } = req.params;
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: req.user!.id } },
    });
    if (!member || member.role !== 'OWNER') {
      res.status(403).json({ success: false, error: 'Hanya owner yang bisa mengubah sprint.' });
      return;
    }

    const schema = z.object({
      name: z.string().min(1).max(100).optional(),
      goal: z.string().max(500).optional().nullable(),
      startDate: z.string().datetime().optional().nullable(),
      endDate: z.string().datetime().optional().nullable(),
      status: z.enum(['PLANNED', 'ACTIVE', 'COMPLETED']).optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors });
      return;
    }

    const { name, goal, startDate, endDate, status } = parsed.data;

    // Hanya 1 sprint ACTIVE per project
    if (status === 'ACTIVE') {
      await prisma.sprint.updateMany({ where: { projectId, status: 'ACTIVE' }, data: { status: 'PLANNED' } });
    }

    const sprint = await prisma.sprint.update({
      where: { id: sprintId },
      data: {
        ...(name && { name }),
        ...(goal !== undefined && { goal }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(status && { status }),
      },
    });

    res.json({ success: true, data: sprint });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Terjadi kesalahan server.' });
  }
};

// DELETE /projects/:projectId/sprints/:sprintId
export const deleteSprint = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId, sprintId } = req.params;
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: req.user!.id } },
    });
    if (!member || member.role !== 'OWNER') {
      res.status(403).json({ success: false, error: 'Hanya owner yang bisa menghapus sprint.' });
      return;
    }

    // Pindahkan task ke backlog
    await prisma.task.updateMany({ where: { sprintId }, data: { sprintId: null, status: 'BACKLOG' } });
    await prisma.sprint.delete({ where: { id: sprintId } });
    res.json({ success: true, message: 'Sprint dihapus, task dipindahkan ke backlog.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Terjadi kesalahan server.' });
  }
};

// POST /projects/:projectId/sprints/:sprintId/add-task
export const addTaskToSprint = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId, sprintId } = req.params;
    const schema = z.object({ taskId: z.string() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'taskId wajib diisi.' });
      return;
    }

    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: req.user!.id } },
    });
    if (!member) {
      res.status(403).json({ success: false, error: 'Akses ditolak.' });
      return;
    }

    const task = await prisma.task.update({
      where: { id: parsed.data.taskId },
      data: { sprintId, status: 'TODO' },
    });

    res.json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Terjadi kesalahan server.' });
  }
};
