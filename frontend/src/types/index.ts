export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  createdAt: string;
}

export type MemberRole = 'OWNER' | 'MEMBER';
export type TaskStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' | 'BLOCKED';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type SprintStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED';

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: MemberRole;
  joinedAt: string;
  user: User;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  ownerId: string;
  owner: User;
  startDate?: string | null;
  endDate?: string | null;
  isArchived: boolean;
  createdAt: string;
  members: ProjectMember[];
  progress?: number;
  totalTasks?: number;
  doneTasks?: number;
  overdueTasks?: number;
  _count?: { tasks: number; members?: number };
}

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  goal?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status: SprintStatus;
  createdAt: string;
  tasks?: Task[];
  totalTasks?: number;
  doneTasks?: number;
  burndown?: number;
}

export interface Task {
  id: string;
  projectId: string;
  sprintId?: string | null;
  sprint?: Sprint | null;
  title: string;
  description?: string | null;
  assigneeId?: string | null;
  assignee?: User | null;
  status: TaskStatus;
  priority: Priority;
  dueDate?: string | null;
  labels: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
  comments?: Comment[];
  activityLogs?: ActivityLog[];
  _count?: { comments: number };
}

export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  user: User;
  content: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  taskId: string;
  userId: string;
  user: User;
  action: string;
  oldValue?: string | null;
  newValue?: string | null;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  type: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface DashboardData {
  stats: { totalTasks: number; inProgressTasks: number; overdueTasks: number; doneTasks: number; activeProjects: number };
  kanbanTasks: {
    TODO: Task[];
    IN_PROGRESS: Task[];
    BLOCKED: Task[];
    REVIEW: Task[];
    DONE: Task[];
  };
  activeSprint: Sprint | null;
  upcomingTasks: Task[];
  projects: Project[];
  activities: (ActivityLog & { task: Task })[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
