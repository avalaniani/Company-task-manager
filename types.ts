
export type UserRole = 'PLATFORM_ADMIN' | 'SUPER_ADMIN' | 'EMPLOYEE' | 'WORKER';

export type TaskType = 'LOCKED' | 'FLOATING' | 'URGENT';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'BLOCKED';

export interface Company {
  id: string;
  name: string;
  logo: string;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
  password?: string; // Company access code/password
}

export interface User {
  id: string;
  companyId: string; // Links user to a specific company
  name: string;
  role: UserRole;
  avatar: string;
  efficiencyScore: number; // 0-100
  status: 'ONLINE' | 'IDLE' | 'OFFLINE';
  personalNotes?: string;
  username: string;
  password: string;
}

export interface Task {
  id: string;
  companyId: string; // Links task to a specific company
  assigneeId: string;
  title: string;
  type: TaskType;
  status: TaskStatus;
  estimatedMinutes: number;
  elapsedSeconds: number; // Net work time
  waitSeconds: number; // Total blocked/waiting time
  priority: number; // 1 (High) - 3 (Low)
  startTimeConstraint?: string; // For LOCKED tasks (HH:MM)
  dueTime?: string;
  blockedReason?: string; // Reason for blockage
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  companyId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // ISO String
  endTime?: string; // ISO String
  totalMinutes?: number;
  status: 'ACTIVE' | 'COMPLETED';
}
