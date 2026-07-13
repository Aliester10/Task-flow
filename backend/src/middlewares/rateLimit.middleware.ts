import rateLimit from 'express-rate-limit';

/**
 * Rate limiter untuk endpoint auth (login & register).
 * Maks 10 percobaan per IP per 15 menit.
 *
 * Kenapa penting di Supabase Free Tier:
 * Tiap login attempt = 1 query ke tabel users (bcrypt compare).
 * Tanpa rate limit, bot bisa nguras jatah koneksi DB sebelum
 * brute force-nya sendiri selesai.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 10,                   // maks 10 percobaan per IP per window
  message: {
    success: false,
    error: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.',
  },
  standardHeaders: true,  // kirim RateLimit-* headers (RFC 6585)
  legacyHeaders: false,   // matikan X-RateLimit-* headers lama
  // Skip rate limit di development agar tidak ganggu saat testing
  skip: () => process.env.NODE_ENV === 'development',
});

/**
 * Rate limiter umum untuk semua /api/* routes.
 *
 * Max 300 request per menit per IP.
 * Kenapa 300 dan bukan lebih kecil:
 * - Tiap drag-drop di Kanban = 1 PATCH /reorder request
 * - User bisa drag beberapa task berturut-turut dengan cepat
 * - Dashboard + kanban board bisa trigger 5–10 request sekaligus saat load
 * - 300/menit = ~5 request/detik — cukup untuk pemakaian normal,
 *   tapi tetap ngehambat bot atau scraper yang kirim ratusan request/detik
 *
 * Socket.IO TIDAK tercover di sini — handshake Socket.IO berjalan di
 * /socket.io/* yang dikelola langsung oleh http.Server, bukan Express router.
 * Middleware Express hanya berlaku untuk request yang masuk ke app Express.
 */
export const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 menit
  max: 300,                  // maks 300 request per IP per menit
  message: {
    success: false,
    error: 'Terlalu banyak request. Coba lagi sebentar lagi.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'development',
});
