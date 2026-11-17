import React from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { AgentConversationPanel } from '../components/AgentConversationPanel';
import { useApp } from '../context/AppContext';
import { formatShortDateTime } from '../lib/workspace';

export function AgentView() {
  const { sessions, activeSessionId, setActiveSessionId, createNewSession } = useApp();
  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? sessions[0];

  return (
    <div className="mx-auto flex h-full max-w-[1280px] flex-col md:flex-row">
      {/* Left Session History Sidebar */}
      <aside className="w-full md:w-[276px] shrink-0 border-b md:border-b-0 md:border-r border-slate-200/90 bg-white flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-200/90 px-4 py-3.5">
          <h2 className="font-display text-sm font-semibold text-slate-900">历史会话 ({sessions.length})</h2>
          <button
            type="button"
            onClick={() => createNewSession()}
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-blue-600 px-2.5 text-xs font-medium text-white shadow-xs hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
            新对话
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {sessions.map((s) => {
            const active = s.id === activeSession?.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveSessionId(s.id)}
                className={`block w-full px-4 py-3 text-left transition-colors ${
                  active ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                }`}
              >
                <p className={`truncate text-[13px] font-medium ${active ? 'text-blue-900' : 'text-slate-900'}`}>{s.title}</p>
                <p className="mt-0.5 text-[11px] font-mono text-slate-400 tabular-nums">
                  {s.messages.length} 条消息 · {formatShortDateTime(s.updatedAt)}
                </p>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main Agent Conversation Area */}
      <section className="flex-1 min-w-0 bg-[#F7F8FA]">
        {activeSession && <AgentConversationPanel session={activeSession} />}
      </section>
    </div>
  );
}
