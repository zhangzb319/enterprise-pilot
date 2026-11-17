import { parseSseBuffer } from '../lib/sse';
import type {
  ApiEnvelope,
  AskResponse,
  BookingCreateDTO,
  BookingVO,
  ConversationVO,
  CopilotContext,
  DepartmentDTO,
  DepartmentTreeVO,
  DiscussionCreateDTO,
  DiscussionTreeVO,
  DocumentDetail,
  DocumentItem,
  IngestTextRequest,
  LoginDTO,
  LoginVO,
  MeetingRoom,
  MeetingRoomDTO,
  MessageVO,
  NotificationPageVO,
  PasswordChangeDTO,
  ProjectCreateDTO,
  ProjectTaskCreateDTO,
  ProjectTaskVO,
  ProjectVO,
  SendMessageDTO,
  SseEvent,
  UserDirectoryVO,
  UserProfileUpdateDTO,
  UserRegisterDTO,
  UserVO,
} from '../types/domain';

export class ApiError extends Error {
  status?: number;
  code?: number;
  constructor(message: string, status?: number, code?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

let currentToken: string | null = null;
let onUnauthorizedHandler: (() => void) | null = null;

export function configureApiClient(opts: {
  token: string | null;
  onUnauthorized?: () => void;
}): void {
  currentToken = opts.token;
  if (opts.onUnauthorized) onUnauthorizedHandler = opts.onUnauthorized;
}

async function liveFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (currentToken) {
    headers.set('Authorization', `Bearer ${currentToken}`);
  }

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers });
  } catch (err) {
    throw new ApiError(`无法连接服务端（${err instanceof Error ? err.message : '网络异常'}）`);
  }

  if (res.status === 401) {
    onUnauthorizedHandler?.();
    throw new ApiError('登录凭据已过期，请重新登录', 401, 401);
  }

  let payload: ApiEnvelope<T> | null = null;
  try {
    payload = (await res.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiError(`服务端响应格式异常（HTTP ${res.status}）`, res.status);
  }

  if (!res.ok || !payload || payload.code !== 200) {
    const msg = payload?.message || `请求失败（HTTP ${res.status}）`;
    if (msg.includes('1113') || msg.includes('余额') || msg.includes('额度')) {
      throw new ApiError('知识库向量检索服务额度不足（错误码 1113），请联系管理员充值智谱 embedding 额度。', res.status, 1113);
    }
    throw new ApiError(msg, res.status, payload?.code);
  }

  return payload.data;
}

