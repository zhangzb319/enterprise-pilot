import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dedupeSources,
  filterDirectoryUsers,
  filterTasks,
  insertDiscussionReply,
  isAdminUser,
  validateAndCheckBookingConflict,
} from './workspace';
import type { BookingVO, DepartmentTreeVO, DiscussionTreeVO, ProjectTaskVO, UserDirectoryVO, UserVO } from '../types/domain';

test('isAdminUser detects ROLE_ADMIN and 管理员', () => {
  const emp = { roleName: '普通员工' } as UserVO;
  const admin = { roleName: '管理员' } as UserVO;
  assert.equal(isAdminUser(emp), false);
  assert.equal(isAdminUser(admin), true);
  assert.equal(isAdminUser(null), false);
});

test('filterTasks filters by isMine, status, and search query', () => {
  const tasks: ProjectTaskVO[] = [
    { id: 1, projectId: 1, projectName: 'Alpha', title: '接口联调', description: 'Java', assigneeId: 1, assigneeName: '王伟', status: 1, dueDate: '2026-11-20', isMine: true },
    { id: 2, projectId: 1, projectName: 'Alpha', title: 'UI 走查', description: 'React', assigneeId: 2, assigneeName: '李娜', status: 2, dueDate: '2026-11-21', isMine: false },
  ];
  assert.equal(filterTasks(tasks, { onlyMine: true, status: 'all', query: '' }).length, 1);
  assert.equal(filterTasks(tasks, { onlyMine: false, status: 2, query: '' }).length, 1);
  assert.equal(filterTasks(tasks, { onlyMine: false, status: 'all', query: '联调' }).length, 1);
});

test('validateAndCheckBookingConflict catches past times, inverted range, and overlaps', () => {
  const now = Date.parse('2026-11-17T09:00:00');
  const existing: BookingVO[] = [
    {
      id: 10,
      title: '架构评审',
      roomId: 1,
      roomName: '启明厅',
      organizerId: 1,
      organizerName: '王伟',
      startTime: '2026-11-17T10:00:00',
      endTime: '2026-11-17T11:30:00',
      status: 1,
    },
    {
      id: 11,
      title: '已取消会议',
      roomId: 1,
      roomName: '启明厅',
      organizerId: 1,
      organizerName: '王伟',
      startTime: '2026-11-17T14:00:00',
      endTime: '2026-11-17T15:00:00',
      status: 0,
    },
  ];

  assert.equal(validateAndCheckBookingConflict(existing, 1, '2026-11-17T08:30:00', '2026-11-17T09:30:00', now).ok, false);
  assert.equal(validateAndCheckBookingConflict(existing, 1, '2026-11-17T11:00:00', '2026-11-17T10:30:00', now).ok, false);
  assert.equal(validateAndCheckBookingConflict(existing, 1, '2026-11-17T11:00:00', '2026-11-17T12:00:00', now).ok, false);
  assert.equal(validateAndCheckBookingConflict(existing, 1, '2026-11-17T14:00:00', '2026-11-17T15:00:00', now).ok, true);
});

test('insertDiscussionReply appends both root and nested child replies', () => {
  const tree: DiscussionTreeVO[] = [
    { id: 1, userId: 1, userName: '王伟', content: 'Root', parentId: 0, createdAt: '2026-11-17T09:00:00', children: [] },
  ];
  const nested: DiscussionTreeVO = { id: 2, userId: 2, userName: '陈敏', content: 'Child', parentId: 1, createdAt: '2026-11-17T09:05:00', children: [] };
  const updated = insertDiscussionReply(tree, 1, nested);
  assert.equal(updated[0].children.length, 1);
  assert.equal(updated[0].children[0].content, 'Child');
});

test('filterDirectoryUsers cascades department subtree selection and dedupeSources removes duplicates', () => {
  const depts: DepartmentTreeVO[] = [
    {
      id: 1,
      deptName: '研发中心',
      leaderId: 1,
      parentId: 0,
      children: [{ id: 2, deptName: '前端组', leaderId: 1, parentId: 1, children: [] }],
    },
  ];
  const users = [
    { id: 1, realName: '王伟', employeeNo: 'EP001', deptId: 2, deptName: '前端组' },
    { id: 2, realName: '陈敏', employeeNo: 'EP002', deptId: 3, deptName: '总经办' },
  ] as UserDirectoryVO[];

  assert.equal(filterDirectoryUsers(users, depts, 1, '').length, 1);
  assert.equal(dedupeSources([
    { document_id: 'd1', title: 'A' },
    { document_id: 'd1', title: 'A' },
    { document_id: 'd2', title: 'B' },
  ]).length, 2);
});
