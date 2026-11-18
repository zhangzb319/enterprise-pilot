import React, { useEffect, useState } from 'react';
import { FolderPlus, MessageSquare, Plus, Reply, Search, Sparkles, X } from 'lucide-react';
import { UserMonogram } from '../components/UserMonogram';
import { useApp } from '../context/AppContext';
import { enterpriseApi } from '../services/apiClient';
import { filterTasks, formatShortDateTime, getProjectStatusMeta, getTaskStatusMeta } from '../lib/workspace';
import type { DiscussionTreeVO, ProjectTaskVO, ProjectVO, UserDirectoryVO } from '../types/domain';

function DiscussionNode({
  node,
  depth = 0,
  replyTargetId,
  onSelectReply,
  replyText,
  onReplyTextChange,
  onSubmitReply,
  submitting,
}: {
  node: DiscussionTreeVO;
  depth?: number;
  replyTargetId: number | null;
  onSelectReply: (id: number | null) => void;
  replyText: string;
  onReplyTextChange: (val: string) => void;
  onSubmitReply: (parentId: number) => Promise<void>;
  submitting: boolean;
}) {
  const isReplying = replyTargetId === node.id;
  return (
    <div className={depth > 0 ? 'ml-5 border-l border-slate-200 pl-4 pt-3' : 'pt-3 first:pt-0'}>
      <div className="rounded-lg border border-slate-200/90 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
        <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <UserMonogram name={node.userName} size="sm" />
            <span className="font-medium text-slate-900">{node.userName}</span>
          </div>
          <span className="font-mono tabular-nums">{formatShortDateTime(node.createdAt)}</span>
        </div>
        <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-700">{node.content}</p>
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => onSelectReply(isReplying ? null : node.id)}
            className="inline-flex items-center gap-1 text-[12px] font-medium text-slate-500 hover:text-blue-600"
          >
            <Reply className="h-3 w-3" />
            <span>{isReplying ? '取消回复' : '回复'}</span>
          </button>
        </div>

        {isReplying && (
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => onReplyTextChange(e.target.value)}
              placeholder={`回复 ${node.userName}…`}
              className="h-8 flex-1 rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
            />
            <button
              type="button"
              disabled={submitting || !replyText.trim()}
              onClick={() => void onSubmitReply(node.id)}
              className="h-8 rounded-md bg-slate-900 px-3 text-xs font-medium text-white hover:bg-blue-600 disabled:opacity-40 whitespace-nowrap"
            >
              发送回复
            </button>
          </div>
        )}
      </div>

      {node.children.map((child) => (
        <DiscussionNode
          key={child.id}
          node={child}
          depth={depth + 1}
          replyTargetId={replyTargetId}
          onSelectReply={onSelectReply}
          replyText={replyText}
          onReplyTextChange={onReplyTextChange}
          onSubmitReply={onSubmitReply}
          submitting={submitting}
        />
      ))}
    </div>
  );
}

