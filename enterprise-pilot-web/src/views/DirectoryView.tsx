import React, { useEffect, useState } from 'react';
import { Building2, MessageSquare, Search } from 'lucide-react';
import { UserMonogram } from '../components/UserMonogram';
import { useApp } from '../context/AppContext';
import { filterDirectoryUsers } from '../lib/workspace';
import { enterpriseApi } from '../services/apiClient';
import type { DepartmentTreeVO, UserDirectoryVO } from '../types/domain';

function DeptNode({
  node,
  depth = 0,
  selectedId,
  onSelect,
}: {
  node: DepartmentTreeVO;
  depth?: number;
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const active = selectedId === node.id;
  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect(node.id)}
        style={{ paddingLeft: `${12 + depth * 14}px` }}
        className={`flex w-full items-center gap-2 rounded-lg py-2 pr-3 text-left text-[13px] transition-all ${
          active
            ? 'bg-blue-50/90 font-semibold text-blue-700 ring-1 ring-blue-200/80'
            : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
        }`}
      >
        <Building2 className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
        <span className="truncate">{node.deptName}</span>
      </button>
      {node.children.map((child) => (
        <DeptNode key={child.id} node={child} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} />
      ))}
    </div>
  );
}

export function DirectoryView() {
  const { user, navigate } = useApp();
  const [tree, setTree] = useState<DepartmentTreeVO[]>([]);
  const [users, setUsers] = useState<UserDirectoryVO[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [deptTree, dirList] = await Promise.all([
          enterpriseApi.getDepartmentTree(),
          enterpriseApi.listDirectory(),
        ]);
        setTree(deptTree);
        setUsers(dirList);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const filtered = filterDirectoryUsers(users, tree, selectedDeptId, query);

  return (
    <div className="mx-auto flex h-full max-w-[1280px] flex-col md:flex-row">
      {/* Left Department Tree */}
      <aside className="w-full md:w-[272px] shrink-0 border-b md:border-b-0 md:border-r border-slate-200/90 bg-white p-4 space-y-2.5">
        <div className="flex items-center justify-between px-2">
          <h2 className="font-display text-xs font-semibold tracking-wide text-slate-500 uppercase">组织架构</h2>
          <span className="font-mono text-[11px] text-slate-400 tabular-nums">{users.length} 人</span>
        </div>
        <button
          type="button"
          onClick={() => setSelectedDeptId(null)}
          className={`block w-full rounded-lg px-3 py-2 text-left text-[13px] transition-all ${
            selectedDeptId === null
              ? 'bg-slate-900 font-medium text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100/80'
          }`}
        >
          全部员工 ({users.length})
        </button>
        <div className="space-y-0.5 pt-1">
          {tree.map((node) => (
            <DeptNode
              key={node.id}
              node={node}
              selectedId={selectedDeptId}
              onSelect={(id) => setSelectedDeptId(id)}
            />
          ))}
        </div>
      </aside>

      {/* Right Directory Table */}
      <section className="flex-1 min-w-0 p-4 md:p-6 space-y-4 overflow-y-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索姓名、工号、职位或邮箱…"
              aria-label="搜索员工通讯录"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-[0_1px_2px_rgba(15,23,42,0.02)] focus:border-blue-600 focus:outline-none"
            />
          </div>
          <span className="font-mono text-xs text-slate-500 tabular-nums">共 {filtered.length} 位同事</span>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          {loading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-11 rounded-lg bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">未找到匹配的员工记录</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="border-b border-slate-200/90 bg-slate-50/80 text-[12px] font-medium text-slate-500">
                  <tr>
                    <th className="px-4 py-3">工号</th>
                    <th className="px-4 py-3">姓名</th>
                    <th className="px-4 py-3">部门 · 职位</th>
                    <th className="px-4 py-3">联系方式</th>
                    <th className="px-4 py-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((col) => (
                    <tr key={col.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500 tabular-nums whitespace-nowrap">
                        {col.employeeNo}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <UserMonogram name={col.realName} size="sm" />
                          <span>{col.realName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {col.deptName ?? '-'} · {col.position ?? '-'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500 tabular-nums">
                        {col.email ?? '-'} {col.phone ? `· ${col.phone}` : ''}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {col.id !== user?.id ? (
                          <button
                            type="button"
                            onClick={() => navigate('messages', { messageUserId: col.id })}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50/60 hover:text-blue-700"
                          >
                            <MessageSquare className="h-3 w-3" />
                            发消息
                          </button>
                        ) : (
                          <span className="text-xs font-medium text-slate-400">本人</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
