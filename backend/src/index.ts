import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import helmet from 'helmet';
import compression from 'compression';

import authRoutes from './routes/auth.routes';
import projectRoutes from './routes/project.routes';
import taskRoutes from './routes/task.routes';
import sprintRoutes from './routes/sprint.routes';
import notificationRoutes from './routes/notification.routes';
import dashboardRoutes from './routes/dashboard.routes';
import { scheduleCleanup } from './utils/cleanup';
import prisma from './prisma/client';
import { generalLimiter } from './middlewares/rateLimit.middleware';

const app = express();
const server = http.createServer(app);

const io = new SocketServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Security headers
// crossOriginResourcePolicy diset 'cross-origin' agar tidak bentrok dengan
// request dari Vite dev server (:5173 → :5000) maupun fetch dari browser
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Response compression — taruh setelah helmet, sebelum routes
app.use(compression());

// CORS
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// General rate limiter — hanya cover /api/* routes, tidak menyentuh Socket.IO
// Socket.IO handshake berjalan di /socket.io/* yang dikelola http server langsung,
// bukan melewati Express router, sehingga middleware Express tidak berlaku di sana.
app.use('/api', generalLimiter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects/:projectId/tasks', taskRoutes);
app.use('/api/projects/:projectId/sprints', sprintRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint tidak ditemukan.' });
});

// Socket.io — realtime update board
io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  socket.on('authenticate', (userId: string) => {
    socket.join(`user:${userId}`);
    console.log(`Socket ${socket.id} joined user:${userId}`);
  });

  socket.on('join-project', (projectId: string) => {
    socket.join(`project:${projectId}`);
    console.log(`Socket ${socket.id} joined project:${projectId}`);
  });

  socket.on('leave-project', (projectId: string) => {
    socket.leave(`project:${projectId}`);
  });

  socket.on('task-moved', (data: { projectId: string; taskId: string; newStatus: string }) => {
    // Broadcast data langsung ke room tanpa query DB — data sudah dikirim dari client
    // yang melakukan drag. Member project lain akan update UI mereka dengan data ini.
    socket.to(`project:${data.projectId}`).emit('task-updated', data);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

// Export io for use in controllers (optional)
export { io };

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 TaskFlow API running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);

  // Jadwalkan cleanup data lama (activity_logs >60hr, notifications >30hr)
  scheduleCleanup();
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
// Tutup HTTP server, Socket.IO, dan koneksi Prisma secara berurutan.
// Tanpa ini, koneksi menggantung di pooler Supabase yang jatahnya terbatas.

async function shutdown(signal: string): Promise<void> {
  console.log(`\n[shutdown] Received ${signal}, closing server...`);

  // 1. Tutup Socket.IO — tolak koneksi WebSocket baru
  io.close(() => {
    console.log('[shutdown] Socket.IO closed.');
  });

  // 2. Tutup HTTP server — tolak request HTTP baru, tunggu yang sedang berjalan selesai
  server.close(async () => {
    // 3. Putuskan koneksi Prisma setelah semua request selesai
    await prisma.$disconnect();
    console.log('[shutdown] Prisma disconnected. Process exiting.');
    process.exit(0);
  });

  // Force exit jika server tidak selesai dalam 10 detik
  setTimeout(() => {
    console.error('[shutdown] Forced exit after timeout.');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM')); // signal dari container/PM2/systemd
process.on('SIGINT',  () => shutdown('SIGINT'));  // Ctrl+C saat development
