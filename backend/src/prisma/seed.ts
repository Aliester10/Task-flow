import { PrismaClient, TaskStatus, Priority, MemberRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean up previous demo data
  await prisma.activityLog.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.sprint.deleteMany({});
  await prisma.projectMember.deleteMany({});
  await prisma.project.deleteMany({});

  // Create demo users
  const hashedPassword = await bcrypt.hash('password123', 10);

  const owner = await prisma.user.upsert({
    where: { email: 'owner@taskflow.com' },
    update: {},
    create: {
      name: 'Budi Santoso',
      email: 'owner@taskflow.com',
      password: hashedPassword,
    },
  });

  const member1 = await prisma.user.upsert({
    where: { email: 'member1@taskflow.com' },
    update: {},
    create: {
      name: 'Siti Rahayu',
      email: 'member1@taskflow.com',
      password: hashedPassword,
    },
  });

  const member2 = await prisma.user.upsert({
    where: { email: 'member2@taskflow.com' },
    update: {},
    create: {
      name: 'Andi Wijaya',
      email: 'member2@taskflow.com',
      password: hashedPassword,
    },
  });

  const member3 = await prisma.user.upsert({
    where: { email: 'member3@taskflow.com' },
    update: {},
    create: {
      name: 'Joko Anwar',
      email: 'member3@taskflow.com',
      password: hashedPassword,
    },
  });

  const users = [owner, member1, member2, member3];

  // Create Projects
  const projectsData = [
    { id: 'proj-1', name: 'Website Redesign', description: 'Redesign company website with neobrutalism' },
    { id: 'proj-2', name: 'Mobile App', description: 'Task management mobile app' },
    { id: 'proj-3', name: 'Marketing Campaign', description: 'Q3 Product launch marketing' },
    { id: 'proj-4', name: 'API Migration', description: 'Migrate legacy APIs to GraphQL' },
  ];

  const projects = [];
  for (const pd of projectsData) {
    const p = await prisma.project.create({
      data: {
        id: pd.id,
        name: pd.name,
        description: pd.description,
        ownerId: owner.id,
        startDate: new Date('2026-07-01'),
        endDate: new Date('2026-08-31'),
      },
    });
    projects.push(p);

    // Add members
    for (const u of users) {
      await prisma.projectMember.create({
        data: { projectId: p.id, userId: u.id, role: u.id === owner.id ? MemberRole.OWNER : MemberRole.MEMBER },
      });
    }
  }

  // Create Sprints
  const sprints = [];
  for (const p of projects) {
    const s = await prisma.sprint.create({
      data: {
        projectId: p.id,
        name: `Sprint 1 - ${p.name}`,
        goal: `Initial milestone for ${p.name}`,
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days ahead
        status: 'ACTIVE',
      },
    });
    sprints.push(s);
  }

  // Helper dates
  const today = new Date();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Generate a lot of tasks
  const tasksData: any[] = [];
  let taskCount = 1;

  const getStatus = () => {
    const r = Math.random();
    if (r < 0.1) return TaskStatus.BACKLOG;
    if (r < 0.3) return TaskStatus.TODO;
    if (r < 0.6) return TaskStatus.IN_PROGRESS;
    if (r < 0.8) return TaskStatus.REVIEW;
    return TaskStatus.DONE;
  };

  const getPriority = () => {
    const r = Math.random();
    if (r < 0.2) return Priority.LOW;
    if (r < 0.6) return Priority.MEDIUM;
    if (r < 0.9) return Priority.HIGH;
    return Priority.URGENT;
  };

  const getDueDate = (status: TaskStatus) => {
    const r = Math.random();
    if (status === TaskStatus.DONE) return lastWeek;
    if (r < 0.2) return yesterday; // Overdue
    if (r < 0.5) return tomorrow;  // Soon
    if (r < 0.8) return nextWeek;  // Later
    return null;                   // No due date
  };

  for (let i = 0; i < projects.length; i++) {
    const p = projects[i];
    const s = sprints[i];
    
    // Generate 10-25 tasks per project
    const numTasks = Math.floor(Math.random() * 16) + 10;
    
    for (let j = 0; j < numTasks; j++) {
      const status = getStatus();
      tasksData.push({
        title: `Task ${taskCount++} for ${p.name}`,
        description: 'Detailed description for this task...',
        status,
        priority: getPriority(),
        projectId: p.id,
        sprintId: Math.random() > 0.3 ? s.id : null,
        assigneeId: users[Math.floor(Math.random() * users.length)].id,
        dueDate: getDueDate(status),
        labels: ['frontend', 'backend', 'design', 'bug'].sort(() => 0.5 - Math.random()).slice(0, 2),
      });
    }
  }

  // Insert tasks and generate activity logs
  for (const td of tasksData) {
    const t = await prisma.task.create({ data: td });
    
    // Random activity logs for some tasks
    if (Math.random() > 0.5) {
      await prisma.activityLog.create({
        data: {
          taskId: t.id,
          userId: td.assigneeId,
          action: 'created',
          createdAt: new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000)
        }
      });
      
      if (t.status !== 'TODO' && t.status !== 'BACKLOG') {
        await prisma.activityLog.create({
          data: {
            taskId: t.id,
            userId: td.assigneeId,
            action: 'status_changed',
            oldValue: 'TODO',
            newValue: t.status,
            createdAt: new Date(Date.now() - Math.random() * 2 * 24 * 60 * 60 * 1000)
          }
        });
      }
    }
  }

  console.log(`✅ Seeded ${projects.length} projects, ${sprints.length} sprints, and ${tasksData.length} tasks!`);
  console.log('📧 Demo accounts:');
  console.log('   owner@taskflow.com / password123');
  console.log('   member1@taskflow.com / password123');
  console.log('   member2@taskflow.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
