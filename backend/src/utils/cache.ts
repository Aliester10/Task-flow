import NodeCache from 'node-cache';

// TTL default 5 menit (300 detik)
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

export const cacheService = {
  get: <T>(key: string): T | undefined => {
    return cache.get<T>(key);
  },

  set: <T>(key: string, value: T, ttlSeconds: number = 300): boolean => {
    return cache.set(key, value, ttlSeconds);
  },

  del: (key: string): number => {
    return cache.del(key);
  },

  /**
   * Menghapus cache berdasarkan prefix (awalan key)
   */
  delByPrefix: (prefix: string): void => {
    const keys = cache.keys();
    const keysToDelete = keys.filter((k) => k.startsWith(prefix));
    if (keysToDelete.length > 0) {
      cache.del(keysToDelete);
    }
  },

  /**
   * Membersihkan semua isi cache
   */
  flush: (): void => {
    cache.flushAll();
  }
};

// Helper functions for common cache invalidations
export const invalidateUserCache = (userId: string) => {
  cacheService.del(`dashboard_${userId}`);
  cacheService.del(`projects_${userId}`);
};

export const invalidateProjectCache = async (projectId: string) => {
  try {
    cacheService.delByPrefix(`project_${projectId}`);
    cacheService.delByPrefix(`dashboard_`);
    cacheService.delByPrefix(`projects_`);
  } catch (err) {
    console.error('Failed to invalidate project cache', err);
  }
};
