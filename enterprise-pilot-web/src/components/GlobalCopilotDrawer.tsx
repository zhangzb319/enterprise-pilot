import React from 'react';
import { Maximize2, Plus, Sparkles, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AgentConversationPanel } from './AgentConversationPanel';

export function GlobalCopilotDrawer() {
  const {
    copilotOpen,
    setCopilotOpen,
    copilotContext,
    setCopilotContext,
    sessions,
    activeSessionId,
    createNewSession,
    navigate,
  } = useApp();

  if (!copilotOpen) return null;

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? sessions[0];

  return (
    <aside
      aria-label="全局 Copilot 抽屉"
      className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[400px] flex-col border-l border-slate-200/90 bg-white shadow-xl lg:static lg:z-auto lg:h-full lg:w-[400px] lg:shrink-0 lg:shadow-none"
    >
      <div className="flex h-14 items-center justify-between border-b border-slate-200/90 px-4">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="h-4 w-4 shrink-0 text-blue-600" />
          <span className="font-display text-sm font-semibold text-slate-900 truncate">Copilot 助手</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => createNewSession()}
            title="新建对话"
            aria-label="新建 Copilot 对话"
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:border-blue-200 hover:bg-blue-50/60 hover:text-blue-700 transition-colors whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            新会话
          </button>
          <button
            type="button"
            onClick={() => {
              navigate('agent');
              setCopilotOpen(false);
            }}
            title="在独立工作区展开"
            aria-label="展开至独立 AI 助手页面"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setCopilotOpen(false)}
            aria-label="关闭 Copilot 抽屉"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-[#F7F8FA]">
        {activeSession && (
          <AgentConversationPanel
            session={activeSession}
            compact
            attachedContext={copilotContext}
            onClearContext={() => setCopilotContext(null)}
          />
        )}
      </div>
    </aside>
  );
}
