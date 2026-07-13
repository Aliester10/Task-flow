import { Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma/client';
import { AuthRequest } from '../types/index';
import { io } from '../index';

// POST /projects/:projectId/tasks/:taskId/comments
export const createComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId, taskId } = req.params;
    const schema = z.object({ content: z.string().min(1, 'Komentar tidak boleh kosong').max(2000, 'Komentar maksimal 2000 karakter') });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors });
      return;
    }

    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: req.user!.id } },
    });
    if (!member) {
      res.status(403).json({ success: false, error: 'Akses ditolak.' });
      return;
    }

    const task = await prisma.task.findFirst({ where: { id: taskId, projectId } });
    if (!task) {
      res.status(404).json({ success: false, error: 'Task tidak ditemukan.' });
      return;
    }

    const comment = await prisma.comment.create({
      data: { taskId, userId: req.user!.id, content: parsed.data.content },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    });

    // Log aktivitas
    await prisma.activityLog.create({
      data: { taskId, userId: req.user!.id, action: 'commented', newValue: parsed.data.content.slice(0, 100) },
    });

    // Notifikasi ke assignee jika ada dan bukan diri sendiri
    if (task.assigneeId && task.assigneeId !== req.user!.id) {
      const notif = await prisma.notification.create({
        data: {
          userId: task.assigneeId,
          message: `${req.user!.name} menambahkan komentar pada task "${task.title}"`,
          type: 'comment',
          link: `/projects/${projectId}/tasks/${taskId}`,
        },
      });
      io.to(`user:${task.assigneeId}`).emit('new-notification', notif);
    }

    res.status(201).json({ success: true, data: comment });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Terjadi kesalahan server.' });
  }
};

// DELETE /projects/:projectId/tasks/:taskId/comments/:commentId
export const deleteComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { commentId } = req.params;
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) {
      res.status(404).json({ success: false, error: 'Komentar tidak ditemukan.' });
      return;
    }
    if (comment.userId !== req.user!.id) {
      res.status(403).json({ success: false, error: 'Anda tidak bisa menghapus komentar orang lain.' });
      return;
    }
    await prisma.comment.delete({ where: { id: commentId } });
    res.json({ success: true, message: 'Komentar berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Terjadi kesalahan server.' });
  }
};
