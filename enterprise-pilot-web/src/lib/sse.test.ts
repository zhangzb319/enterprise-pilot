import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSseBuffer } from './sse';

test('parseSseBuffer parses default delta, step, sources, done, and error events', () => {
  const chunk = [
    'event: step\ndata: {"tool":"list_my_tasks","status":"running"}\n\n',
    'event: step\ndata: {"tool":"list_my_tasks","status":"done","summary":"查到 3 个任务"}\n\n',
    'event: sources\ndata: {"items":[{"document_id":"doc-1","title":"报销制度"}]}\n\n',
    'data: {"text":"你好，"}\n\n',
    'data: {"text":"工作台已就绪"}\n\n',
    'event: done\ndata: {}\n\n',
  ].join('');

  const { events, rest } = parseSseBuffer(chunk);
  assert.equal(rest, '');
  assert.equal(events.length, 6);
  assert.deepEqual(events[0], { kind: 'step', data: { tool: 'list_my_tasks', status: 'running', summary: undefined } });
  assert.deepEqual(events[1], { kind: 'step', data: { tool: 'list_my_tasks', status: 'done', summary: '查到 3 个任务' } });
  assert.deepEqual(events[2], { kind: 'sources', data: { items: [{ document_id: 'doc-1', title: '报销制度' }] } });
  assert.deepEqual(events[3], { kind: 'delta', data: { text: '你好，' } });
  assert.deepEqual(events[4], { kind: 'delta', data: { text: '工作台已就绪' } });
  assert.deepEqual(events[5], { kind: 'done', data: {} });
});

test('parseSseBuffer preserves incomplete trailing frame across chunks', () => {
  const part1 = 'data: {"text":"hello"}\n\nevent: error\ndata: {"message":"超时';
  const r1 = parseSseBuffer(part1);
  assert.equal(r1.events.length, 1);
  assert.equal(r1.events[0].kind, 'delta');

  const part2 = r1.rest + '"}\n\n';
  const r2 = parseSseBuffer(part2);
  assert.equal(r2.events.length, 1);
  assert.deepEqual(r2.events[0], { kind: 'error', data: { message: '超时' } });
  assert.equal(r2.rest, '');
});
