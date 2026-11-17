import React, { useEffect, useState } from 'react';
import { ArrowRight, Bell, Calendar, CheckSquare, FolderKanban, MessageSquare, Sparkles } from 'lucide-react';
import { UserMonogram } from '../components/UserMonogram';
import { useApp } from '../context/AppContext';
import { formatShortDateTime, getProjectStatusMeta, getTaskStatusMeta } from '../lib/workspace';
import { enterpriseApi } from '../services/apiClient';
import type { BookingVO, NotificationVO, ProjectTaskVO, ProjectVO } from '../types/domain';

export function WorkbenchView() {
  const { user, navigate, openCopilot, unreadMessages, unreadNotifications } = useApp();
  const [projects, setProjects] = useState<ProjectVO[]>([]);
  const [tasks, setTasks] = useState<ProjectTaskVO[]>([]);
  const [bookings, setBookings] = useState<BookingVO[]>([]);
  const [notifications, setNotifications] = useState<NotificationVO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quickPrompt, setQuickPrompt] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [projList, taskList, bookingList, notifPage] = await Promise.all([
        enterpriseApi.getMyProjects(),
        enterpriseApi.getMyTasks(),
        enterpriseApi.getMyBookings(),
        enterpriseApi.listNotifications(1, 5),
      ]);
      setProjects(projList);
      setTasks(taskList);
      setBookings(bookingList.filter((b) => b.status === 1));
      setNotifications(notifPage.records);
    } catch (err) {
      setError(err instanceof Error ? err.message : '工作台数据加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const myOpenTasks = tasks.filter((t) => t.isMine && t.status !== 2);
  const myTotalTasks = tasks.filter((t) => t.isMine);

  const handleQuickCopilot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPrompt.trim()) return;
    const text = quickPrompt.trim();
    setQuickPrompt('');
    openCopilot({ prompt: text, context: { view: 'workbench' } });
  };

  return (
    <div className="mx-auto max-w-[1200px] p-4 md:p-6 space-y-6">
      {/* Light Architectural Greeting & Copilot Bar */}
      <section className="rounded-xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/70 to-blue-50/60 bg-grid-subtle p-5 md:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3.5">
            <UserMonogram name={user?.realName ?? '我'} size="lg" />
            <div>
              <h2 className="font-display text-lg font-semibold tracking-tight text-slate-900">
                你好，{user?.realName}
              </h2>
              <p className="mt-0.5 text-[13px] text-slate-500">
                {user?.deptName ?? '企业成员'} · {user?.position ?? '协同办公'} · 今日待推进任务{' '}
                <span className="font-mono font-semibold text-blue-600 tabular-nums">{myOpenTasks.length}</span> 项
              </p>
            </div>
          </div>

          <form onSubmit={handleQuickCopilot} className="flex w-full lg:max-w-md items-center gap-2">
            <div className="relative flex-1">
              <Sparkles className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-blue-600" />
              <input
                type="text"
                value={quickPrompt}
                onChange={(e) => setQuickPrompt(e.target.value)}
                placeholder="向 Copilot 提问：查任务、订会议室或问制度…"
                aria-label="快速向 Copilot 提问"
                className="h-9 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-[13px] text-slate-900 placeholder:text-slate-400 shadow-2xs focus:border-blue-600 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="h-9 rounded-md bg-slate-900 px-4 text-xs font-medium text-white hover:bg-blue-600 transition-colors whitespace-nowrap shrink-0"
            >
              提问
            </button>
          </form>
        </div>
      </section>

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" onClick={() => void loadData()} className="text-xs font-medium underline">
            重试
          </button>
        </div>
      )}

      {/* 4-Column KPI Row with Semantic Tinted Icon Squares */}
      <section className="grid grid-cols-2 lg:grid-cols-4 border border-slate-200/90 rounded-xl bg-white divide-y lg:divide-y-0 lg:divide-x divide-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden">
        <button
          type="button"
          onClick={() => navigate('projects')}
          className="p-4 md:p-5 text-left hover:bg-slate-50/80 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">参与项目</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-600">
              <FolderKanban className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {loading ? '—' : projects.length}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            进行中 {projects.filter((p) => p.status === 1).length} 个
          </p>
        </button>

        <button
          type="button"
          onClick={() => navigate('projects')}
          className="p-4 md:p-5 text-left hover:bg-slate-50/80 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">指派给我的待办</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50 text-emerald-600">
              <CheckSquare className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {loading ? '—' : myOpenTasks.length}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            个人总任务 {myTotalTasks.length} 项
          </p>
        </button>

        <button
          type="button"
          onClick={() => navigate('meetings')}
          className="p-4 md:p-5 text-left hover:bg-slate-50/80 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">有效会议预订</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-50 text-amber-600">
              <Calendar className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {loading ? '—' : bookings.length}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-slate-400">
            {bookings[0] ? `下场 ${formatShortDateTime(bookings[0].startTime)}` : '近期无待开会议'}
          </p>
        </button>

        <button
          type="button"
          onClick={() => navigate('messages')}
          className="p-4 md:p-5 text-left hover:bg-slate-50/80 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">未读消息 / 通知</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
              <MessageSquare className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {unreadMessages} / {unreadNotifications}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">站内即时通信与提醒</p>
        </button>
      </section>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Columns: Active Projects Progress + My Priority Tasks */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Projects Progress Matrix */}
          <section className="rounded-xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-blue-600" />
                <h3 className="font-display text-sm font-semibold text-slate-900">参与项目进展</h3>
              </div>
              <button
                type="button"
                onClick={() => navigate('projects')}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-blue-600 whitespace-nowrap"
              >
                <span>进入项目协同</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {loading ? (
              <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 rounded-lg bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">暂无参与项目</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                {projects.slice(0, 3).map((proj) => {
                  const meta = getProjectStatusMeta(proj.status);
                  return (
                    <button
                      key={proj.id}
                      type="button"
                      onClick={() => navigate('projects', { projectId: proj.id })}
                      className="p-4 text-left hover:bg-slate-50/70 transition-colors flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-[11px] font-medium ${
                              meta.tone === 'active'
                                ? 'text-blue-600'
                                : meta.tone === 'done'
                                  ? 'text-emerald-600'
                                  : 'text-slate-500'
                            }`}
                          >
                            {meta.label}
                          </span>
                          <span className="font-mono text-[11px] font-semibold text-slate-700 tabular-nums">
                            {proj.progress}%
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-1 text-[13px] font-semibold text-slate-900">{proj.projectName}</p>
                      </div>

                      <div className="space-y-2">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full transition-all ${
                              proj.progress >= 60 ? 'bg-blue-600' : 'bg-slate-700'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(4, proj.progress))}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>负责人：{proj.ownerName}</span>
                          <span className="font-mono tabular-nums">{proj.endDate ?? '-'}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* My Priority Tasks */}
          <section className="rounded-xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-emerald-600" />
                <h3 className="font-display text-sm font-semibold text-slate-900">指派给我的任务</h3>
              </div>
              <button
                type="button"
                onClick={() => navigate('projects')}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-blue-600 whitespace-nowrap"
              >
                <span>全部项目与任务</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {loading ? (
              <div className="p-5 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 rounded bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : myOpenTasks.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-slate-600">当前没有指派给您的待完成任务</p>
                <button
                  type="button"
                  onClick={() => navigate('projects')}
                  className="mt-3 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  前往项目协同查看
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {myOpenTasks.slice(0, 6).map((task) => {
                  const statusMeta = getTaskStatusMeta(task.status);
                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => navigate('projects', { projectId: task.projectId })}
                      className="flex w-full items-center justify-between gap-4 px-5 py-3.5 text-left hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-slate-900">{task.title}</p>
                        <p className="mt-0.5 truncate text-[12px] text-slate-500">
                          {task.projectName} ·{' '}
                          <span className={statusMeta.tone === 'active' ? 'text-blue-600 font-medium' : 'text-slate-500'}>
                            {statusMeta.label}
                          </span>
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-[12px] text-slate-500 tabular-nums">
                        {task.dueDate ?? '无截止日期'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Meetings & Notifications */}
        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-amber-600" />
                <h3 className="font-display text-sm font-semibold text-slate-900">近期会议日程</h3>
              </div>
              <button
                type="button"
                onClick={() => navigate('meetings')}
                className="text-xs font-medium text-slate-500 hover:text-blue-600 whitespace-nowrap"
              >
                管理预订
              </button>
            </div>
            {loading ? (
              <div className="p-5 space-y-2.5">
                {[1, 2].map((i) => (
                  <div key={i} className="h-10 rounded bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : bookings.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">暂无有效会议预订</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {bookings.slice(0, 4).map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => navigate('meetings')}
                    className="block w-full px-5 py-3 text-left hover:bg-slate-50/70 transition-colors"
                  >
                    <p className="truncate text-[13px] font-medium text-slate-900">{b.title}</p>
                    <p className="mt-0.5 text-[12px] text-slate-500 font-mono tabular-nums">
                      {b.roomName} · {formatShortDateTime(b.startTime)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-indigo-600" />
                <h3 className="font-display text-sm font-semibold text-slate-900">最新系统通知</h3>
              </div>
              <button
                type="button"
                onClick={() => navigate('notifications')}
                className="text-xs font-medium text-slate-500 hover:text-blue-600 whitespace-nowrap"
              >
                查看全部
              </button>
            </div>
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">暂无通知</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.slice(0, 3).map((n) => (
                  <div key={n.id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`truncate text-[13px] ${n.isRead === 0 ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                        {n.title}
                      </p>
                      <span className="shrink-0 font-mono text-[11px] text-slate-400 tabular-nums">
                        {formatShortDateTime(n.createdAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[12px] text-slate-500">{n.content}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
