import type { AgentSource, AgentStep, SseEvent } from '../types/domain';

export interface SseParseResult {
  events: SseEvent[];
  rest: string;
}

/**
 * Parses a streaming SSE buffer into discrete Node Agent protocol events.
 * Supports LF and CRLF line breaks and preserves incomplete trailing frames.
 *
 * Node Agent SSE contract (/api/v1/agent/chat/stream):
 * - default (no event line): {"text": "..."}
 * - event: step    -> {"tool", "status": "running"|"done", "summary"}
 * - event: sources -> {"items": [{"document_id", "title"}]}
 * - event: done    -> {}
 * - event: error   -> {"message"}
 */
export function parseSseBuffer(buffer: string): SseParseResult {
  const normalized = buffer.replace(/\r\n/g, '\n');
  const frames = normalized.split('\n\n');
  const rest = frames.pop() ?? '';
  const events: SseEvent[] = [];

  for (const frame of frames) {
    const trimmed = frame.trim();
    if (!trimmed) continue;

    let eventName = 'message';
    const dataLines: string[] = [];

    for (const line of trimmed.split('\n')) {
      if (line.startsWith(':')) continue;
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trimStart());
      }
    }

    if (dataLines.length === 0) continue;
    const rawData = dataLines.join('\n');

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawData);
    } catch {
      continue;
    }

    if (eventName === 'step' && isRecord(parsed) && typeof parsed.tool === 'string') {
      const status = parsed.status === 'running' ? 'running' : 'done';
      const step: AgentStep = {
        tool: parsed.tool,
        status,
        summary: typeof parsed.summary === 'string' ? parsed.summary : undefined,
      };
      events.push({ kind: 'step', data: step });
    } else if (eventName === 'sources' && isRecord(parsed) && Array.isArray(parsed.items)) {
      const items: AgentSource[] = parsed.items
        .filter((item): item is AgentSource => isRecord(item) && typeof item.document_id === 'string' && typeof item.title === 'string');
      events.push({ kind: 'sources', data: { items } });
    } else if (eventName === 'done') {
      events.push({ kind: 'done', data: {} });
    } else if (eventName === 'error' && isRecord(parsed)) {
      events.push({
        kind: 'error',
        data: { message: typeof parsed.message === 'string' ? parsed.message : '请求失败' },
      });
    } else if (eventName === 'message' && isRecord(parsed) && typeof parsed.text === 'string') {
      events.push({ kind: 'delta', data: { text: parsed.text } });
    }
  }

  return { events, rest };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export const TOOL_LABELS: Record<string, string> = {
  search_knowledge: '检索企业知识库',
  list_my_bookings: '查询我的会议预订',
  list_meeting_rooms: '查询会议室资源',
  create_meeting_booking: '执行会议室预订',
  list_my_projects: '查询我的项目',
  list_my_tasks: '查询我的任务',
  create_project_task: '创建项目新任务',
  update_task_status: '更新任务状态',
  find_colleague: '查询组织通讯录',
  send_direct_message: '发送站内私信',
};

export function getToolLabel(toolName: string): string {
  return TOOL_LABELS[toolName] ?? toolName;
}
