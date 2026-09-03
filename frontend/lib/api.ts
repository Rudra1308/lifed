const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export interface SettingsData {
  has_api_key: boolean;
  api_key_source: string;
  current_model: string;
  default_model: string;
  database_url: string;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  status: string;
  progress: number;
  created_at?: string;
}

export interface Project {
  id: string;
  goal_id?: string;
  title: string;
  description?: string;
  status: string;
  created_at?: string;
}

export interface TaskItem {
  id: string;
  project_id?: string;
  title: string;
  priority: "low" | "medium" | "high" | "urgent";
  deadline?: string;
  estimated_duration: number;
  status: "todo" | "in_progress" | "completed";
  notes?: string;
  created_at?: string;
}

export interface MemoryItem {
  id: string;
  content: string;
  type: "preference" | "routine" | "rule" | "fact";
  created_at?: string;
}

export interface DailyPlanItem {
  id?: string;
  task_id?: string;
  title: string;
  priority: string;
  estimated_duration: number;
  scheduled_time?: string;
  rationale?: string;
}

export interface DailyPlan {
  id: string;
  date: string;
  tasks: DailyPlanItem[];
  rationale?: string;
  created_at?: string;
}

// Client helper with custom headers support
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const customKey = typeof window !== 'undefined' ? localStorage.getItem('lifed_api_key') : null;
  const customModel = typeof window !== 'undefined' ? localStorage.getItem('lifed_model') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (customKey) {
    headers['X-OpenRouter-Key'] = customKey;
  }
  if (customModel) {
    headers['X-OpenRouter-Model'] = customModel;
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Request failed with status ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Health & Settings
  getHealth: () => apiRequest<{ status: string; version: string; app: string }>('/api/health'),
  getSettings: () => apiRequest<SettingsData>('/api/settings'),
  updateSettings: (data: { openrouter_api_key?: string; model?: string }) =>
    apiRequest<SettingsData>('/api/settings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Goals
  getGoals: (status?: string) => apiRequest<Goal[]>(`/api/goals${status ? `?status=${status}` : ''}`),
  createGoal: (data: Partial<Goal>) =>
    apiRequest<Goal>('/api/goals', { method: 'POST', body: JSON.stringify(data) }),
  updateGoal: (id: string, data: Partial<Goal>) =>
    apiRequest<Goal>(`/api/goals/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteGoal: (id: string) =>
    apiRequest<{ success: boolean }>(`/api/goals/${id}`, { method: 'DELETE' }),

  // Projects
  getProjects: (goalId?: string) =>
    apiRequest<Project[]>(`/api/projects${goalId ? `?goal_id=${goalId}` : ''}`),
  createProject: (data: Partial<Project>) =>
    apiRequest<Project>('/api/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id: string, data: Partial<Project>) =>
    apiRequest<Project>(`/api/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteProject: (id: string) =>
    apiRequest<{ success: boolean }>(`/api/projects/${id}`, { method: 'DELETE' }),

  // Tasks
  getTasks: (params?: { project_id?: string; status?: string; priority?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.project_id) searchParams.set('project_id', params.project_id);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.priority) searchParams.set('priority', params.priority);
    const qs = searchParams.toString();
    return apiRequest<TaskItem[]>(`/api/tasks${qs ? `?${qs}` : ''}`);
  },
  createTask: (data: Partial<TaskItem>) =>
    apiRequest<TaskItem>('/api/tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id: string, data: Partial<TaskItem>) =>
    apiRequest<TaskItem>(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteTask: (id: string) =>
    apiRequest<{ success: boolean }>(`/api/tasks/${id}`, { method: 'DELETE' }),

  // Memories
  getMemories: (type?: string) =>
    apiRequest<MemoryItem[]>(`/api/memories${type ? `?type=${type}` : ''}`),
  createMemory: (data: { content: string; type?: string }) =>
    apiRequest<MemoryItem>('/api/memories', { method: 'POST', body: JSON.stringify(data) }),
  searchMemories: (query: string) =>
    apiRequest<{ memory: MemoryItem; similarity: number }[]>(`/api/memories/search?q=${encodeURIComponent(query)}`),
  deleteMemory: (id: string) =>
    apiRequest<{ success: boolean }>(`/api/memories/${id}`, { method: 'DELETE' }),

  // Dashboard & Plan
  getDashboard: () => apiRequest<any>('/api/dashboard'),
  getDailyPlan: (date?: string) =>
    apiRequest<DailyPlan>(`/api/plan/today${date ? `?date=${date}` : ''}`),
  generateDailyPlan: (params?: { target_hours?: number; prioritize_goal_id?: string }) =>
    apiRequest<DailyPlan>('/api/plan/generate', {
      method: 'POST',
      body: JSON.stringify(params || {}),
    }),
};
