import { getSupabaseClient } from '../lib/supabase';
import {
  ConstructionObject,
  Task,
  TaskHistoryItem,
  TaskStatus,
  UserProfile,
  ALLOWED_TRANSITIONS,
} from '../types';
import {
  INITIAL_OBJECTS,
  INITIAL_PROFILES,
  INITIAL_TASKS,
  INITIAL_HISTORY,
} from '../lib/mockData';

const STORAGE_KEY_LOCAL_OBJECTS = 'stroycrm_local_objects';
const STORAGE_KEY_LOCAL_TASKS = 'stroycrm_local_tasks';
const STORAGE_KEY_LOCAL_HISTORY = 'stroycrm_local_history';
const STORAGE_KEY_LOCAL_PROFILES = 'stroycrm_local_profiles';

// Local storage helpers
function getLocalObjects(): ConstructionObject[] {
  if (typeof window === 'undefined') return INITIAL_OBJECTS;
  const raw = localStorage.getItem(STORAGE_KEY_LOCAL_OBJECTS);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY_LOCAL_OBJECTS, JSON.stringify(INITIAL_OBJECTS));
    return INITIAL_OBJECTS;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return INITIAL_OBJECTS;
  }
}

function setLocalObjects(data: ConstructionObject[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_LOCAL_OBJECTS, JSON.stringify(data));
  }
}

function getLocalTasks(): Task[] {
  if (typeof window === 'undefined') return INITIAL_TASKS;
  const raw = localStorage.getItem(STORAGE_KEY_LOCAL_TASKS);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY_LOCAL_TASKS, JSON.stringify(INITIAL_TASKS));
    return INITIAL_TASKS;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return INITIAL_TASKS;
  }
}

function setLocalTasks(data: Task[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_LOCAL_TASKS, JSON.stringify(data));
  }
}

function getLocalHistory(): TaskHistoryItem[] {
  if (typeof window === 'undefined') return INITIAL_HISTORY;
  const raw = localStorage.getItem(STORAGE_KEY_LOCAL_HISTORY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY_LOCAL_HISTORY, JSON.stringify(INITIAL_HISTORY));
    return INITIAL_HISTORY;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return INITIAL_HISTORY;
  }
}

function setLocalHistory(data: TaskHistoryItem[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_LOCAL_HISTORY, JSON.stringify(data));
  }
}

function getLocalProfiles(): UserProfile[] {
  if (typeof window === 'undefined') return INITIAL_PROFILES;
  const raw = localStorage.getItem(STORAGE_KEY_LOCAL_PROFILES);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY_LOCAL_PROFILES, JSON.stringify(INITIAL_PROFILES));
    return INITIAL_PROFILES;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return INITIAL_PROFILES;
  }
}

export function resetDemoData() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_LOCAL_OBJECTS);
    localStorage.removeItem(STORAGE_KEY_LOCAL_TASKS);
    localStorage.removeItem(STORAGE_KEY_LOCAL_HISTORY);
    localStorage.removeItem(STORAGE_KEY_LOCAL_PROFILES);
    localStorage.setItem(STORAGE_KEY_LOCAL_OBJECTS, JSON.stringify(INITIAL_OBJECTS));
    localStorage.setItem(STORAGE_KEY_LOCAL_TASKS, JSON.stringify(INITIAL_TASKS));
    localStorage.setItem(STORAGE_KEY_LOCAL_HISTORY, JSON.stringify(INITIAL_HISTORY));
    localStorage.setItem(STORAGE_KEY_LOCAL_PROFILES, JSON.stringify(INITIAL_PROFILES));
  }
}

