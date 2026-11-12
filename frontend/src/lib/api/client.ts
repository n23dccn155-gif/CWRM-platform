import { demoRiskSnapshot, demoTasks, type RiskSnapshot, type TaskSummary } from "@/lib/demo-data";

/** Một đầu mối dữ liệu cho UI. Không đặt token trong biến NEXT_PUBLIC hoặc dữ liệu mẫu. */
const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, token?: string): Promise<T> {
  if (!baseUrl) throw new ApiError(0, "API_NOT_CONFIGURED", "Chưa cấu hình địa chỉ API.");
  const response = await fetch(`${baseUrl}${path}`, {
    cache: "no-store",
    headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { code?: string; message?: string } | null;
    throw new ApiError(response.status, body?.code ?? "API_ERROR", body?.message ?? `API trả lỗi ${response.status}`);
  }
  return response.json() as Promise<T>;
}

type ApiTask = Record<string, unknown>;

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeTask(raw: ApiTask): TaskSummary {
  const risk = raw.risk && typeof raw.risk === "object" ? raw.risk as ApiTask : {};
  const responsibleIds = Array.isArray(raw.responsibleUserIds) ? raw.responsibleUserIds.map(String) : [];
  const team = raw.team && typeof raw.team === "object" ? raw.team as ApiTask : {};
  const accountable = raw.accountable && typeof raw.accountable === "object" ? raw.accountable as ApiTask : {};
  const requiredPeople = Number(raw.requiredPeople ?? 1);
  const reservedPeople = Number(raw.reservedPeople ?? responsibleIds.length);
  const status = stringValue(raw.status, "TO_DO");
  const mode = stringValue(raw.assignmentMode, "DIRECT");
  const riskLevel = stringValue(risk.riskLevel ?? risk.level ?? raw.riskLevel, "LOW");

  return {
    id: stringValue(raw.id),
    title: stringValue(raw.title, "Công việc chưa có tên"),
    team: stringValue(raw.teamName ?? team.name ?? raw.teamId, "Chưa rõ team"),
    status: ({ TO_DO: "To Do", IN_PROGRESS: "In Progress", BLOCKED: "Blocked", REVIEW: "Review", DONE: "Done" } as Record<string, TaskSummary["status"]>)[status] ?? "To Do",
    assignmentMode: mode === "OPEN_WORK" ? "Open Work" : "Direct",
    accountable: stringValue(raw.accountableName ?? accountable.name ?? raw.accountableUserId, "Chưa rõ A"),
    responsible: responsibleIds.length ? responsibleIds.join(", ") : undefined,
    priority: ({ LOW: "Low", MEDIUM: "Medium", HIGH: "High", CRITICAL: "Critical" } as Record<string, TaskSummary["priority"]>)[stringValue(raw.priority)] ?? "Medium",
    progress: Number(raw.progress ?? 0),
    deadlineLabel: stringValue(raw.deadlineAt ?? raw.deadlineLabel, "Chưa có hạn"),
    riskLevel: ({ LOW: "Low", MEDIUM: "Medium", HIGH: "High" } as Record<string, TaskSummary["riskLevel"]>)[riskLevel] ?? "Low",
    openBlockers: Number(raw.openBlockers ?? 0),
    requiredPeople,
    reservedPeople,
    predecessorId: Array.isArray(raw.predecessorIds) ? stringValue(raw.predecessorIds[0]) : undefined,
    description: stringValue(raw.description),
  };
}

function taskArray(body: unknown): ApiTask[] {
  if (Array.isArray(body)) return body as ApiTask[];
  if (body && typeof body === "object") {
    const data = body as ApiTask;
    if (Array.isArray(data.items)) return data.items as ApiTask[];
    if (Array.isArray(data.tasks)) return data.tasks as ApiTask[];
  }
  throw new ApiError(502, "INVALID_API_RESPONSE", "Danh sách task không đúng định dạng dự kiến.");
}

export async function listTasks(token?: string): Promise<TaskSummary[]> {
  if (!baseUrl) return demoTasks;
  return taskArray(await request<unknown>("/tasks", token)).map(normalizeTask);
}

export async function getTask(id: string, token?: string): Promise<TaskSummary | undefined> {
  if (!baseUrl) return demoTasks.find((task) => task.id === id);
  try {
    const body = await request<ApiTask>(`/tasks/${encodeURIComponent(id)}`, token);
    return normalizeTask(body);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return undefined;
    throw error;
  }
}

export async function getRiskSnapshot(taskId: string, token?: string): Promise<RiskSnapshot | undefined> {
  if (!baseUrl) return demoRiskSnapshot.taskId === taskId ? demoRiskSnapshot : undefined;
  try {
    return await request<RiskSnapshot>(`/tasks/${encodeURIComponent(taskId)}/risk-snapshots/current`, token);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return undefined;
    throw error;
  }
}

export const usingDemoData = !baseUrl;
