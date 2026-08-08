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

export const requireProjectRole = (roles: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projectId = req.params.projectId || req.params.id;
      
      if (!req.user || !projectId) {
        res.status(401).json({ success: false, error: 'Unauthorized atau Project ID hilang' });
        return;
      }

      // Gunakan req.projectMember jika sudah diset oleh requireProjectMember sebelumnya
      let member = req.projectMember;
      
      if (!member) {
        const foundMember = await prisma.projectMember.findUnique({
          where: { projectId_userId: { projectId, userId: req.user.id } },
        });
        if (foundMember) {
          member = foundMember;
          req.projectMember = member;
        }
      }

      if (!member) {
        res.status(403).json({ success: false, error: 'Akses ditolak. Anda bukan anggota project.' });
        return;
      }

      if (!roles.includes(member.role)) {
        res.status(403).json({ success: false, error: 'Akses ditolak. Anda tidak memiliki izin yang cukup.' });
        return;
      }

      next();
    } catch (err) {
      console.error('Error in requireProjectRole:', err);
      res.status(500).json({ success: false, error: 'Terjadi kesalahan server saat verifikasi akses project.' });
    }
  };
};
