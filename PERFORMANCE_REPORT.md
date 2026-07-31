# 📊 Laporan Analisa Performa — Task-flow

> Tanggal analisa: 1 Agustus 2026
> Codebase: `frontend/` (React 18 + Vite + Zustand) · `backend/` (Express + Prisma + PostgreSQL)

Laporan ini mendokumentasikan **temuan performa aktual** dari hasil membaca seluruh source code, mulai dari layer database hingga rendering UI. Setiap item mencatat kondisi saat ini, dampak, dan rekomendasi konkret beserta estimasi gain.

---

## Daftar Isi

1. [Database — Index yang Hilang](#1-database--index-yang-hilang)
2. [Backend — Membership Check Berulang Per Endpoint](#2-backend--membership-check-berulang-per-endpoint)
3. [Backend — `importTasks` Menggunakan N Transaction Terpisah](#3-backend--importtasks-menggunakan-n-transaction-terpisah)
4. [Backend — `invalidateProjectCache` Membuat Query DB Setiap Mutasi](#4-backend--invalidateprojectcache-membuat-query-db-setiap-mutasi)
5. [Backend — `getSprints` Mengambil Semua Tasks Tanpa Batas](#5-backend--getsprints-mengambil-semua-tasks-tanpa-batas)
6. [Frontend — `fetchProjects` Dipanggil Setiap Mount AppLayout](#6-frontend--fetchprojects-dipanggil-setiap-mount-applayout)
7. [Frontend — `TaskDetail` Double-Fetch dan Re-fetch Setelah Setiap Comment](#7-frontend--taskdetail-double-fetch-dan-re-fetch-setelah-setiap-comment)
8. [Frontend — KanbanColumn dan TaskCard Tidak Di-Memo](#8-frontend--kanbancolumn-dan-taskcard-tidak-di-memo)
9. [Frontend — `importTasks` Melakukan Full Re-fetch Setelah Import](#9-frontend--importtasks-melakukan-full-re-fetch-setelah-import)
10. [Frontend — Polling Notifikasi Tiap 60 Detik Bersamaan WebSocket](#10-frontend--polling-notifikasi-tiap-60-detik-bersamaan-websocket)
11. [Database — Tidak Ada Index pada `project_id` di Tabel `sprints`](#11-database--tidak-ada-index-pada-project_id-di-tabel-sprints)
12. [Ringkasan Prioritas](#ringkasan-prioritas)

---

## 1. Database — Index yang Hilang

### Kondisi Saat Ini

Migration SQL (`20260706142232_init/migration.sql`) hanya membuat Primary Key dan satu Unique Index (`project_members_project_id_user_id_key`). Tidak ada composite index tambahan meskipun ada beberapa kolom yang sangat sering dipakai sebagai filter query.

Kolom yang paling sering di-filter tanpa index:

| Tabel | Kolom | Dipakai di |
|---|---|---|
| `tasks` | `project_id` + `status` | `getTasks`, `getDashboard`, `groupBy done/overdue` |
| `tasks` | `project_id` + `due_date` + `status` | query overdue tasks di dashboard & project |
| `tasks` | `assignee_id` | filter `getTasks?assigneeId=...` |
| `tasks` | `sprint_id` | filter tasks per sprint |
| `activity_logs` | `task_id` + `created_at` | pagination activity log di `getTask` |
| `notifications` | `user_id` + `is_read` + `created_at` | `getNotifications`, cleanup |
| `projects` | `is_archived` + `owner_id` | list projects user |

### Dampak

PostgreSQL melakukan **sequential scan** pada tabel `tasks`, `activity_logs`, dan `notifications` untuk setiap request. Saat jumlah baris masih kecil (<1.000) dampaknya tidak terasa, tapi performa akan menurun eksponensial seiring pertumbuhan data.

### Rekomendasi

Buat migration baru dengan index berikut — tidak perlu mengubah kode aplikasi sama sekali:

```sql
-- tasks: query paling sering (getTasks, dashboard, groupBy)
CREATE INDEX idx_tasks_project_status     ON tasks (project_id, status);
CREATE INDEX idx_tasks_project_due_status ON tasks (project_id, due_date, status) WHERE status != 'DONE';
CREATE INDEX idx_tasks_assignee           ON tasks (assignee_id) WHERE assignee_id IS NOT NULL;
CREATE INDEX idx_tasks_sprint             ON tasks (sprint_id)   WHERE sprint_id IS NOT NULL;

-- activity_logs: pagination di getTask
CREATE INDEX idx_activity_logs_task_created ON activity_logs (task_id, created_at DESC);

-- notifications: getNotifications + cleanup
CREATE INDEX idx_notifications_user_read_created ON notifications (user_id, is_read, created_at DESC);
```

**Estimasi gain:** query `getTasks` dan `getDashboard` turun dari O(n) full scan → O(log n) index seek. Pada tabel 10.000 baris bisa menghemat **50–200 ms per query**.

---

## 2. Backend — Membership Check Berulang Per Endpoint

### Kondisi Saat Ini

Hampir setiap controller function melakukan query `prisma.projectMember.findUnique(...)` sendiri-sendiri untuk memverifikasi bahwa user adalah member project. Contoh di `task.controller.ts`:

```typescript
// getTasks, getTask, createTask, updateTask, deleteTask, reorderTasks
// masing-masing mulai dengan query yang sama:
const member = await prisma.projectMember.findUnique({
  where: { projectId_userId: { projectId, userId: req.user!.id } },
});
```

Setiap aksi pada task (buka detail → update → reorder) minimal memicu **2–3 query membership check** secara terpisah.

### Dampak

Setiap request ke `/api/projects/:projectId/tasks/*` menghabiskan 1 query DB hanya untuk cek izin, padahal hasilnya bisa di-share di level middleware.

### Rekomendasi

Buat satu middleware `requireProjectMember` yang menyimpan hasil check di `req.projectMember`. Controller cukup baca `req.projectMember` tanpa query ulang ke DB.

```typescript
// middlewares/projectAccess.middleware.ts — BARU
export const requireProjectMember = async (req: AuthRequest, res, next) => {
  const { projectId } = req.params;
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: req.user!.id } },
  });
  if (!member) return res.status(403).json({ error: 'Akses ditolak.' });
  req.projectMember = member; // tersedia di semua controller downstream
  next();
};
```

```typescript
// Sebelum: controller query sendiri (1 query ekstra per request)
const member = await prisma.projectMember.findUnique({ ... });

// Sesudah: baca dari req (0 query ekstra)
const member = req.projectMember;
```

**Estimasi gain:** mengurangi **1 query DB per request** pada semua endpoint project/task/sprint. Pada 1.000 request/hari menghemat ~1.000 query tidak perlu.

---

## 3. Backend — `importTasks` Menggunakan N Transaction Terpisah

### Kondisi Saat Ini

Di `task.controller.ts`, fungsi `importTasks` membuat task satu per satu dalam sebuah `$transaction`:

```typescript
// Sebelum: N query INSERT dalam 1 transaction
const createdTasks = await prisma.$transaction(
  tasksToCreate.map((taskData) => prisma.task.create({ data: taskData }))
);
```

Untuk impor 50 task = **50 round-trip query** ke database dalam satu transaksi.

### Dampak

Impor 50 task saat ini ≈ 50 INSERT + 1 `createMany` untuk activity logs = ~51 query. Semakin banyak task yang diimpor, semakin lama waktu yang dibutuhkan.

### Rekomendasi

Gunakan `prisma.task.createMany()` untuk insert batch sekaligus:

```typescript
// Sesudah: 1 query INSERT untuk semua task
await prisma.task.createMany({ data: tasksToCreate });
// Lalu 1 findMany untuk ambil ID yang baru dibuat, jika perlu untuk activity logs
```

**Estimasi gain:** impor 50 task turun dari **~51 query → 2 query** (createMany tasks + createMany activity logs).

---

## 4. Backend — `invalidateProjectCache` Membuat Query DB Setiap Mutasi

### Kondisi Saat Ini

Di `backend/src/utils/cache.ts`, fungsi `invalidateProjectCache` melakukan query ke DB setiap kali dipanggil:

```typescript
// Sebelum: query DB hanya untuk tahu siapa yang perlu di-invalidate
export const invalidateProjectCache = async (projectId: string) => {
  const members = await prisma.projectMember.findMany({
    where: { projectId },
    select: { userId: true },
  });
  members.forEach(m => {
    cacheService.del(`dashboard_${m.userId}`);
    cacheService.del(`projects_${m.userId}`);
    cacheService.del(`project_${projectId}_${m.userId}`);
  });
};
```

Fungsi ini dipanggil pada **setiap create/update/delete task dan project** — artinya setiap mutasi membutuhkan 1 query DB ekstra hanya untuk tahu siapa yang cache-nya perlu dihapus.

### Rekomendasi

Ubah strategi cache key agar invalidation bisa dilakukan berbasis `projectId` saja, tanpa perlu fetch member list dari DB. `cacheService.delByPrefix()` sudah tersedia di `cache.ts`:

```typescript
// Sesudah: 0 query DB, pakai prefix-based invalidation
export const invalidateProjectCache = (projectId: string): void => {
  cacheService.delByPrefix(`project_${projectId}`);
  // Untuk dashboard, karena key-nya berbasis userId, opsinya:
  // a) flush semua dashboard cache (sederhana tapi agresif)
  cacheService.delByPrefix(`dashboard_`);
  // b) atau simpan mapping projectId → [userId] di memory saat addMember/removeMember
};
```

**Estimasi gain:** menghilangkan **1 query DB ekstra** dari setiap operasi mutasi task dan project.

---

## 5. Backend — `getSprints` Mengambil Semua Tasks Tanpa Batas

### Kondisi Saat Ini

Di `sprint.controller.ts`, endpoint `GET /projects/:projectId/sprints` mengambil semua task beserta assignee-nya untuk setiap sprint tanpa pagination:

```typescript
// Sebelum: include tasks tanpa take/skip
const sprints = await prisma.sprint.findMany({
  where: { projectId },
  include: {
    tasks: {
      include: { assignee: { select: { id, name, email, avatarUrl } } },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      // tidak ada take / skip
    },
  },
});
```

Untuk project dengan sprint yang memiliki 200+ task, response bisa menjadi sangat besar.

### Rekomendasi

Tambahkan batas pada include tasks, atau pisahkan endpoint:

```typescript
// Sesudah opsi A: batasi jumlah task yang dikembalikan
tasks: {
  include: { assignee: { select: {...} } },
  orderBy: [...],
  take: 100, // tambahkan batas
},

// Sesudah opsi B (lebih baik): kembalikan hanya summary sprint,
// buat endpoint GET /sprints/:sprintId/tasks untuk task detail per sprint
```

**Estimasi gain:** response size turun dari potensial **500KB+ → <50KB** per response untuk sprint yang padat.

---

## 6. Frontend — `fetchProjects` Dipanggil Setiap Mount `AppLayout`

### Kondisi Saat Ini

Di `frontend/src/components/layout/AppLayout.tsx`:

```typescript
// Sebelum: fetch setiap kali AppLayout mount
useEffect(() => {
  if (token) {
    fetchNotifications();
    fetchProjects(); // tidak ada pengecekan apakah data masih fresh
  }
}, [token, fetchNotifications, fetchProjects]);
```

`AppLayout` adalah wrapper untuk semua halaman protected. Setiap navigasi yang melibatkan unmount/remount komponen ini akan memicu `fetchProjects` ulang, meskipun data baru saja diambil beberapa detik lalu.

### Rekomendasi

Tambahkan `lastFetchedAt` di `project.store.ts` dan skip fetch jika data masih fresh:

```typescript
// project.store.ts — Sesudah: skip fetch jika data belum stale
fetchProjects: async () => {
  const STALE_AFTER = 5 * 60 * 1000; // 5 menit
  if (get().lastFetchedAt && Date.now() - get().lastFetchedAt < STALE_AFTER) return;
  // ... lanjut fetch seperti biasa
  set({ projects: data, lastFetchedAt: Date.now() });
}
```

**Estimasi gain:** mengurangi request API yang tidak perlu saat user navigasi antar halaman, terutama terasa pada koneksi lambat atau server cold start.

---

## 7. Frontend — `TaskDetail` Double-Fetch dan Re-fetch Setelah Setiap Comment

### Kondisi Saat Ini

Di `frontend/src/components/tasks/TaskDetail.tsx` terjadi tiga pola fetch berlebih:

```typescript
// Pola 1: fetch saat mount meskipun task sudah ada di store
useEffect(() => {
  fetchTask(projectId, task.id); // double-fetch
}, [task.id, projectId, fetchTask]);

// Pola 2 & 3: re-fetch full task object setelah setiap aksi comment
const submitComment = async () => {
  await taskService.addComment(projectId, task.id, comment.trim());
  await fetchTask(projectId, task.id); // re-fetch padahal hanya comment yang berubah
};

const removeComment = async (commentId: string) => {
  await taskService.deleteComment(projectId, task.id, commentId);
  await fetchTask(projectId, task.id); // re-fetch lagi
};
```

### Dampak

Setiap aksi comment = **2 request** (mutation + full task GET). User juga melihat loading flicker saat panel komentar di-refresh.

### Rekomendasi

```typescript
// Sesudah pola 1: hanya fetch jika task belum ada di store
useEffect(() => {
  if (currentTask?.id !== task.id) {
    fetchTask(projectId, task.id);
  }
}, [task.id]);

// Sesudah pola 2: optimistic update, tidak perlu re-fetch
const submitComment = async () => {
  const newComment = await taskService.addComment(projectId, task.id, comment.trim());
  // update state lokal langsung
  updateCurrentTaskComments([...comments, newComment]);
};

// Sesudah pola 3: hapus dari state lokal
const removeComment = async (commentId: string) => {
  await taskService.deleteComment(projectId, task.id, commentId);
  updateCurrentTaskComments(comments.filter(c => c.id !== commentId));
};
```

**Estimasi gain:** dari **2 request per comment action → 1 request**, hilangnya loading flicker, dan respons UI yang terasa instan.

---

## 8. Frontend — KanbanColumn dan TaskCard Tidak Di-Memo

### Kondisi Saat Ini

Di `KanbanBoard.tsx`, setiap event `onDragOver` memanggil `updateTaskLocal()` yang mengubah array `tasks` di Zustand store. Karena `KanbanColumn` dan `TaskCard` tidak dibungkus `React.memo`, semua kolom dan semua card ikut re-render:

```typescript
// Sebelum: tidak ada memo
export const KanbanColumn = ({ status, tasks, onTaskClick, onAddTask }) => { ... };
export const TaskCard = ({ task, onClick }) => { ... };
```

Pada board 6 kolom × 20 task = **120 komponen re-render** per `onDragOver` event, yang bisa terjadi puluhan kali per detik saat drag berlangsung.

### Rekomendasi

```typescript
// Sesudah: tambahkan React.memo
export const KanbanColumn = React.memo(({ status, tasks, onTaskClick, onAddTask }) => {
  // ...
});

export const TaskCard = React.memo(({ task, onClick }) => {
  // ...
});
```

`tasksByStatus` di `KanbanBoard` sudah menggunakan `useMemo` — dengan `React.memo` pada child components, hanya kolom yang task-nya benar-benar berubah yang akan re-render.

**Estimasi gain:** re-render saat drag turun dari **120 renders → 6–10 renders** per drag event. Pergerakan drag menjadi lebih smooth terutama di device low-end atau board dengan banyak task.

---

## 9. Frontend — `importTasks` Melakukan Full Re-fetch Setelah Import

### Kondisi Saat Ini

Di `task.store.ts`:

```typescript
// Sebelum: fetch ulang semua task setelah bulk import
importTasks: async (projectId, tasks) => {
  const count = await taskService.importBulk(projectId, tasks);
  const updatedTasks = await taskService.getAll(projectId); // tidak perlu
  set({ tasks: updatedTasks });
  return count;
},
```

Setelah import selesai, store melakukan `getAll` yang mengambil ulang semua task project, padahal server sudah tahu persis task apa yang baru dibuat.

### Rekomendasi

```typescript
// Backend: kembalikan tasks yang baru dibuat
res.status(201).json({ success: true, count: createdTasks.length, data: createdTasks });

// Frontend: append ke state tanpa re-fetch
importTasks: async (projectId, tasks) => {
  const { count, newTasks } = await taskService.importBulk(projectId, tasks);
  set(s => ({ tasks: [...s.tasks, ...newTasks] }));
  return count;
},
```

**Estimasi gain:** menghilangkan **1 GET /tasks request** setelah setiap operasi import.

---

## 10. Frontend — Polling Notifikasi Tiap 60 Detik Bersamaan WebSocket

### Kondisi Saat Ini

Di `AppLayout.tsx`, dua mekanisme notifikasi berjalan bersamaan:

```typescript
// Mekanisme 1: HTTP polling setiap 60 detik
const interval = setInterval(fetchNotifications, 60_000);

// Mekanisme 2: WebSocket realtime (sudah ada)
socket.on('new-notification', handleNewNotification);
```

Notifikasi baru sudah diterima via WebSocket secara real-time. Polling `setInterval` menjadi redundan.

### Rekomendasi

Matikan interval polling. Pastikan server menyertakan `unreadCount` terbaru di dalam payload event WebSocket `new-notification`:

```typescript
// Backend: sertakan unreadCount di payload notifikasi
io.to(`user:${userId}`).emit('new-notification', { ...notif, unreadCount });

// Frontend: hapus setInterval, cukup update count dari payload WebSocket
socket.on('new-notification', (notif) => {
  addNotification(notif);
  setUnreadCount(notif.unreadCount);
});
// Fallback: fetch sekali saat WebSocket reconnect
socket.on('connect', fetchNotifications);
```

**Estimasi gain:** mengurangi **1 HTTP request per menit per user aktif**. Pada 100 user aktif = 100 request/menit yang bisa dihilangkan sepenuhnya.

---

## 11. Database — Tidak Ada Index pada `project_id` di Tabel `sprints`

### Kondisi Saat Ini

Query `getSprints` selalu filter berdasarkan `projectId`, namun kolom `project_id` di tabel `sprints` tidak memiliki index (hanya FK constraint, bukan index eksplisit di PostgreSQL).

### Rekomendasi

```sql
-- Tambahkan di migration baru
CREATE INDEX idx_sprints_project_id ON sprints (project_id);
```

**Estimasi gain:** query `getSprints` turun dari sequential scan → index seek, khususnya saat jumlah sprint bertambah banyak lintas project.

---

## Ringkasan Prioritas

| # | Area | Kondisi Saat Ini | Target Setelah Update | Prioritas |
|---|------|------|---------|-----------|
| 1 | DB Index `tasks` | Sequential scan setiap query | Index seek O(log n) | 🔴 Tinggi |
| 2 | Membership check middleware | 1 query DB per endpoint | 0 query ekstra (baca dari `req`) | 🔴 Tinggi |
| 3 | `importTasks` N transaction | ~51 query untuk 50 task | 2 query (batch insert) | 🟡 Sedang |
| 4 | `invalidateProjectCache` | 1 query DB per mutasi | 0 query (prefix-based) | 🟡 Sedang |
| 5 | `getSprints` unbounded | Semua task per sprint, tak terbatas | Dibatasi / dipaginasi | 🟡 Sedang |
| 6 | `fetchProjects` tiap mount | Re-fetch setiap navigasi | Skip jika data masih fresh (<5 menit) | 🟡 Sedang |
| 7 | `TaskDetail` double-fetch + re-fetch comment | 2 request per comment action | 1 request + optimistic update | 🟡 Sedang |
| 8 | KanbanColumn/TaskCard tanpa memo | 120 re-render per drag event | 6–10 re-render per drag event | 🟢 Rendah |
| 9 | `importTasks` full re-fetch | GET all tasks setelah import | Append dari response server | 🟢 Rendah |
| 10 | Polling + WebSocket bersamaan | 1 HTTP poll/menit per user | Hilang, digantikan WebSocket event | 🟢 Rendah |
| 11 | DB Index `sprints` | Sequential scan | Index seek | 🟢 Rendah |

### Urutan Implementasi yang Disarankan

1. **Mulai dari item #1 dan #11** — tambah database index via migration baru. Tidak ada perubahan kode aplikasi, risiko paling rendah, gain paling cepat dirasakan.
2. **Lanjut ke item #2** — buat middleware `requireProjectMember`, refactor semua controller yang bersangkutan.
3. **Item #3 dan #4** — optimasi `importTasks` dan `invalidateProjectCache`, masing-masing perubahan terisolasi dan mudah di-test.
4. **Item #5, #6, #7** — optimasi query dan fetch pattern di frontend/backend, perlu lebih banyak pengujian manual di UI.
5. **Item #8, #9, #10** — polish terakhir, dampak terasa tapi tidak kritikal untuk fungsionalitas.
