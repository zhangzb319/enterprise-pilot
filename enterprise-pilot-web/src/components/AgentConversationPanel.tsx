import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, BookOpen, Check, Loader2, RotateCcw, Sparkles, Square, Wrench } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getToolLabel } from '../lib/sse';
import type { AgentSession, CopilotContext } from '../types/domain';
import { MarkdownRenderer } from './MarkdownRenderer';

interface AgentConversationPanelProps {
  session: AgentSession;
  compact?: boolean;
  attachedContext?: CopilotContext | null;
  onClearContext?: () => void;
  onOpenSourceDocument?: (documentId: string) => void;
}

const SUGGESTIONS = [
  '我有哪些指派给我的待办任务？',
  '差旅住宿和餐补报销标准是什么？',
  '今天有哪些会议日程和可用会议室？',
  '帮我查一下研发中心有哪些同事',
];

export function AgentConversationPanel({
  session,
  compact = false,
  attachedContext,
  onClearContext,
  onOpenSourceDocument,
}: AgentConversationPanelProps) {
  const { sendAgentPrompt, stopAgentStream, isStreamingAgent, navigate, setCopilotOpen } = useApp();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [session.messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreamingAgent) return;
    const text = input;
    setInput('');
    await sendAgentPrompt(text, { sessionId: session.id, attachContext: attachedContext });
  };

  const handleSourceClick = (docId: string) => {
    if (onOpenSourceDocument) {
      onOpenSourceDocument(docId);
    } else {
      navigate('knowledge', { documentId: docId });
      setCopilotOpen(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {attachedContext && (attachedContext.projectName || attachedContext.bookingTitle || attachedContext.documentTitle) && (
        <div className="flex items-center justify-between border-b border-blue-200/70 bg-blue-50/70 px-4 py-2 text-xs text-blue-800">
          <span className="truncate">
            已挂载上下文：<strong className="font-semibold text-blue-950">{attachedContext.projectName || attachedContext.bookingTitle || attachedContext.documentTitle}</strong>
          </span>
          {onClearContext && (
            <button
              type="button"
              onClick={onClearContext}
              className="ml-2 shrink-0 text-blue-600 hover:text-blue-900 whitespace-nowrap"
            >
              移除
            </button>
          )}
        </div>
      )}

      <div ref={scrollRef} className={`flex-1 overflow-y-auto ${compact ? 'p-4 space-y-5' : 'p-6 space-y-6'}`}>
        {session.messages.length === 0 ? (
          <div className="mx-auto flex max-w-xl flex-col justify-center py-6">
            <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-200/70">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-display text-sm font-semibold text-slate-900">Enterprise Pilot 智能助手</p>
                  <p className="text-[12px] text-slate-500">Node SSE 流式调度 · 6 企业工具联动</p>
                </div>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-slate-600">
                可一键检索内部知识库规范、查询我的待办任务、我的项目进展、会议室预订日程与组织通讯录。
              </p>
              <div className="mt-4 grid grid-cols-1 gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void sendAgentPrompt(s, { sessionId: session.id, attachContext: attachedContext })}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-left text-[13px] text-slate-700 transition-all hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-900"
                  >
                    <span className="truncate">{s}</span>
                    <ArrowUp className="ml-2 h-3.5 w-3.5 shrink-0 rotate-45 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          session.messages.map((msg, index) => {
            const isLast = index === session.messages.length - 1;
            if (msg.role === 'user') {
              return (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-xl bg-slate-900 px-4 py-2.5 text-[14px] leading-relaxed text-white shadow-xs">
                    {msg.content}
                  </div>
                </div>
              );
            }

            return (
              <div key={msg.id} className="space-y-3">
                {msg.steps && msg.steps.length > 0 && (
                  <div className="rounded-xl border border-slate-200/90 bg-slate-50/90 px-3.5 py-2.5 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                      <Wrench className="h-3 w-3 text-blue-600" />
                      <span>工具执行链路</span>
                    </div>
                    <div className="space-y-1.5">
                      {msg.steps.map((step, sIdx) => (
                        <div key={`${step.tool}-${sIdx}`} className="flex items-center justify-between gap-2 text-[12px]">
                          <div className="flex items-center gap-2 min-w-0">
                            {step.status === 'running' ? (
                              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-blue-600" />
                            ) : (
                              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                            )}
                            <span className="font-medium text-slate-800 truncate">{getToolLabel(step.tool)}</span>
                          </div>
                          {step.summary && (
                            <span className="shrink-0 font-mono text-[11px] text-slate-500 tabular-nums">{step.summary}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {msg.content ? (
                  <div className="rounded-xl border border-slate-200/90 bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                    <MarkdownRenderer content={msg.content} />
                  </div>
                ) : isStreamingAgent && isLast && !msg.error ? (
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-4 py-3 text-[13px] text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                    <span>正在调度工具并合成回答…</span>
                  </div>
                ) : null}

                {msg.sources && msg.sources.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium text-slate-500">参考知识库文档（{msg.sources.length}）</p>
                    <div className="flex flex-wrap gap-2">
                      {msg.sources.map((src) => (
                        <button
                          key={src.document_id}
                          type="button"
                          onClick={() => handleSourceClick(src.document_id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-medium text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-700"
                        >
                          <BookOpen className="h-3.5 w-3.5 text-blue-600" />
                          <span>{src.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {msg.aborted && (
                  <p className="text-xs text-slate-400">已手动停止本轮生成。</p>
                )}

                {msg.error && (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
                    <span>{msg.error}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const prevUser = [...session.messages]
                          .slice(0, index)
                          .reverse()
                          .find((m) => m.role === 'user');
                        if (prevUser) {
                          void sendAgentPrompt(prevUser.content, { sessionId: session.id, attachContext: attachedContext });
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded border border-red-200 bg-white px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-50 shrink-0 whitespace-nowrap"
                    >
                      <RotateCcw className="h-3 w-3" />
                      重试
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-slate-200/90 bg-white p-3">
        <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-2 focus-within:border-blue-600 focus-within:bg-white transition-colors">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSubmit(e);
              }
            }}
            rows={2}
            placeholder="输入问题，Enter 发送 · Shift+Enter 换行"
            aria-label="向 AI 助手提问"
            className="flex-1 resize-none bg-transparent px-1.5 py-1 text-[14px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          {isStreamingAgent ? (
            <button
              type="button"
              onClick={stopAgentStream}
              aria-label="停止生成"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 hover:bg-slate-50 shrink-0 whitespace-nowrap"
            >
              <Square className="h-3 w-3 fill-current" />
              停止
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="发送消息"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-xs font-medium text-white shadow-xs hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 shrink-0 whitespace-nowrap transition-colors"
            >
              <ArrowUp className="h-3.5 w-3.5" />
              发送
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
