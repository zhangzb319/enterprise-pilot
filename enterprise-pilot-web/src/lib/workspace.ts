import type {
  AgentSource,
  BookingVO,
  DepartmentTreeVO,
  DiscussionTreeVO,
  ProjectTaskVO,
  UserDirectoryVO,
  UserVO,
} from '../types/domain';

export function isAdminUser(user: UserVO | null): boolean {
  if (!user || !user.roleName) return false;
  return user.roleName.includes('管理员') || user.roleName.includes('ROLE_ADMIN');
}

export interface TaskFilterOptions {
  onlyMine: boolean;
  status: 'all' | 0 | 1 | 2;
  query: string;
}

export function filterTasks(tasks: ProjectTaskVO[], options: TaskFilterOptions): ProjectTaskVO[] {
  const q = options.query.trim().toLowerCase();
  return tasks.filter((task) => {
    if (options.onlyMine && !task.isMine) return false;
    if (options.status !== 'all' && task.status !== options.status) return false;
    if (q) {
      const hay = `${task.title} ${task.description ?? ''} ${task.projectName} ${task.assigneeName ?? ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function validateAndCheckBookingConflict(
  existing: BookingVO[],
  roomId: number,
  startIso: string,
  endIso: string,
  nowMs: number = Date.now(),
): { ok: true } | { ok: false; reason: string } {
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return { ok: false, reason: '请选择有效的开始与结束时间' };
  }
  if (start <= nowMs) {
    return { ok: false, reason: '开始时间必须晚于当前时间' };
  }
  if (end <= start) {
    return { ok: false, reason: '结束时间必须晚于开始时间' };
  }
  const conflict = existing.find((b) => {
    if (b.roomId !== roomId || b.status !== 1) return false;
    const bStart = Date.parse(b.startTime);
    const bEnd = Date.parse(b.endTime);
    return start < bEnd && end > bStart;
  });
  if (conflict) {
    return {
      ok: false,
      reason: `该时段与「${conflict.title}」(${formatTimeOnly(conflict.startTime)}–${formatTimeOnly(conflict.endTime)}) 冲突`,
    };
  }
  return { ok: true };
}

export function insertDiscussionReply(
  nodes: DiscussionTreeVO[],
  parentId: number,
  reply: DiscussionTreeVO,
): DiscussionTreeVO[] {
  if (parentId === 0) {
    return [...nodes, reply];
  }
  return nodes.map((node) => {
    if (node.id === parentId) {
      return { ...node, children: [...node.children, reply] };
    }
    if (node.children.length > 0) {
      return { ...node, children: insertDiscussionReply(node.children, parentId, reply) };
    }
    return node;
  });
}

export function collectDepartmentIds(tree: DepartmentTreeVO[], rootId: number): Set<number> {
  const result = new Set<number>();
  function visit(nodes: DepartmentTreeVO[], capturing: boolean): void {
    for (const node of nodes) {
      const hit = capturing || node.id === rootId;
      if (hit) result.add(node.id);
      if (node.children.length > 0) visit(node.children, hit);
    }
  }
  visit(tree, false);
  return result;
}

export function filterDirectoryUsers(
  users: UserDirectoryVO[],
  deptTree: DepartmentTreeVO[],
  selectedDeptId: number | null,
  query: string,
): UserDirectoryVO[] {
  const allowedDepts = selectedDeptId !== null ? collectDepartmentIds(deptTree, selectedDeptId) : null;
  const q = query.trim().toLowerCase();
  return users.filter((u) => {
    if (allowedDepts && (u.deptId === null || !allowedDepts.has(u.deptId))) return false;
    if (q) {
      const hay = `${u.realName} ${u.employeeNo} ${u.position ?? ''} ${u.deptName ?? ''} ${u.email ?? ''} ${u.phone ?? ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function dedupeSources(items: AgentSource[]): AgentSource[] {
  const seen = new Set<string>();
  const out: AgentSource[] = [];
  for (const item of items) {
    if (!seen.has(item.document_id)) {
      seen.add(item.document_id);
      out.push(item);
    }
  }
  return out;
}

export function formatTimeOnly(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function formatShortDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${m}-${day} ${formatTimeOnly(iso)}`;
}

export function getProjectStatusMeta(status: number): { label: string; tone: 'neutral' | 'active' | 'done' | 'warn' } {
  switch (status) {
    case 1:
      return { label: '进行中', tone: 'active' };
    case 2:
      return { label: '已完成', tone: 'done' };
    case 3:
      return { label: '已延期', tone: 'warn' };
    default:
      return { label: '草稿', tone: 'neutral' };
  }
}

export function getTaskStatusMeta(status: number): { label: string; tone: 'neutral' | 'active' | 'done' } {
  switch (status) {
    case 1:
      return { label: '进行中', tone: 'active' };
    case 2:
      return { label: '已完成', tone: 'done' };
    default:
      return { label: '待开始', tone: 'neutral' };
  }
}
