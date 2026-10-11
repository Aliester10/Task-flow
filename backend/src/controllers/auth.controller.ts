import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
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

const googleSchema = z.object({ credential: z.string().min(1).max(10000) });
const googleClient = new OAuth2Client();

function publicUser(user: { password: string | null; googleId: string | null; tokenVersion: number; [key: string]: unknown }) {
  const { password, googleId, tokenVersion, ...safeUser } = user;
  return { ...safeUser, hasPassword: Boolean(password), googleLinked: Boolean(googleId) };
}

async function verifyGoogleCredential(credential: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID_NOT_CONFIGURED');
  const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: clientId });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email || payload.email_verified !== true) {
    throw new Error('GOOGLE_IDENTITY_INVALID');
  }
  return payload;
}

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
    const user = await prisma.user.create({ data: { name, email, password: hashed } });

    const token = generateAccessToken({ id: user.id, email: user.email, name: user.name });
    const refreshToken = generateRefreshToken({ id: user.id, tokenVersion: user.tokenVersion });
    
    setRefreshTokenCookie(res, refreshToken);
    
    res.status(201).json({ success: true, data: { user: publicUser(user), token } });
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
    if (!user?.password) {
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

    res.json({ success: true, data: { user: publicUser(user), token } });
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

export const googleLogin = async (req: Request, res: Response): Promise<void> => {
  const parsed = googleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Kredensial Google tidak valid.' });
    return;
  }
  if (!process.env.GOOGLE_CLIENT_ID) {
    res.status(503).json({ success: false, error: 'Login Google belum dikonfigurasi.' });
    return;
  }

  let identity;
  try {
    identity = await verifyGoogleCredential(parsed.data.credential);
  } catch (err) {
    console.error('Google verification error:', err);
    res.status(401).json({ success: false, error: 'Kredensial Google tidak valid atau kedaluwarsa.' });
    return;
  }

  try {
    let user = await prisma.user.findUnique({ where: { googleId: identity.sub } });
    if (!user) {
      const existing = await prisma.user.findFirst({ where: { email: { equals: identity.email!, mode: 'insensitive' } } });
      if (existing) {
        res.status(409).json({ success: false, error: 'Email ini sudah terdaftar. Masuk dengan password, lalu hubungkan Google di Pengaturan Akun.' });
        return;
      }
      user = await prisma.user.create({
        data: {
          name: identity.name?.trim() || identity.email!.split('@')[0],
          email: identity.email!.toLowerCase(),
          password: null,
          googleId: identity.sub,
          avatarUrl: identity.picture || null,
        },
      });
    }
    const token = generateAccessToken({ id: user.id, email: user.email, name: user.name });
    const refreshToken = generateRefreshToken({ id: user.id, tokenVersion: user.tokenVersion });
    setRefreshTokenCookie(res, refreshToken);
    res.json({ success: true, data: { user: publicUser(user), token } });
  } catch (err) {
    console.error('Google login error:', err);
    res.status(500).json({ success: false, error: 'Terjadi kesalahan server.' });
  }
};

export const linkGoogle = async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = googleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Kredensial Google tidak valid.' });
    return;
  }
  if (!process.env.GOOGLE_CLIENT_ID) {
    res.status(503).json({ success: false, error: 'Login Google belum dikonfigurasi.' });
    return;
  }

  let identity;
  try {
    identity = await verifyGoogleCredential(parsed.data.credential);
  } catch (err) {
    console.error('Google verification error:', err);
    res.status(401).json({ success: false, error: 'Kredensial Google tidak valid atau kedaluwarsa.' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      res.status(404).json({ success: false, error: 'User tidak ditemukan.' });
      return;
    }
    if (user.email.toLowerCase() !== identity.email!.toLowerCase()) {
      res.status(409).json({ success: false, error: 'Email akun Google harus sama dengan email akun TaskFlow.' });
      return;
    }
    if (user.googleId && user.googleId !== identity.sub) {
      res.status(409).json({ success: false, error: 'Akun ini sudah terhubung dengan akun Google lain.' });
      return;
    }
    const owner = await prisma.user.findUnique({ where: { googleId: identity.sub } });
    if (owner && owner.id !== user.id) {
      res.status(409).json({ success: false, error: 'Akun Google ini sudah terhubung dengan pengguna lain.' });
      return;
    }
    const updated = await prisma.user.update({ where: { id: user.id }, data: { googleId: identity.sub } });
    res.json({ success: true, data: publicUser(updated) });
  } catch (err) {
    console.error('Google link error:', err);
    res.status(500).json({ success: false, error: 'Terjadi kesalahan server.' });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      res.status(404).json({ success: false, error: 'User tidak ditemukan.' });
      return;
    }
    res.json({ success: true, data: publicUser(user) });
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
      if (!user.password) {
        res.status(400).json({ success: false, error: 'Akun Google belum memiliki password untuk diubah.' });
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
    });
    
    // If password changed, we need to return new refresh token
    if (password) {
      const updatedUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
      if (updatedUser) {
        const refreshToken = generateRefreshToken({ id: updatedUser.id, tokenVersion: updatedUser.tokenVersion });
        setRefreshTokenCookie(res, refreshToken);
      }
    }

    res.json({ success: true, data: publicUser(updated) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Terjadi kesalahan server.' });
  }
};
