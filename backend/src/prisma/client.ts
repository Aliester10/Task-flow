import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Di development: gunakan event emitter untuk slow query logging
// Di production: log error saja, jangan spam console dengan query log
const prismaClientOptions =
  process.env.NODE_ENV !== 'production'
    ? { log: [{ emit: 'event' as const, level: 'query' as const }, 'error' as const, 'warn' as const] }
    : { log: ['error' as const] };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(prismaClientOptions);

// Slow query logger — hanya aktif di development
// Log query yang lebih dari 200ms biar gampang ketahuan mana yang perlu dioptimasi
if (process.env.NODE_ENV !== 'production') {
  (prisma as any).$on('query', (e: { duration: number; query: string }) => {
    if (e.duration > 200) {
      console.warn(`[SLOW QUERY] ${e.duration}ms → ${e.query.slice(0, 120)}...`);
    }
  });
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
