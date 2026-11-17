import React, { useEffect, useRef, useState } from 'react';
import { Plus, Send, X } from 'lucide-react';
import { UserMonogram } from '../components/UserMonogram';
import { useApp } from '../context/AppContext';
import { formatShortDateTime } from '../lib/workspace';
import { enterpriseApi } from '../services/apiClient';
import type { ConversationVO, MessageVO, UserDirectoryVO } from '../types/domain';

export function MessagesView() {
  const { user, selectedMessageUserId, refreshUnreadCounts, notify } = useApp();
  const [conversations, setConversations] = useState<ConversationVO[]>([]);
  const [directory, setDirectory] = useState<UserDirectoryVO[]>([]);
  const [activePartnerId, setActivePartnerId] = useState<number | null>(selectedMessageUserId);
  const [messages, setMessages] = useState<MessageVO[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [showNewDm, setShowNewDm] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const loadConversations = async (preferPartnerId?: number | null) => {
    try {
      const [convList, dirList] = await Promise.all([
        enterpriseApi.listConversations(),
        enterpriseApi.listDirectory(),
      ]);
      setConversations(convList);
      setDirectory(dirList.filter((d) => d.id !== user?.id));
      const target = preferPartnerId ?? activePartnerId ?? convList[0]?.userId ?? null;
      setActivePartnerId(target);
    } catch (err) {
      notify(err instanceof Error ? err.message : '加载会话列表失败', 'error');
    }
  };

  useEffect(() => {
    void loadConversations(selectedMessageUserId);
  }, [selectedMessageUserId]);

  useEffect(() => {
    if (!activePartnerId) {
      setMessages([]);
      return;
    }
    const loadThread = async () => {
      try {
        const list = await enterpriseApi.listMessagesWith(activePartnerId);
        setMessages(list);
        await refreshUnreadCounts();
        setConversations((prev) =>
          prev.map((c) => (c.userId === activePartnerId ? { ...c, unreadCount: 0 } : c)),
        );
      } catch (err) {
        notify(err instanceof Error ? err.message : '加载聊天记录失败', 'error');
      }
    };
    void loadThread();
  }, [activePartnerId, refreshUnreadCounts]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePartnerId || !draft.trim() || sending) return;
    setSending(true);
    try {
      const msg = await enterpriseApi.sendMessage({
        receiverId: activePartnerId,
        content: draft.trim(),
      });
      setMessages((prev) => [...prev, msg]);
      setDraft('');
      await loadConversations(activePartnerId);
    } catch (err) {
      notify(err instanceof Error ? err.message : '发送消息失败', 'error');
    } finally {
      setSending(false);
    }
  };

  const activePartner =
    conversations.find((c) => c.userId === activePartnerId) ??
    (() => {
      const d = directory.find((u) => u.id === activePartnerId);
      if (!d) return null;
      return {
        userId: d.id,
        name: d.realName,
        avatar: d.avatar,
        position: d.position,
        deptName: d.deptName,
        lastMessage: '',
        lastTime: '',
        unreadCount: 0,
      } satisfies ConversationVO;
    })();

  return (
    <div className="mx-auto flex h-full max-w-[1280px] flex-col md:flex-row">
      {/* Left Conversation List */}
      <aside className="w-full md:w-[308px] shrink-0 border-b md:border-b-0 md:border-r border-slate-200/90 bg-white flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-200/90 px-4 py-3.5">
          <h2 className="font-display text-sm font-semibold text-slate-900">站内会话</h2>
          <button
            type="button"
            onClick={() => setShowNewDm(true)}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:border-blue-200 hover:bg-blue-50/60 hover:text-blue-700 transition-colors whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            发起私信
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">暂无会话记录，点击右上角选择同事发起私信</div>
          ) : (
            conversations.map((c) => {
              const selected = activePartnerId === c.userId;
              return (
                <button
                  key={c.userId}
                  type="button"
                  onClick={() => setActivePartnerId(c.userId)}
                  className={`flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors ${
                    selected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                  }`}
                >
                  <UserMonogram name={c.name} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[13px] font-semibold truncate ${selected ? 'text-blue-900' : 'text-slate-900'}`}>
                        {c.name}
                      </span>
                      {c.unreadCount > 0 && (
                        <span className="font-mono text-[11px] font-semibold text-blue-600 tabular-nums">{c.unreadCount}</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500 truncate">
                      {c.deptName ?? '-'} · {c.position ?? '-'}
                    </p>
                    <p className="mt-1 truncate text-[12px] text-slate-600">{c.lastMessage}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Right Chat Stream */}
      <section className="flex-1 min-w-0 flex flex-col bg-[#F7F8FA]">
        {!activePartner ? (
          <div className="flex flex-1 items-center justify-center p-8 text-sm text-slate-500">
            选择左侧会话或发起新私信开始沟通
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-slate-200/90 bg-white px-6 py-3.5">
              <UserMonogram name={activePartner.name} size="md" />
              <div className="min-w-0">
                <p className="font-display text-sm font-semibold text-slate-900">{activePartner.name}</p>
                <p className="text-[12px] text-slate-500">
                  {activePartner.deptName ?? '-'} · {activePartner.position ?? '-'}
                </p>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-3.5">
              {messages.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">暂无消息记录，打个招呼吧</div>
              ) : (
                messages.map((m) => {
                  const mine = m.senderId === user?.id;
                  return (
                    <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`max-w-[75%] rounded-xl px-4 py-2.5 text-[13px] leading-relaxed shadow-[0_1px_2px_rgba(15,23,42,0.03)] ${
                          mine
                            ? 'bg-slate-900 text-white'
                            : 'border border-slate-200/90 bg-white text-slate-800'
                        }`}
                      >
                        {m.content}
                      </div>
                      <span className="mt-1 font-mono text-[10px] text-slate-400 tabular-nums">
                        {formatShortDateTime(m.createdAt)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleSend} className="border-t border-slate-200/90 bg-white p-3.5 flex gap-2">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={`发送消息给 ${activePartner.name}…`}
                aria-label="输入站内消息"
                className="h-9 flex-1 rounded-lg border border-slate-200 bg-slate-50/80 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none"
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-medium text-white shadow-xs hover:bg-blue-700 disabled:opacity-40 whitespace-nowrap transition-colors"
              >
                <Send className="h-3.5 w-3.5" />
                发送
              </button>
            </form>
          </>
        )}
      </section>

      {/* Start New DM Modal */}
      {showNewDm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px]">
          <div role="dialog" aria-label="选择同事发起私信" className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold text-slate-900">选择同事发起会话</h3>
              <button type="button" onClick={() => setShowNewDm(false)} aria-label="关闭弹窗" className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 max-h-72 overflow-y-auto divide-y divide-slate-100">
              {directory.map((col) => (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => {
                    setActivePartnerId(col.id);
                    setShowNewDm(false);
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <UserMonogram name={col.realName} size="sm" />
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-slate-900 truncate">{col.realName}</p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {col.deptName ?? '-'} · {col.position ?? '-'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