export function ProjectsView() {
  const { selectedProjectId, openCopilot, notify } = useApp();
  const [projects, setProjects] = useState<ProjectVO[]>([]);
  const [activeId, setActiveId] = useState<number | null>(selectedProjectId);
  const [tasks, setTasks] = useState<ProjectTaskVO[]>([]);
  const [discussions, setDiscussions] = useState<DiscussionTreeVO[]>([]);
  const [directory, setDirectory] = useState<UserDirectoryVO[]>([]);
  const [tab, setTab] = useState<'tasks' | 'discussions'>('tasks');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  const [onlyMine, setOnlyMine] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 0 | 1 | 2>('all');
  const [taskQuery, setTaskQuery] = useState('');

  const [rootComment, setRootComment] = useState('');
  const [replyTargetId, setReplyTargetId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [postingDiscussion, setPostingDiscussion] = useState(false);

  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projName, setProjName] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projEnd, setProjEnd] = useState('');

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskAssigneeId, setTaskAssigneeId] = useState<string>('');
  const [taskDue, setTaskDue] = useState('');

  const loadProjects = async (preferId?: number | null) => {
    setLoading(true);
    try {
      const [list, users] = await Promise.all([enterpriseApi.getMyProjects(), enterpriseApi.listDirectory()]);
      setProjects(list);
      setDirectory(users);
      const nextId = preferId && list.some((p) => p.id === preferId) ? preferId : list[0]?.id ?? null;
      setActiveId(nextId);
    } catch (err) {
      notify(err instanceof Error ? err.message : '加载项目失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadProjectDetail = async (projectId: number) => {
    setDetailLoading(true);
    try {
      const [taskList, myAggregated, tree] = await Promise.all([
        enterpriseApi.getProjectTasks(projectId),
        enterpriseApi.getMyTasks(),
        enterpriseApi.getDiscussionTree(projectId),
      ]);
      const mineIds = new Set(myAggregated.filter((t) => t.isMine).map((t) => t.id));
      setTasks(taskList.map((t) => ({ ...t, isMine: t.isMine ?? mineIds.has(t.id) })));
      setDiscussions(tree);
    } catch (err) {
      notify(err instanceof Error ? err.message : '加载项目详情失败', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    void loadProjects(selectedProjectId);
  }, [selectedProjectId]);

  useEffect(() => {
    if (activeId !== null) {
      void loadProjectDetail(activeId);
    } else {
      setTasks([]);
      setDiscussions([]);
    }
  }, [activeId]);

  const activeProject = projects.find((p) => p.id === activeId) ?? null;
  const filteredTasks = filterTasks(tasks, { onlyMine, status: statusFilter, query: taskQuery });

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projName.trim()) return;
    try {
      await enterpriseApi.createProject({
        projectName: projName.trim(),
        description: projDesc.trim() || undefined,
        endDate: projEnd || undefined,
      });
      setShowProjectModal(false);
      setProjName('');
      setProjDesc('');
      setProjEnd('');
      notify('项目创建成功', 'success');
      await loadProjects();
    } catch (err) {
      notify(err instanceof Error ? err.message : '创建项目失败', 'error');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeId || !taskTitle.trim()) return;
    try {
      await enterpriseApi.createTask(activeId, {
        title: taskTitle.trim(),
        description: taskDesc.trim() || undefined,
        assigneeId: taskAssigneeId ? Number(taskAssigneeId) : undefined,
        dueDate: taskDue || undefined,
      });
      setShowTaskModal(false);
      setTaskTitle('');
      setTaskDesc('');
      setTaskAssigneeId('');
      setTaskDue('');
      notify('任务创建成功', 'success');
      await loadProjectDetail(activeId);
    } catch (err) {
      notify(err instanceof Error ? err.message : '创建任务失败', 'error');
    }
  };

  const handleUpdateTaskStatus = async (taskId: number, newStatus: number) => {
    try {
      await enterpriseApi.updateTaskStatus(taskId, newStatus, activeId ?? undefined);
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)),
      );
      notify('任务状态已更新', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : '更新状态失败', 'error');
    }
  };

  const handleSubmitDiscussion = async (parentId: number) => {
    if (!activeId) return;
    const content = parentId === 0 ? rootComment.trim() : replyText.trim();
    if (!content) return;
    setPostingDiscussion(true);
    try {
      await enterpriseApi.createDiscussion(activeId, { content, parentId });
      if (parentId === 0) setRootComment('');
      else {
        setReplyText('');
        setReplyTargetId(null);
      }
      await loadProjectDetail(activeId);
      notify('讨论已发布', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : '发布讨论失败', 'error');
    } finally {
      setPostingDiscussion(false);
    }
  };

  return (
    <div className="mx-auto flex h-full max-w-[1280px] flex-col md:flex-row">
      {/* Left Project List Column */}
      <aside className="w-full md:w-[296px] shrink-0 border-b md:border-b-0 md:border-r border-slate-200/80 bg-white flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3.5">
          <h2 className="font-display text-sm font-semibold text-slate-900">我的项目 ({projects.length})</h2>
          <button
            type="button"
            onClick={() => setShowProjectModal(true)}
            className="inline-flex h-8 items-center gap-1 rounded-md bg-slate-900 px-2.5 text-xs font-medium text-white hover:bg-blue-600 transition-colors whitespace-nowrap"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            新建项目
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {loading ? (
            <div className="p-4 space-y-2.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">暂无参与项目，点击右上角新建</div>
          ) : (
            projects.map((p) => {
              const selected = p.id === activeId;
              const status = getProjectStatusMeta(p.status);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActiveId(p.id)}
                  className={`block w-full px-4 py-3.5 text-left transition-colors ${
                    selected ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`truncate text-[13px] font-semibold ${selected ? 'text-blue-700' : 'text-slate-900'}`}>
                      {p.projectName}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] font-medium text-slate-500 tabular-nums">{p.progress}%</span>
                  </div>
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${selected ? 'bg-blue-600' : 'bg-slate-400'}`}
                      style={{ width: `${Math.min(100, Math.max(4, p.progress))}%` }}
                    />
                  </div>
                  <p className="mt-1.5 truncate text-[12px] text-slate-500">
                    {status.label} · 负责人 {p.ownerName}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Right Workspace Pane */}
      <section className="flex-1 min-w-0 flex flex-col bg-[#F7F8FA]">
        {!activeProject ? (
          <div className="flex flex-1 items-center justify-center p-8 text-sm text-slate-500">
            请从左侧选择一个项目查看任务与讨论
          </div>
        ) : (
          <>
            <div className="border-b border-slate-200/80 bg-white px-6 py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="font-display text-base font-semibold text-slate-900 truncate">
                      {activeProject.projectName}
                    </h3>
                    <span className="font-mono text-xs font-semibold text-blue-600 tabular-nums shrink-0">
                      {activeProject.progress}%
                    </span>
                  </div>
                  <p className="mt-0.5 text-[13px] text-slate-500">
                    {activeProject.description || '暂无项目描述'} · 周期 {activeProject.startDate ?? '-'} 至{' '}
                    {activeProject.endDate ?? '-'}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      openCopilot({
                        prompt: `请汇总项目「${activeProject.projectName}」当前任务风险与推进建议`,
                        context: { view: 'projects', projectId: activeProject.id, projectName: activeProject.projectName },
                      })
                    }
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:border-blue-300 hover:text-blue-700 whitespace-nowrap"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                    问 Copilot 此项目
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTaskModal(true)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md bg-slate-900 px-3 text-xs font-medium text-white hover:bg-blue-600 transition-colors whitespace-nowrap"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    新建任务
                  </button>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setTab('tasks')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    tab === 'tasks' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  任务列表 ({tasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTab('discussions')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    tab === 'discussions' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  讨论树 ({discussions.length})
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {tab === 'tasks' ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={taskQuery}
                          onChange={(e) => setTaskQuery(e.target.value)}
                          placeholder="搜索任务标题或负责人…"
                          aria-label="搜索项目任务"
                          className="h-8 w-56 rounded-md border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center rounded-md border border-slate-200 bg-white p-0.5">
                        {(['all', 0, 1, 2] as const).map((st) => (
                          <button
                            key={String(st)}
                            type="button"
                            onClick={() => setStatusFilter(st)}
                            className={`rounded px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
                              statusFilter === st ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {st === 'all' ? '全部状态' : getTaskStatusMeta(st).label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setOnlyMine((v) => !v)}
                      className={`h-8 rounded-md border px-3 text-xs font-medium transition-colors whitespace-nowrap ${
                        onlyMine
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      仅看指派给我
                    </button>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                    {detailLoading ? (
                      <div className="p-5 space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="h-9 rounded bg-slate-100 animate-pulse" />
                        ))}
                      </div>
                    ) : filteredTasks.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500">没有符合筛选条件的任务</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-[13px]">
                          <thead className="border-b border-slate-200 bg-slate-50 text-[12px] font-medium text-slate-500">
                            <tr>
                              <th className="px-4 py-2.5">任务名称</th>
                              <th className="px-4 py-2.5">状态</th>
                              <th className="px-4 py-2.5">负责人</th>
                              <th className="px-4 py-2.5 text-right">截止日期</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredTasks.map((t) => {
                              const st = getTaskStatusMeta(t.status);
                              return (
                                <tr key={t.id} className="hover:bg-slate-50/70">
                                  <td className="px-4 py-3">
                                    <p className="font-medium text-slate-900">{t.title}</p>
                                    {t.description && (
                                      <p className="mt-0.5 text-[12px] text-slate-500 line-clamp-1">{t.description}</p>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-[12px]">
                                    <select
                                      aria-label={`修改任务「${t.title}」状态`}
                                      value={t.status}
                                      onChange={(e) => void handleUpdateTaskStatus(t.id, Number(e.target.value))}
                                      className={`rounded border px-2 py-1 text-xs font-medium cursor-pointer transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                        st.tone === 'done'
                                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                          : st.tone === 'active'
                                            ? 'border-blue-200 bg-blue-50 text-blue-800'
                                            : 'border-slate-200 bg-slate-50 text-slate-700'
                                      }`}
                                    >
                                      <option value={0}>待开始</option>
                                      <option value={1}>进行中</option>
                                      <option value={2}>已完成</option>
                                    </select>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-[12px] text-slate-700">
                                    <div className="flex items-center gap-2">
                                      <UserMonogram name={t.assigneeName ?? '未'} size="sm" />
                                      <span>
                                        {t.assigneeName ?? '未指派'}
                                        {t.isMine ? '（我）' : ''}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-right font-mono text-[12px] text-slate-500 tabular-nums whitespace-nowrap">
                                    {t.dueDate ?? '—'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="max-w-3xl space-y-5">
                  <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
                    <label htmlFor="root-discussion" className="block text-xs font-medium text-slate-700">
                      发起项目讨论
                    </label>
                    <textarea
                      id="root-discussion"
                      rows={2}
                      value={rootComment}
                      onChange={(e) => setRootComment(e.target.value)}
                      placeholder="同步进展、技术决策或会议纪要…"
                      className="mt-2 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
                    />
                    <div className="mt-2.5 flex justify-end">
                      <button
                        type="button"
                        disabled={postingDiscussion || !rootComment.trim()}
                        onClick={() => void handleSubmitDiscussion(0)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md bg-slate-900 px-3.5 text-xs font-medium text-white hover:bg-blue-600 transition-colors disabled:opacity-40"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        发布主题
                      </button>
                    </div>
                  </div>

                  {discussions.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
                      暂无讨论帖，发布第一条项目沟通记录吧
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {discussions.map((node) => (
                        <DiscussionNode
                          key={node.id}
                          node={node}
                          replyTargetId={replyTargetId}
                          onSelectReply={(id) => {
                            setReplyTargetId(id);
                            setReplyText('');
                          }}
                          replyText={replyText}
                          onReplyTextChange={setReplyText}
                          onSubmitReply={handleSubmitDiscussion}
                          submitting={postingDiscussion}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {/* Create Project Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
          <div role="dialog" aria-label="新建项目" className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-semibold text-slate-900">新建协作项目</h3>
              <button type="button" onClick={() => setShowProjectModal(false)} aria-label="关闭弹窗" className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateProject} className="mt-4 space-y-3.5">
              <div>
                <label htmlFor="new-proj-name" className="block text-xs font-medium text-slate-700">项目名称 *</label>
                <input
                  id="new-proj-name"
                  required
                  value={projName}
                  onChange={(e) => setProjName(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-slate-200 px-3 text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="new-proj-desc" className="block text-xs font-medium text-slate-700">项目目标与描述</label>
                <textarea
                  id="new-proj-desc"
                  rows={2}
                  value={projDesc}
                  onChange={(e) => setProjDesc(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="new-proj-end" className="block text-xs font-medium text-slate-700">计划结束日期</label>
                <input
                  id="new-proj-end"
                  type="date"
                  value={projEnd}
                  onChange={(e) => setProjEnd(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-slate-200 px-3 text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowProjectModal(false)} className="h-9 rounded-md border border-slate-200 px-4 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  取消
                </button>
                <button type="submit" className="h-9 rounded-md bg-slate-900 px-4 text-xs font-medium text-white hover:bg-blue-600">
                  创建项目
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
          <div role="dialog" aria-label="新建任务" className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-semibold text-slate-900">新建项目任务</h3>
              <button type="button" onClick={() => setShowTaskModal(false)} aria-label="关闭弹窗" className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="mt-4 space-y-3.5">
              <div>
                <label htmlFor="new-task-title" className="block text-xs font-medium text-slate-700">任务标题 *</label>
                <input
                  id="new-task-title"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-slate-200 px-3 text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="new-task-desc" className="block text-xs font-medium text-slate-700">任务说明</label>
                <textarea
                  id="new-task-desc"
                  rows={2}
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="new-task-assignee" className="block text-xs font-medium text-slate-700">指派人</label>
                  <select
                    id="new-task-assignee"
                    value={taskAssigneeId}
                    onChange={(e) => setTaskAssigneeId(e.target.value)}
                    className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-sm focus:border-blue-600 focus:outline-none"
                  >
                    <option value="">默认指派给我</option>
                    {directory.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.realName} ({u.deptName ?? '-'})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="new-task-due" className="block text-xs font-medium text-slate-700">截止日期</label>
                  <input
                    id="new-task-due"
                    type="date"
                    value={taskDue}
                    onChange={(e) => setTaskDue(e.target.value)}
                    className="mt-1 h-9 w-full rounded-md border border-slate-200 px-3 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowTaskModal(false)} className="h-9 rounded-md border border-slate-200 px-4 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  取消
                </button>
                <button type="submit" className="h-9 rounded-md bg-slate-900 px-4 text-xs font-medium text-white hover:bg-blue-600">
                  添加任务
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
