import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../prisma/client';
import { AuthRequest } from '../types/index';

const registerSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

const ACCESS_TOKEN_EXPIRY = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function generateAccessToken(user: { id: string; email: string; name: string }): string {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET!,
    { expiresIn: ACCESS_TOKEN_EXPIRY } as jwt.SignOptions
  );
}

function generateRefreshToken(user: { id: string; tokenVersion: number }): string {
  return jwt.sign(
    { id: user.id, tokenVersion: user.tokenVersion },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET!,
    { expiresIn: REFRESH_TOKEN_EXPIRY } as jwt.SignOptions
  );
}

function setRefreshTokenCookie(res: Response, token: string) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
  });
}

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors });
      return;
    }

    const { name, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ success: false, error: 'Email sudah digunakan.' });
      return;
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashed },
      select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true, tokenVersion: true },
    });

    const token = generateAccessToken({ id: user.id, email: user.email, name: user.name });
    const refreshToken = generateRefreshToken({ id: user.id, tokenVersion: user.tokenVersion });
    
    setRefreshTokenCookie(res, refreshToken);
    
    const { tokenVersion: _, ...safeUser } = user;
    res.status(201).json({ success: true, data: { user: safeUser, token } });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, error: 'Terjadi kesalahan server.' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors });
      return;
    }

    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ success: false, error: 'Email atau password salah.' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(401).json({ success: false, error: 'Email atau password salah.' });
      return;
    }

    const token = generateAccessToken({ id: user.id, email: user.email, name: user.name });
    const refreshToken = generateRefreshToken({ id: user.id, tokenVersion: user.tokenVersion });
    
    setRefreshTokenCookie(res, refreshToken);

    const { password: _, tokenVersion: __, ...safeUser } = user;
    res.json({ success: true, data: { user: safeUser, token } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Terjadi kesalahan server.' });
  }
};

export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { tokenVersion: { increment: 1 } },
      });
    }
    res.clearCookie('refreshToken');
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ success: false, error: 'Terjadi kesalahan server.' });
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  const token = req.cookies.refreshToken;
  if (!token) {
    res.status(401).json({ success: false, error: 'Refresh token tidak ditemukan.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET!) as { id: string; tokenVersion: number };
    
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user || user.tokenVersion !== decoded.tokenVersion) {
      res.status(401).json({ success: false, error: 'Refresh token tidak valid atau sudah ditarik.' });
      return;
    }

    const newToken = generateAccessToken({ id: user.id, email: user.email, name: user.name });
    const newRefreshToken = generateRefreshToken({ id: user.id, tokenVersion: user.tokenVersion });
    
    setRefreshTokenCookie(res, newRefreshToken);
    
    res.json({ success: true, data: { token: newToken } });
  } catch (err) {
    res.status(401).json({ success: false, error: 'Refresh token tidak valid atau kadaluarsa.' });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true },
    });
    if (!user) {
      res.status(404).json({ success: false, error: 'User tidak ditemukan.' });
      return;
    }
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Terjadi kesalahan server.' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const schema = z.object({
      name: z.string().min(2).max(100).optional(),
      avatarUrl: z.string().url().max(500).optional().nullable(),
      password: z.string().min(6).max(100).optional(),
      currentPassword: z.string().max(100).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors });
      return;
    }

    const { name, avatarUrl, password, currentPassword } = parsed.data;
    const updateData: any = {};

    if (name) updateData.name = name;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

    if (password) {
      if (!currentPassword) {
        res.status(400).json({ success: false, error: 'Password lama wajib diisi.' });
        return;
      }
      const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
      if (!user) {
        res.status(404).json({ success: false, error: 'User tidak ditemukan.' });
        return;
      }
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) {
        res.status(401).json({ success: false, error: 'Password lama salah.' });
        return;
      }
      updateData.password = await bcrypt.hash(password, 10);
      updateData.tokenVersion = { increment: 1 }; // invalidate refresh tokens when password changes
    }

    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: updateData,
      select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true },
    });
    
    // If password changed, we need to return new refresh token
    if (password) {
      const updatedUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
      if (updatedUser) {
        const refreshToken = generateRefreshToken({ id: updatedUser.id, tokenVersion: updatedUser.tokenVersion });
        setRefreshTokenCookie(res, refreshToken);
      }
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Terjadi kesalahan server.' });
  }
};