export const dataService = {
  // PROFILES
  async getProfiles(): Promise<UserProfile[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('profiles').select('*').order('full_name');
        if (!error && data && data.length > 0) return data as UserProfile[];
      } catch (err) {
        console.warn('Falling back to local profiles:', err);
      }
    }
    return getLocalProfiles();
  },

  async getExecutors(): Promise<UserProfile[]> {
    const profiles = await this.getProfiles();
    return profiles.filter((p) => p.role === 'executor');
  },

  // OBJECTS
  async getObjects(): Promise<ConstructionObject[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('objects')
          .select('*, tasks:tasks(id, status)')
          .order('created_at', { ascending: false });

        if (!error && data) {
          return data.map((obj: any) => {
            const tasksList = obj.tasks || [];
            return {
              id: obj.id,
              name: obj.name,
              address: obj.address,
              description: obj.description,
              created_by: obj.created_by,
              created_at: obj.created_at,
              updated_at: obj.updated_at,
              tasks_count: tasksList.length,
              completed_tasks_count: tasksList.filter((t: any) => t.status === 'accepted').length,
            };
          });
        }
      } catch (err) {
        console.warn('Falling back to local objects:', err);
      }
    }

    // Local fallback
    const objects = getLocalObjects();
    const tasks = getLocalTasks();
    return objects.map((obj) => {
      const objTasks = tasks.filter((t) => t.object_id === obj.id);
      return {
        ...obj,
        tasks_count: objTasks.length,
        completed_tasks_count: objTasks.filter((t) => t.status === 'accepted').length,
      };
    });
  },

  async createObject(obj: { name: string; address: string; description?: string }, authorId: string): Promise<ConstructionObject> {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('objects')
        .insert({
          name: obj.name.trim(),
          address: obj.address.trim(),
          description: obj.description?.trim() || null,
          created_by: authorId,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }

    // Local
    const newObj: ConstructionObject = {
      id: 'obj-' + Date.now(),
      name: obj.name.trim(),
      address: obj.address.trim(),
      description: obj.description?.trim() || '',
      created_by: authorId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tasks_count: 0,
      completed_tasks_count: 0,
    };
    const current = getLocalObjects();
    setLocalObjects([newObj, ...current]);
    return newObj;
  },

  async updateObject(id: string, updates: { name: string; address: string; description?: string }): Promise<void> {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase
        .from('objects')
        .update({
          name: updates.name.trim(),
          address: updates.address.trim(),
          description: updates.description?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw new Error(error.message);
      return;
    }

    const current = getLocalObjects();
    const index = current.findIndex((o) => o.id === id);
    if (index !== -1) {
      current[index] = {
        ...current[index],
        name: updates.name.trim(),
        address: updates.address.trim(),
        description: updates.description?.trim(),
        updated_at: new Date().toISOString(),
      };
      setLocalObjects([...current]);
    }
  },

  async deleteObject(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase.from('objects').delete().eq('id', id);
      if (error) throw new Error(error.message);
      return;
    }

    const objects = getLocalObjects().filter((o) => o.id !== id);
    setLocalObjects(objects);
    // Cascade delete local tasks
    const tasks = getLocalTasks().filter((t) => t.object_id !== id);
    setLocalTasks(tasks);
  },

  // TASKS
  async getTasks(filter?: { objectId?: string; executorId?: string; status?: TaskStatus }): Promise<Task[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        let query = supabase
          .from('tasks')
          .select(`
            *,
            object:objects(id, name, address),
            executor:profiles!tasks_executor_id_fkey(id, email, full_name, role),
            author:profiles!tasks_author_id_fkey(id, email, full_name, role)
          `)
          .order('created_at', { ascending: false });

        if (filter?.objectId) query = query.eq('object_id', filter.objectId);
        if (filter?.executorId) query = query.eq('executor_id', filter.executorId);
        if (filter?.status) query = query.eq('status', filter.status);

        const { data, error } = await query;
        if (!error && data) return data as Task[];
      } catch (err) {
        console.warn('Falling back to local tasks:', err);
      }
    }

    // Local
    let list = getLocalTasks();
    const objects = getLocalObjects();
    const profiles = getLocalProfiles();

    if (filter?.objectId) {
      list = list.filter((t) => t.object_id === filter.objectId);
    }
    if (filter?.executorId) {
      list = list.filter((t) => t.executor_id === filter.executorId);
    }
    if (filter?.status) {
      list = list.filter((t) => t.status === filter.status);
    }

    // Enrich with joins
    return list.map((t) => ({
      ...t,
      object: objects.find((o) => o.id === t.object_id),
      executor: profiles.find((p) => p.id === t.executor_id),
      author: profiles.find((p) => p.id === t.author_id),
    }));
  },

  async createTask(task: {
    title: string;
    description: string;
    object_id: string;
    executor_id: string;
  }, authorId: string): Promise<Task> {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: task.title.trim(),
          description: task.description.trim(),
          object_id: task.object_id,
          executor_id: task.executor_id,
          author_id: authorId,
          status: 'new',
        })
        .select(`
          *,
          object:objects(id, name, address),
          executor:profiles!tasks_executor_id_fkey(id, email, full_name, role),
          author:profiles!tasks_author_id_fkey(id, email, full_name, role)
        `)
        .single();

      if (error) throw new Error(error.message);
      return data;
    }

    // Local
    const newTask: Task = {
      id: 'task-' + Date.now(),
      title: task.title.trim(),
      description: task.description.trim(),
      object_id: task.object_id,
      executor_id: task.executor_id,
      author_id: authorId,
      status: 'new',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const currentTasks = getLocalTasks();
    setLocalTasks([newTask, ...currentTasks]);

    // Add initial history record
    const historyItem: TaskHistoryItem = {
      id: 'hist-' + Date.now(),
      task_id: newTask.id,
      user_id: authorId,
      old_status: null,
      new_status: 'new',
      comment: 'Задача создана руководителем',
      created_at: new Date().toISOString(),
    };
    const currentHist = getLocalHistory();
    setLocalHistory([historyItem, ...currentHist]);

    const objects = getLocalObjects();
    const profiles = getLocalProfiles();
    return {
      ...newTask,
      object: objects.find((o) => o.id === newTask.object_id),
      executor: profiles.find((p) => p.id === newTask.executor_id),
      author: profiles.find((p) => p.id === newTask.author_id),
    };
  },

  async updateTaskDetails(id: string, updates: {
    title: string;
    description: string;
    executor_id: string;
    object_id: string;
  }): Promise<void> {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: updates.title.trim(),
          description: updates.description.trim(),
          executor_id: updates.executor_id,
          object_id: updates.object_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw new Error(error.message);
      return;
    }

    const current = getLocalTasks();
    const index = current.findIndex((t) => t.id === id);
    if (index !== -1) {
      current[index] = {
        ...current[index],
        title: updates.title.trim(),
        description: updates.description.trim(),
        executor_id: updates.executor_id,
        object_id: updates.object_id,
        updated_at: new Date().toISOString(),
      };
      setLocalTasks([...current]);
    }
  },

  async deleteTask(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw new Error(error.message);
      return;
    }

    const tasks = getLocalTasks().filter((t) => t.id !== id);
    setLocalTasks(tasks);
    const history = getLocalHistory().filter((h) => h.task_id !== id);
    setLocalHistory(history);
  },

  // STATE MACHINE & TRANSITIONS
  async changeTaskStatus(
    taskId: string,
    newStatus: TaskStatus,
    comment: string | null,
    currentUser: UserProfile
  ): Promise<void> {
    // 1. Fetch current task
    const tasks = await this.getTasks();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) {
      throw new Error('Задача не найдена');
    }

    const oldStatus = task.status;

    // 2. Validate transition against state machine
    const transition = ALLOWED_TRANSITIONS.find(
      (t) => t.from === oldStatus && t.to === newStatus
    );

    if (!transition) {
      throw new Error(`Недопустимый переход статуса: из "${oldStatus}" в "${newStatus}"`);
    }

    if (transition.allowedRole !== currentUser.role) {
      const roleName = transition.allowedRole === 'director' ? 'руководителя' : 'исполнителя';
      throw new Error(`Данное действие разрешено только для роли ${roleName}`);
    }

    if (currentUser.role === 'executor' && task.executor_id !== currentUser.id) {
      throw new Error('Вы можете изменять статус только тех задач, где являетесь назначенным исполнителем');
    }

    if (transition.requiresComment && (!comment || !comment.trim())) {
      throw new Error('Для возврата задачи на доработку обязателен комментарий с указанием замечаний');
    }

    // 3. Supabase execution
    const supabase = getSupabaseClient();
    if (supabase) {
      // First try RPC function if deployed
      const { error: rpcError } = await supabase.rpc('change_task_status', {
        p_task_id: taskId,
        p_new_status: newStatus,
        p_comment: comment?.trim() || null,
      });

      if (!rpcError) {
        return;
      }

      // If RPC not found yet, fallback to update + history insert
      console.warn('RPC change_task_status returned error, trying direct update:', rpcError.message);
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', taskId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      // Record history
      await supabase.from('task_history').insert({
        task_id: taskId,
        user_id: currentUser.id,
        old_status: oldStatus,
        new_status: newStatus,
        comment: comment?.trim() || null,
      });
      return;
    }

    // 4. Local execution
    const allLocalTasks = getLocalTasks();
    const taskIdx = allLocalTasks.findIndex((t) => t.id === taskId);
    if (taskIdx !== -1) {
      allLocalTasks[taskIdx] = {
        ...allLocalTasks[taskIdx],
        status: newStatus,
        updated_at: new Date().toISOString(),
      };
      setLocalTasks([...allLocalTasks]);
    }

    const historyItem: TaskHistoryItem = {
      id: 'hist-' + Date.now(),
      task_id: taskId,
      user_id: currentUser.id,
      old_status: oldStatus,
      new_status: newStatus,
      comment: comment?.trim() || null,
      created_at: new Date().toISOString(),
      user: currentUser,
    };
    const currentHist = getLocalHistory();
    setLocalHistory([historyItem, ...currentHist]);
  },

  // TASK HISTORY
  async getTaskHistory(taskId: string): Promise<TaskHistoryItem[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('task_history')
          .select(`
            *,
            user:profiles!task_history_user_id_fkey(id, email, full_name, role)
          `)
          .eq('task_id', taskId)
          .order('created_at', { ascending: false });

        if (!error && data) return data as TaskHistoryItem[];
      } catch (err) {
        console.warn('Falling back to local task history:', err);
      }
    }

    // Local
    const list = getLocalHistory().filter((h) => h.task_id === taskId);
    const profiles = getLocalProfiles();
    return list
      .map((h) => ({
        ...h,
        user: profiles.find((p) => p.id === h.user_id),
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },
};
