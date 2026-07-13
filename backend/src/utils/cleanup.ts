/**
 * cleanup.ts
 * ──────────────────────────────────────────────────────────────
 * Retention policy untuk tabel append-only (activity_logs, notifications).
 * Tabel ini paling cepat numpuk di Supabase Free Tier (storage 500MB).
 *
 * Cara pakai:
 *   - Otomatis: panggil scheduleCleanup() di src/index.ts saat server start
 *   - Manual:   ts-node src/utils/cleanup.ts
 */

import prisma from '../prisma/client';

const ACTIVITY_LOG_RETENTION_DAYS = 60;  // hapus activity_logs > 60 hari
const NOTIFICATION_RETENTION_DAYS = 30;  // hapus notifications > 30 hari

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

/**
 * Hapus activity_logs yang lebih tua dari ACTIVITY_LOG_RETENTION_DAYS.
 * Return jumlah baris yang dihapus.
 */
export async function cleanActivityLogs(): Promise<number> {
  const cutoff = daysAgo(ACTIVITY_LOG_RETENTION_DAYS);
  const result = await prisma.activityLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  return result.count;
}

/**
 * Hapus notifications yang sudah dibaca dan lebih tua dari NOTIFICATION_RETENTION_DAYS.
 * Notifikasi yang belum dibaca dibiarkan agar user masih bisa melihatnya.
 */
export async function cleanNotifications(): Promise<number> {
  const cutoff = daysAgo(NOTIFICATION_RETENTION_DAYS);
  const result = await prisma.notification.deleteMany({
    where: { isRead: true, createdAt: { lt: cutoff } },
  });
  return result.count;
}

/**
 * Jalankan semua cleanup sekaligus.
 */
export async function runCleanup(): Promise<void> {
  try {
    const [logs, notifs] = await Promise.all([
      cleanActivityLogs(),
      cleanNotifications(),
    ]);
    console.log(`[cleanup] activity_logs dihapus: ${logs}, notifications dihapus: ${notifs}`);
  } catch (err) {
    console.error('[cleanup] Gagal menjalankan cleanup:', err);
  }
}

/**
 * Jadwalkan cleanup otomatis dengan interval tertentu.
 * Default: 1x per hari (24 jam).
 *
 * Panggil di src/index.ts:
 *   import { scheduleCleanup } from './utils/cleanup';
 *   scheduleCleanup();
 */
export function scheduleCleanup(intervalMs: number = 24 * 60 * 60 * 1000): void {
  // Guard: jangan jalankan cleanup otomatis di development
  // (ts-node-dev --respawn restart server tiap save file = cleanup kepanggil terus)
  if (process.env.NODE_ENV !== 'production') {
    console.log('[cleanup] Skipped — hanya aktif di production. Jalankan manual: npm run cleanup');
    return;
  }

  // Jalankan sekali saat server start (dengan delay 30 detik agar DB ready)
  setTimeout(() => {
    runCleanup();
  }, 30_000);

  // Kemudian jalankan berkala
  setInterval(() => {
    runCleanup();
  }, intervalMs);

  console.log(`[cleanup] Scheduled — interval ${intervalMs / 3_600_000}h, retention: logs=${ACTIVITY_LOG_RETENTION_DAYS}d, notifs=${NOTIFICATION_RETENTION_DAYS}d`);
}

// Bisa dijalankan langsung: ts-node src/utils/cleanup.ts
if (require.main === module) {
  runCleanup()
    .then(() => process.exit(0))
    .catch((e) => { console.error(e); process.exit(1); });
}
