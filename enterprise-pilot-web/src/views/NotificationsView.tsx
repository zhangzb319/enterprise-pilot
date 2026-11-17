import React, { useEffect, useState } from 'react';
import { Check, CheckCheck, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatShortDateTime } from '../lib/workspace';
import { enterpriseApi } from '../services/apiClient';
import type { NotificationVO } from '../types/domain';

export function NotificationsView() {
  const { refreshUnreadCounts, notify } = useApp();
  const [records, setRecords] = useState<NotificationVO[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const page = await enterpriseApi.listNotifications(1, 50);
      setRecords(page.records);
      await refreshUnreadCounts();
    } catch (err) {
      notify(err instanceof Error ? err.message : '加载通知失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleMarkRead = async (id: number) => {
    try {
      await enterpriseApi.markNotificationRead(id);
      setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, isRead: 1 } : r)));
      await refreshUnreadCounts();
    } catch (err) {
      notify(err instanceof Error ? err.message : '操作失败', 'error');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await enterpriseApi.markAllNotificationsRead();
      setRecords((prev) => prev.map((r) => ({ ...r, isRead: 1 })));
      await refreshUnreadCounts();
      notify('已将全部通知标记为已读', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : '操作失败', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await enterpriseApi.deleteNotification(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
      await refreshUnreadCounts();
    } catch (err) {
      notify(err instanceof Error ? err.message : '删除失败', 'error');
    }
  };

  const visible = filter === 'unread' ? records.filter((r) => r.isRead === 0) : records;

  return (
    <div className="mx-auto max-w-[920px] p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-md border border-zinc-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`rounded px-3 py-1 text-xs font-medium ${
              filter === 'all' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            全部通知 ({records.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('unread')}
            className={`rounded px-3 py-1 text-xs font-medium ${
              filter === 'unread' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            未读 ({records.filter((r) => r.isRead === 0).length})
          </button>
        </div>

        <button
          type="button"
          onClick={() => void handleMarkAllRead()}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50 whitespace-nowrap"
        >
          <CheckCheck className="h-3.5 w-3.5" />
          全部标记已读
        </button>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white divide-y divide-zinc-100">
        {loading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded bg-zinc-100 animate-pulse" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="p-10 text-center text-xs text-zinc-500">当前没有{filter === 'unread' ? '未读' : ''}通知</div>
        ) : (
          visible.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-zinc-50/70">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span className="font-mono">{item.type}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{formatShortDateTime(item.createdAt)}</span>
                  <span aria-hidden="true">·</span>
                  <span className={item.isRead === 0 ? 'font-medium text-blue-600' : 'text-zinc-400'}>
                    {item.isRead === 0 ? '未读' : '已读'}
                  </span>
                </div>
                <p className={`mt-1 text-[14px] ${item.isRead === 0 ? 'font-semibold text-zinc-900' : 'font-medium text-zinc-700'}`}>
                  {item.title}
                </p>
                <p className="mt-0.5 text-[13px] text-zinc-600">{item.content}</p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {item.isRead === 0 && (
                  <button
                    type="button"
                    onClick={() => void handleMarkRead(item.id)}
                    aria-label={`标记「${item.title}」为已读`}
                    className="inline-flex h-8 items-center gap-1 rounded-md border border-zinc-200 px-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    <Check className="h-3.5 w-3.5" />
                    已读
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void handleDelete(item.id)}
                  aria-label={`删除通知「${item.title}」`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
