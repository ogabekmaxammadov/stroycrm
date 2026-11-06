export type UserRole = 'director' | 'executor';

export type TaskStatus = 'new' | 'in_progress' | 'under_review' | 'accepted' | 'rework';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  avatar_url?: string;
  created_at?: string;
}

export interface ConstructionObject {
  id: string;
  name: string;
  address: string;
  description?: string;
  created_by?: string;
  created_at: string;
  updated_at?: string;
  // Computed / joined fields
  tasks_count?: number;
  completed_tasks_count?: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  object_id: string;
  executor_id: string;
  author_id: string;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
  // Joins
  object?: ConstructionObject;
  executor?: UserProfile;
  author?: UserProfile;
}

export interface TaskHistoryItem {
  id: string;
  task_id: string;
  user_id: string;
  old_status: TaskStatus | null;
  new_status: TaskStatus;
  comment: string | null;
  created_at: string;
  user?: UserProfile;
}

export interface StatusMeta {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  description: string;
}

export const TASK_STATUS_META: Record<TaskStatus, StatusMeta> = {
  new: {
    label: 'Новая',
    color: '#3B82F6',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    description: 'Задача создана руководителем и ожидает начала выполнения',
  },
  in_progress: {
    label: 'В работе',
    color: '#EAB308',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-800',
    description: 'Исполнитель приступил к выполнению задачи',
  },
  under_review: {
    label: 'На проверке',
    color: '#8B5CF6',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-700',
    description: 'Исполнитель завершил работу и отправил задачу руководителю',
  },
  accepted: {
    label: 'Принята',
    color: '#10B981',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-700',
    description: 'Руководитель проверил и утвердил результат',
  },
  rework: {
    label: 'На доработке',
    color: '#EF4444',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    textColor: 'text-rose-700',
    description: 'Руководитель вернул задачу с замечаниями для исправления',
  },
};

export interface AllowedTransition {
  from: TaskStatus;
  to: TaskStatus;
  allowedRole: UserRole;
  requiresComment: boolean;
  actionLabel: string;
  buttonVariant: 'primary' | 'success' | 'danger' | 'warning';
}

export const ALLOWED_TRANSITIONS: AllowedTransition[] = [
  {
    from: 'new',
    to: 'in_progress',
    allowedRole: 'executor',
    requiresComment: false,
    actionLabel: 'Взять в работу',
    buttonVariant: 'primary',
  },
  {
    from: 'in_progress',
    to: 'under_review',
    allowedRole: 'executor',
    requiresComment: false,
    actionLabel: 'Отправить на проверку',
    buttonVariant: 'primary',
  },
  {
    from: 'under_review',
    to: 'accepted',
    allowedRole: 'director',
    requiresComment: false,
    actionLabel: 'Принять задачу',
    buttonVariant: 'success',
  },
  {
    from: 'under_review',
    to: 'rework',
    allowedRole: 'director',
    requiresComment: true,
    actionLabel: 'Вернуть на доработку',
    buttonVariant: 'danger',
  },
  {
    from: 'rework',
    to: 'in_progress',
    allowedRole: 'executor',
    requiresComment: false,
    actionLabel: 'Возобновить работу',
    buttonVariant: 'primary',
  },
];
