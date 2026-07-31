import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/index';
import prisma from '../prisma/client';

export const requireProjectMember = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { projectId } = req.params;
    
    if (!req.user || !projectId) {
      res.status(401).json({ success: false, error: 'Unauthorized atau Project ID hilang' });
      return;
    }

    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: req.user.id } },
    });

    if (!member) {
      res.status(403).json({ success: false, error: 'Akses ditolak.' });
      return;
    }

    req.projectMember = member;
    next();
  } catch (err) {
    console.error('Error in requireProjectMember:', err);
    res.status(500).json({ success: false, error: 'Terjadi kesalahan server saat verifikasi project.' });
  }
};
