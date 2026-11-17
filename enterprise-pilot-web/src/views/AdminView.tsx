import React, { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { UserMonogram } from '../components/UserMonogram';
import { useApp } from '../context/AppContext';
import { isAdminUser } from '../lib/workspace';
import { enterpriseApi } from '../services/apiClient';
import type { DepartmentTreeVO, MeetingRoom, UserVO } from '../types/domain';

function flattenDepts(nodes: DepartmentTreeVO[], prefix = ''): { id: number; label: string; raw: DepartmentTreeVO }[] {
  const out: { id: number; label: string; raw: DepartmentTreeVO }[] = [];
  for (const n of nodes) {
    const label = prefix ? `${prefix} / ${n.deptName}` : n.deptName;
    out.push({ id: n.id, label, raw: n });
    if (n.children.length > 0) {
      out.push(...flattenDepts(n.children, label));
    }
  }
  return out;
}

export function AdminView() {
  const { user, notify } = useApp();
  const [tab, setTab] = useState<'rooms' | 'depts' | 'users'>('rooms');
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [deptTree, setDeptTree] = useState<DepartmentTreeVO[]>([]);
  const [users, setUsers] = useState<UserVO[]>([]);

  // Room Modal
  const [roomModal, setRoomModal] = useState<{ mode: 'create' | 'edit'; id?: number } | null>(null);
  const [roomName, setRoomName] = useState('');
  const [roomFloor, setRoomFloor] = useState('12F');
  const [roomCap, setRoomCap] = useState('8');
  const [roomEquip, setRoomEquip] = useState('');

  // Dept Modal
  const [deptModal, setDeptModal] = useState<{ mode: 'create' | 'edit'; id?: number } | null>(null);
  const [deptName, setDeptName] = useState('');
  const [deptParentId, setDeptParentId] = useState('0');

  const loadAll = async () => {
    try {
      const [allRooms, tree, userList] = await Promise.all([
        enterpriseApi.listAllRooms(),
        enterpriseApi.getDepartmentTree(),
        enterpriseApi.listAllUsersAdmin(),
      ]);
      setRooms(allRooms);
      setDeptTree(tree);
      setUsers(userList);
    } catch (err) {
      notify(err instanceof Error ? err.message : '加载管理数据失败', 'error');
    }
  };

  useEffect(() => {
    if (isAdminUser(user)) {
      void loadAll();
    }
  }, [user]);

  if (!isAdminUser(user)) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <div className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <h2 className="font-display text-base font-semibold text-slate-900">需要管理员权限</h2>
          <p className="mt-1 text-xs text-slate-500">
            仅具备 ROLE_ADMIN 权限的账号可访问会议室资源、组织架构与全员名录管理。
          </p>
        </div>
      </div>
    );
  }

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim() || !roomModal) return;
    const dto = {
      roomName: roomName.trim(),
      floor: roomFloor.trim() || undefined,
      capacity: Math.max(1, Number(roomCap) || 6),
      equipment: roomEquip.trim() || undefined,
    };
    try {
      if (roomModal.mode === 'create') await enterpriseApi.createRoom(dto);
      else if (roomModal.id) await enterpriseApi.updateRoom(roomModal.id, dto);
      setRoomModal(null);
      notify('会议室信息已保存', 'success');
      await loadAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : '保存会议室失败', 'error');
    }
  };

  const handleToggleRoom = async (room: MeetingRoom) => {
    try {
      await enterpriseApi.disableRoom(room.id);
      notify('已更新会议室状态', 'info');
      await loadAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : '更新状态失败', 'error');
    }
  };

  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim() || !deptModal) return;
    try {
      if (deptModal.mode === 'create') {
        await enterpriseApi.createDepartment({
          deptName: deptName.trim(),
          parentId: Number(deptParentId) || 0,
        });
      } else if (deptModal.id) {
        await enterpriseApi.updateDepartment(deptModal.id, {
          deptName: deptName.trim(),
        });
      }
      setDeptModal(null);
      notify('部门架构已更新', 'success');
      await loadAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : '保存部门失败', 'error');
    }
  };

  const handleDeleteDept = async (id: number) => {
    try {
      await enterpriseApi.deleteDepartment(id);
      notify('已删除部门节点', 'info');
      await loadAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : '删除部门失败', 'error');
    }
  };

  const flatDepts = flattenDepts(deptTree);

  return (
    <div className="mx-auto max-w-[1200px] p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-xl border border-slate-200/90 bg-white p-1 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
          <button
            type="button"
            onClick={() => setTab('rooms')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
              tab === 'rooms' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            会议室资源 ({rooms.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('depts')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
              tab === 'depts' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            部门组织架构 ({flatDepts.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('users')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
              tab === 'users' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            全员账号名录 ({users.length})
          </button>
        </div>

        {tab === 'rooms' && (
          <button
            type="button"
            onClick={() => {
              setRoomName('');
              setRoomFloor('12F');
              setRoomCap('8');
              setRoomEquip('');
              setRoomModal({ mode: 'create' });
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-xs font-medium text-white shadow-xs hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            新建会议室
          </button>
        )}

        {tab === 'depts' && (
          <button
            type="button"
            onClick={() => {
              setDeptName('');
              setDeptParentId('0');
              setDeptModal({ mode: 'create' });
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-xs font-medium text-white shadow-xs hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            新增部门
          </button>
        )}
      </div>

      {tab === 'rooms' && (
        <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-slate-200/90 bg-slate-50/80 text-[12px] font-medium text-slate-500">
              <tr>
                <th className="px-4 py-3">名称</th>
                <th className="px-4 py-3">楼层</th>
                <th className="px-4 py-3">容量</th>
                <th className="px-4 py-3">设备配置</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3 text-right">管理操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rooms.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{r.roomName}</td>
                  <td className="px-4 py-3 text-slate-600">{r.floor ?? '-'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600 tabular-nums">{r.capacity} 人</td>
                  <td className="px-4 py-3 text-slate-600">{r.equipment ?? '-'}</td>
                  <td className="px-4 py-3 text-xs font-medium">
                    <span className={r.status === 1 ? 'text-emerald-700' : 'text-slate-400'}>
                      {r.status === 1 ? '可用' : '已停用'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRoomName(r.roomName);
                        setRoomFloor(r.floor ?? '');
                        setRoomCap(String(r.capacity));
                        setRoomEquip(r.equipment ?? '');
                        setRoomModal({ mode: 'edit', id: r.id });
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Pencil className="h-3 w-3" />
                      编辑
                    </button>
                    {r.status === 1 && (
                      <button
                        type="button"
                        onClick={() => void handleToggleRoom(r)}
                        className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                      >
                        停用
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'depts' && (
        <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white divide-y divide-slate-100 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          {flatDepts.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/80 transition-colors">
              <div>
                <p className="text-[13px] font-medium text-slate-900">{item.label}</p>
                <p className="text-[11px] font-mono text-slate-400 tabular-nums">ID: {item.id}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeptName(item.raw.deptName);
                    setDeptParentId(String(item.raw.parentId));
                    setDeptModal({ mode: 'edit', id: item.id });
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Pencil className="h-3 w-3" />
                  重命名
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteDept(item.id)}
                  aria-label={`删除部门 ${item.raw.deptName}`}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'users' && (
        <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-slate-200/90 bg-slate-50/80 text-[12px] font-medium text-slate-500">
                <tr>
                  <th className="px-4 py-3">工号</th>
                  <th className="px-4 py-3">姓名 / 用户名</th>
                  <th className="px-4 py-3">部门</th>
                  <th className="px-4 py-3">角色</th>
                  <th className="px-4 py-3">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 tabular-nums">{u.employeeNo}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <div className="flex items-center gap-2.5">
                        <UserMonogram name={u.realName} size="sm" />
                        <span>
                          {u.realName} <span className="font-mono text-xs text-slate-400">({u.username})</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{u.deptName ?? '-'}</td>
                    <td className="px-4 py-3 text-xs text-slate-700">{u.roleName ?? '普通员工'}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className={u.status === 1 ? 'text-emerald-700 font-medium' : 'text-slate-400'}>
                        {u.status === 1 ? '在职' : '停用'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Room Modal */}
      {roomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px]">
          <div role="dialog" aria-label="会议室配置" className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-semibold text-slate-900">
                {roomModal.mode === 'create' ? '新建会议室' : '编辑会议室'}
              </h3>
              <button type="button" onClick={() => setRoomModal(null)} aria-label="关闭弹窗" className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSaveRoom} className="mt-4 space-y-3.5">
              <div>
                <label htmlFor="admin-room-name" className="block text-xs font-medium text-slate-700">会议室名称 *</label>
                <input
                  id="admin-room-name"
                  required
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="如：12F · 创新实验室"
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="admin-room-floor" className="block text-xs font-medium text-slate-700">楼层</label>
                  <input
                    id="admin-room-floor"
                    value={roomFloor}
                    onChange={(e) => setRoomFloor(e.target.value)}
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="admin-room-cap" className="block text-xs font-medium text-slate-700">容纳人数 *</label>
                  <input
                    id="admin-room-cap"
                    type="number"
                    min={1}
                    required
                    value={roomCap}
                    onChange={(e) => setRoomCap(e.target.value)}
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 font-mono text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="admin-room-equip" className="block text-xs font-medium text-slate-700">设备描述</label>
                <input
                  id="admin-room-equip"
                  value={roomEquip}
                  onChange={(e) => setRoomEquip(e.target.value)}
                  placeholder="如：无线投屏 · 白板"
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setRoomModal(null)} className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  取消
                </button>
                <button type="submit" className="h-9 rounded-lg bg-blue-600 px-4 text-xs font-medium text-white hover:bg-blue-700">
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dept Modal */}
      {deptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px]">
          <div role="dialog" aria-label="部门配置" className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-semibold text-slate-900">
                {deptModal.mode === 'create' ? '新增部门' : '重命名部门'}
              </h3>
              <button type="button" onClick={() => setDeptModal(null)} aria-label="关闭弹窗" className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSaveDept} className="mt-4 space-y-3.5">
              <div>
                <label htmlFor="admin-dept-name" className="block text-xs font-medium text-slate-700">部门名称 *</label>
                <input
                  id="admin-dept-name"
                  required
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>
              {deptModal.mode === 'create' && (
                <div>
                  <label htmlFor="admin-dept-parent" className="block text-xs font-medium text-slate-700">上级部门</label>
                  <select
                    id="admin-dept-parent"
                    value={deptParentId}
                    onChange={(e) => setDeptParentId(e.target.value)}
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm focus:border-blue-600 focus:outline-none"
                  >
                    <option value="0">一级部门（无上级）</option>
                    {flatDepts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setDeptModal(null)} className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  取消
                </button>
                <button type="submit" className="h-9 rounded-lg bg-blue-600 px-4 text-xs font-medium text-white hover:bg-blue-700">
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