export const enterpriseApi = {
  // --- Auth & Users (:8080) ---
  async login(dto: LoginDTO): Promise<LoginVO> {
    return liveFetch<LoginVO>('/api/users/login', { method: 'POST', body: JSON.stringify(dto) });
  },

  async register(dto: UserRegisterDTO): Promise<void> {
    await liveFetch<void>('/api/users/register', { method: 'POST', body: JSON.stringify(dto) });
  },

  async logout(): Promise<void> {
    await liveFetch<void>('/api/users/logout', { method: 'POST' });
  },

  async getMe(): Promise<UserVO> {
    return liveFetch<UserVO>('/api/users/me');
  },

  async updateProfile(dto: UserProfileUpdateDTO): Promise<void> {
    await liveFetch<void>('/api/users/profile', { method: 'PUT', body: JSON.stringify(dto) });
  },

  async changePassword(dto: PasswordChangeDTO): Promise<void> {
    await liveFetch<void>('/api/users/password', { method: 'PUT', body: JSON.stringify(dto) });
  },

  async listDirectory(): Promise<UserDirectoryVO[]> {
    return liveFetch<UserDirectoryVO[]>('/api/users/directory');
  },

  async listAllUsersAdmin(): Promise<UserVO[]> {
    return liveFetch<UserVO[]>('/api/users');
  },

  // --- Departments (:8080) ---
  async getDepartmentTree(): Promise<DepartmentTreeVO[]> {
    return liveFetch<DepartmentTreeVO[]>('/api/departments/tree');
  },

  async createDepartment(dto: DepartmentDTO): Promise<void> {
    await liveFetch<void>('/api/departments', { method: 'POST', body: JSON.stringify(dto) });
  },

  async updateDepartment(id: number, dto: DepartmentDTO): Promise<void> {
    await liveFetch<void>(`/api/departments/${id}`, { method: 'PUT', body: JSON.stringify(dto) });
  },

  async deleteDepartment(id: number): Promise<void> {
    await liveFetch<void>(`/api/departments/${id}`, { method: 'DELETE' });
  },

  // --- Projects & Tasks & Discussions (:8080) ---
  async getMyProjects(): Promise<ProjectVO[]> {
    return liveFetch<ProjectVO[]>('/api/projects/my');
  },

  async createProject(dto: ProjectCreateDTO): Promise<void> {
    await liveFetch<void>('/api/projects', { method: 'POST', body: JSON.stringify(dto) });
  },

  async getMyTasks(): Promise<ProjectTaskVO[]> {
    return liveFetch<ProjectTaskVO[]>('/api/projects/tasks/my');
  },

  async getProjectTasks(projectId: number): Promise<ProjectTaskVO[]> {
    return liveFetch<ProjectTaskVO[]>(`/api/projects/${projectId}/tasks`);
  },

  async createTask(projectId: number, dto: ProjectTaskCreateDTO): Promise<void> {
    await liveFetch<void>(`/api/projects/${projectId}/tasks`, { method: 'POST', body: JSON.stringify(dto) });
  },

  async getDiscussionTree(projectId: number): Promise<DiscussionTreeVO[]> {
    return liveFetch<DiscussionTreeVO[]>(`/api/projects/${projectId}/discussion/tree`);
  },

  async createDiscussion(projectId: number, dto: DiscussionCreateDTO): Promise<void> {
    await liveFetch<void>(`/api/projects/${projectId}/discussions`, { method: 'POST', body: JSON.stringify(dto) });
  },

  // --- Meetings & Rooms (:8080) ---
  async listAvailableRooms(): Promise<MeetingRoom[]> {
    return liveFetch<MeetingRoom[]>('/api/meeting/rooms');
  },

  async listAllRooms(): Promise<MeetingRoom[]> {
    return liveFetch<MeetingRoom[]>('/api/meeting/rooms/all');
  },

  async createRoom(dto: MeetingRoomDTO): Promise<void> {
    await liveFetch<void>('/api/meeting/rooms', { method: 'POST', body: JSON.stringify(dto) });
  },

  async updateRoom(id: number, dto: MeetingRoomDTO): Promise<void> {
    await liveFetch<void>(`/api/meeting/rooms/${id}`, { method: 'PUT', body: JSON.stringify(dto) });
  },

  async disableRoom(id: number): Promise<void> {
    await liveFetch<void>(`/api/meeting/rooms/${id}/disable`, { method: 'PUT' });
  },

  async getRoomBookings(roomId: number): Promise<BookingVO[]> {
    return liveFetch<BookingVO[]>(`/api/meeting/bookings/room/${roomId}`);
  },

  async getMyBookings(): Promise<BookingVO[]> {
    return liveFetch<BookingVO[]>('/api/meeting/bookings/my');
  },

  async createBooking(dto: BookingCreateDTO): Promise<void> {
    await liveFetch<void>('/api/meeting/bookings', { method: 'POST', body: JSON.stringify(dto) });
  },

  async cancelBooking(id: number): Promise<void> {
    await liveFetch<void>(`/api/meeting/bookings/${id}/cancel`, { method: 'PUT' });
  },

  // --- Messages & Notifications (:8080) ---
  async listConversations(): Promise<ConversationVO[]> {
    return liveFetch<ConversationVO[]>('/api/messages/conversations');
  },

  async listMessagesWith(userId: number): Promise<MessageVO[]> {
    return liveFetch<MessageVO[]>(`/api/messages/with/${userId}`);
  },

  async sendMessage(dto: SendMessageDTO): Promise<MessageVO> {
    return liveFetch<MessageVO>('/api/messages/send', { method: 'POST', body: JSON.stringify(dto) });
  },

  async getUnreadMessageCount(): Promise<number> {
    return liveFetch<number>('/api/messages/unread-count');
  },

  async listNotifications(page = 1, size = 20): Promise<NotificationPageVO> {
    return liveFetch<NotificationPageVO>(`/api/notifications?page=${page}&size=${size}`);
  },

  async getUnreadNotificationCount(): Promise<number> {
    return liveFetch<number>('/api/notifications/unread-count');
  },

  async markNotificationRead(id: number): Promise<void> {
    await liveFetch<void>(`/api/notifications/${id}/read`, { method: 'PUT' });
  },

  async markAllNotificationsRead(): Promise<void> {
    await liveFetch<void>('/api/notifications/read-all', { method: 'PUT' });
  },

  async deleteNotification(id: number): Promise<void> {
    await liveFetch<void>(`/api/notifications/${id}`, { method: 'DELETE' });
  },

  // --- Python AI Service (:8001): RAG & Meeting Minutes ---
  async listDocuments(): Promise<DocumentItem[]> {
    return liveFetch<DocumentItem[]>('/api/v1/rag/documents');
  },

  async getDocument(documentId: string): Promise<DocumentDetail> {
    return liveFetch<DocumentDetail>(`/api/v1/rag/documents/${encodeURIComponent(documentId)}`);
  },

  async ingestDocument(req: IngestTextRequest): Promise<{ document_id: string; chunk_count: number }> {
    return liveFetch<{ document_id: string; chunk_count: number }>('/api/v1/rag/documents', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  async deleteDocument(documentId: string): Promise<void> {
    await liveFetch<unknown>(`/api/v1/rag/documents/${encodeURIComponent(documentId)}`, { method: 'DELETE' });
  },

  async listCategories(): Promise<string[]> {
    return liveFetch<string[]>('/api/v1/rag/categories');
  },

  async askRag(question: string, topK = 4): Promise<AskResponse> {
    return liveFetch<AskResponse>('/api/v1/rag/ask', {
      method: 'POST',
      body: JSON.stringify({ question, top_k: topK }),
    });
  },

  async transcribeMeeting(audioUrl: string): Promise<{ transcript: string }> {
    return liveFetch<{ transcript: string }>('/api/v1/meetings/transcript', {
      method: 'POST',
      body: JSON.stringify({ audio_url: audioUrl }),
    });
  },

  async summarizeMeeting(bookingId: number, transcript: string): Promise<{ booking_id: number; summary: string }> {
    return liveFetch<{ booking_id: number; summary: string }>('/api/v1/meetings/summary', {
      method: 'POST',
      body: JSON.stringify({ booking_id: bookingId, transcript }),
    });
  },

  // --- Node Agent Service (:8002): SSE Streaming ---
  async *streamAgentChat(params: {
    message: string;
    history: { role: 'user' | 'assistant'; content: string }[];
    context?: CopilotContext | null;
    signal?: AbortSignal;
  }): AsyncGenerator<SseEvent> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (currentToken) headers.Authorization = `Bearer ${currentToken}`;

    const contextPrefix = params.context?.projectName
      ? `[当前上下文：项目「${params.context.projectName}」] `
      : params.context?.bookingTitle
        ? `[当前上下文：会议「${params.context.bookingTitle}」] `
        : '';

    const response = await fetch('/api/v1/agent/chat/stream', {
      method: 'POST',
      headers,
      signal: params.signal,
      body: JSON.stringify({
        message: `${contextPrefix}${params.message}`,
        history: params.history,
      }),
    });

    if (!response.ok || !response.body) {
      throw new ApiError(`Agent 流式服务连接失败（HTTP ${response.status}）`, response.status);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const { events, rest } = parseSseBuffer(buffer);
      buffer = rest;
      for (const evt of events) {
        yield evt;
      }
    }

    if (buffer.trim()) {
      const { events } = parseSseBuffer(`${buffer}\n\n`);
      for (const evt of events) {
        yield evt;
      }
    }
  },
};
