export type WorkspaceView =
  | 'workbench'
  | 'projects'
  | 'meetings'
  | 'knowledge'
  | 'agent'
  | 'messages'
  | 'notifications'
  | 'directory'
  | 'profile'
  | 'admin';

export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
}

export interface LoginDTO {
  username: string;
  password: string;
}

export interface UserRegisterDTO {
  username: string;
  password: string;
  realName: string;
  phone?: string;
  email?: string;
}

export interface LoginVO {
  token: string;
  userId: number;
  realName: string;
}

export interface UserVO {
  id: number;
  employeeNo: string;
  username: string;
  nickname: string | null;
  realName: string;
  avatar: string | null;
  gender: number | null;
  phone: string | null;
  email: string | null;
  position: string | null;
  status: number;
  deptId: number | null;
  deptName: string | null;
  roleName: string | null;
  hireDate: string | null;
}

export interface UserProfileUpdateDTO {
  nickname?: string;
  realName: string;
  gender?: number;
  phone?: string;
  email?: string;
  position?: string;
  avatar?: string;
}

export interface PasswordChangeDTO {
  oldPassword: string;
  newPassword: string;
}

export interface UserDirectoryVO {
  id: number;
  employeeNo: string;
  realName: string;
  nickname: string | null;
  gender: number | null;
  avatar: string | null;
  position: string | null;
  phone: string | null;
  email: string | null;
  deptId: number | null;
  deptName: string | null;
  hireDate: string | null;
}

export interface DepartmentTreeVO {
  id: number;
  deptName: string;
  leaderId: number | null;
  parentId: number;
  children: DepartmentTreeVO[];
}

export interface DepartmentDTO {
  deptName: string;
  parentId?: number;
  leaderId?: number | null;
  sortOrder?: number;
}

export interface ProjectVO {
  id: number;
  projectName: string;
  description: string | null;
  ownerId: number;
  ownerName: string;
  status: number; // 0草稿 1进行中 2已完成 3已延期
  progress: number;
  startDate: string | null;
  endDate: string | null;
}

export interface ProjectCreateDTO {
  projectName: string;
  description?: string;
  startDate?: string;
  endDate?: string;
}

export interface ProjectTaskVO {
  id: number;
  projectId: number;
  projectName: string;
  title: string;
  description: string | null;
  assigneeId: number | null;
  assigneeName: string | null;
  status: number; // 0待开始 1进行中 2已完成
  dueDate: string | null;
  isMine?: boolean;
}

export interface ProjectTaskCreateDTO {
  title: string;
  description?: string;
  assigneeId?: number | null;
  dueDate?: string;
}

export interface DiscussionTreeVO {
  id: number;
  userId: number;
  userName: string;
  content: string;
  parentId: number;
  createdAt: string;
  children: DiscussionTreeVO[];
}

export interface DiscussionCreateDTO {
  content: string;
  parentId?: number;
}

export interface MeetingRoom {
  id: number;
  roomName: string;
  floor: string | null;
  capacity: number;
  equipment: string | null;
  status: number; // 1可用 0停用
}

export interface MeetingRoomDTO {
  roomName: string;
  floor?: string;
  capacity: number;
  equipment?: string;
}

export interface BookingVO {
  id: number;
  title: string;
  roomId: number;
  roomName: string;
  organizerId: number;
  organizerName: string;
  startTime: string;
  endTime: string;
  status: number; // 1有效 0已取消
}

export interface BookingCreateDTO {
  roomId: number;
  title: string;
  startTime: string;
  endTime: string;
}

export interface MeetingMinutesDraft {
  bookingId: number;
  audioUrl: string;
  transcript: string;
  summary: string;
  updatedAt: string;
}

export interface ActionItem {
  content: string;
  assignee?: string | null;
  due_date?: string | null;
}

export interface MeetingTodoDTO {
  content: string;
  assigneeId?: number;
  dueDate?: string;
}

export interface MeetingSummarySaveDTO {
  audioUrl?: string;
  transcriptText?: string;
  summaryText?: string;
  todos?: MeetingTodoDTO[];
}

export interface MeetingTodoVO {
  id: number;
  summaryId: number;
  content: string;
  assigneeId: number | null;
  assigneeName: string | null;
  dueDate: string | null;
  status: number; // 0待完成 1已完成
  createdAt: string;
}

export interface MeetingSummaryVO {
  id: number;
  bookingId: number;
  audioUrl: string | null;
  transcriptText: string | null;
  summaryText: string | null;
  processStatus: number;
  createdAt: string;
  todos: MeetingTodoVO[];
}

export interface DocumentItem {
  document_id: string;
  title: string;
  category: string | null;
  chunk_count: number;
  created_at: string | null;
}

export interface ChunkItem {
  index: number;
  content: string;
}

export interface DocumentDetail {
  document_id: string;
  title: string;
  category: string | null;
  created_at: string | null;
  chunks: ChunkItem[];
}

export interface IngestTextRequest {
  document_id: string;
  title: string;
  content: string;
  category?: string | null;
}

export interface SourceChunk {
  document_id: string;
  title: string;
  content: string;
}

export interface AskResponse {
  answer: string;
  sources: SourceChunk[];
}

export interface ConversationVO {
  userId: number;
  name: string;
  avatar: string | null;
  position: string | null;
  deptName: string | null;
  lastMessage: string;
  lastTime: string;
  unreadCount: number;
}

export interface MessageVO {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  isRead: number;
  createdAt: string;
}

export interface SendMessageDTO {
  receiverId: number;
  content: string;
}

export interface NotificationVO {
  id: number;
  type: string;
  title: string;
  content: string;
  relatedId: number | null;
  isRead: number;
  createdAt: string;
}

export interface NotificationPageVO {
  records: NotificationVO[];
  total: number;
}

export interface AgentStep {
  tool: string;
  status: 'running' | 'done';
  summary?: string;
}

export interface AgentSource {
  document_id: string;
  title: string;
}

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  steps?: AgentStep[];
  sources?: AgentSource[];
  error?: string;
  aborted?: boolean;
  createdAt: string;
}

export interface AgentSession {
  id: string;
  title: string;
  updatedAt: string;
  messages: AgentMessage[];
}

export type SseEvent =
  | { kind: 'delta'; data: { text: string } }
  | { kind: 'step'; data: AgentStep }
  | { kind: 'sources'; data: { items: AgentSource[] } }
  | { kind: 'done'; data: Record<string, never> }
  | { kind: 'error'; data: { message: string } };

export interface CopilotContext {
  view: WorkspaceView;
  projectId?: number;
  projectName?: string;
  bookingId?: number;
  bookingTitle?: string;
  documentId?: string;
  documentTitle?: string;
}
