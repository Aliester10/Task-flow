import { Response } from 'express';
import prisma from '../prisma/client';
import { AuthRequest } from '../types/index';
import { cacheService } from '../utils/cache';

// GET /dashboard
export const getDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const cacheKey = `dashboard_${userId}`;

    const cachedData = cacheService.get(cacheKey);
    if (cachedData) {
      res.json({ success: true, data: cachedData });
      return;
    }

    // 1. Ambil semua projectId milik user (1 query)
    const memberProjects = await prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true },
    });
    const projectIds = memberProjects.map((m) => m.projectId);

    if (projectIds.length === 0) {
      const empty = {
        stats: { totalTasks: 0, inProgressTasks: 0, overdueTasks: 0, doneTasks: 0, activeProjects: 0 },
        kanbanTasks: { TODO: [], IN_PROGRESS: [], BLOCKED: [], REVIEW: [], DONE: [] },
        activeSprint: null,
        upcomingTasks: [],
        projects: [],
        activities: [],
      };
      cacheService.set(cacheKey, empty, 300);
      res.json({ success: true, data: empty });
      return;
    }

    const now = new Date();

    // 2. Semua query independen dijalankan paralel (1 round-trip ke DB)
    const [
      totalTasks,
      inProgressTasks,
      overdueTasks,
      doneTasks,
      activeProjects,
      kanbanTasksRaw,
      activeSprintData,
      upcomingTasks,
      projectsRaw,
      activities,
    ] = await Promise.all([
      // Stats
      prisma.task.count({ where: { projectId: { in: projectIds } } }),
      prisma.task.count({
        where: { projectId: { in: projectIds }, assigneeId: userId, status: { in: ['TODO', 'IN_PROGRESS', 'REVIEW'] } },
      }),
      prisma.task.count({
        where: { projectId: { in: projectIds }, dueDate: { lt: now }, status: { notIn: ['DONE'] } },
      }),
      prisma.task.count({ where: { projectId: { in: projectIds }, status: 'DONE' } }),
      prisma.project.count({ where: { id: { in: projectIds }, isArchived: false } }),

      // Kanban preview — ambil max 20 task assigned ke user, grouping di JS setelah itu
      prisma.task.findMany({
        where: { projectId: { in: projectIds }, assigneeId: userId },
        select: {
          id: true, title: true, status: true, priority: true, projectId: true,
          assignee: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
        take: 20,
      }),

      // Active sprint — 1 query, sudah include count tasks via _count
      prisma.sprint.findFirst({
        where: { projectId: { in: projectIds }, status: 'ACTIVE' },
        select: {
          id: true, name: true, goal: true, startDate: true, endDate: true, status: true,
          _count: { select: { tasks: true } },
        },
        orderBy: { endDate: 'asc' },
      }),

      // Upcoming deadlines
      prisma.task.findMany({
        where: { projectId: { in: projectIds }, status: { notIn: ['DONE'] }, dueDate: { not: null, gt: now } },
        select: {
          id: true, title: true, priority: true, dueDate: true, projectId: true,
          project: { select: { id: true, name: true } },
        },
        orderBy: { dueDate: 'asc' },
        take: 4,
      }),

      // Project overview — gunakan groupBy untuk hitung done tasks & total tasks dalam 1 agregasi
      prisma.project.findMany({
        where: { id: { in: projectIds }, isArchived: false },
        select: {
          id: true, name: true, description: true, endDate: true,
          _count: { select: { tasks: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),

      // Activity feed
      prisma.activityLog.findMany({
        where: { task: { projectId: { in: projectIds } } },
        select: {
          id: true, action: true, oldValue: true, newValue: true, createdAt: true,
          user: { select: { id: true, name: true, avatarUrl: true } },
          task: { select: { id: true, title: true, projectId: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 4,
      }),
    ]);

    // 3. Hitung done & overdue tasks per project dengan 2 agregasi groupBy (bukan loop N+1)
    const [doneTasksPerProject, overdueTasksPerProject] = await Promise.all([
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

    const doneMap = new Map(doneTasksPerProject.map((r) => [r.projectId, r._count.id]));
    const overdueMap = new Map(overdueTasksPerProject.map((r) => [r.projectId, r._count.id]));

    const projects = projectsRaw.map((p) => {
      const done = doneMap.get(p.id) ?? 0;
      const overdue = overdueMap.get(p.id) ?? 0;
      return {
        ...p,
        progress: p._count.tasks > 0 ? Math.round((done / p._count.tasks) * 100) : 0,
        totalTasks: p._count.tasks,
        doneTasks: done,
        overdueTasks: overdue,
      };
    });

    // 4. Hitung done tasks sprint aktif (1 query tambahan, hanya kalau ada sprint aktif)
    let activeSprint = null;
    if (activeSprintData) {
      const doneSprintTasks = await prisma.task.count({
        where: { sprintId: activeSprintData.id, status: 'DONE' },
      });
      activeSprint = {
        ...activeSprintData,
        totalTasks: activeSprintData._count.tasks,
        doneTasks: doneSprintTasks,
      };
    }

    // 5. Group kanban tasks di JS (sudah limit 20 dari DB)
    const kanbanTasks = {
      TODO: kanbanTasksRaw.filter((t) => t.status === 'BACKLOG' || t.status === 'TODO').slice(0, 4),
      IN_PROGRESS: kanbanTasksRaw.filter((t) => t.status === 'IN_PROGRESS').slice(0, 4),
      BLOCKED: kanbanTasksRaw.filter((t) => t.status === 'BLOCKED').slice(0, 4),
      REVIEW: kanbanTasksRaw.filter((t) => t.status === 'REVIEW').slice(0, 4),
      DONE: kanbanTasksRaw.filter((t) => t.status === 'DONE').slice(0, 4),
    };

    const responseData = {
      stats: { totalTasks, inProgressTasks, overdueTasks, doneTasks, activeProjects },
      kanbanTasks,
      activeSprint,
      upcomingTasks,
      projects,
      activities,
    };

    // Cache 5 menit
    cacheService.set(cacheKey, responseData, 300);

    res.json({ success: true, data: responseData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Terjadi kesalahan server.' });
  }
};
