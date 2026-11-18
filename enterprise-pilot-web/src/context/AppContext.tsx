import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { configureApiClient, enterpriseApi } from '../services/apiClient';
import { dedupeSources } from '../lib/workspace';
import type {
  AgentMessage,
  AgentSession,
  AgentSource,
  AgentStep,
  CopilotContext,
  LoginDTO,
  UserRegisterDTO,
  UserVO,
  WorkspaceView,
} from '../types/domain';

interface ToastItem {
  id: string;
  message: string;
  tone: 'info' | 'success' | 'error';
}

interface NavigateOptions {
  projectId?: number;
  messageUserId?: number;
  documentId?: string;
}

interface OpenCopilotOptions {
  prompt?: string;
  context?: CopilotContext | null;
}

interface AppContextValue {
  token: string | null;
  user: UserVO | null;
  authLoading: boolean;
  activeView: WorkspaceView;
  selectedProjectId: number | null;
  selectedMessageUserId: number | null;
  selectedDocumentId: string | null;
  copilotOpen: boolean;
  setCopilotOpen: (open: boolean) => void;
  copilotContext: CopilotContext | null;
  setCopilotContext: (ctx: CopilotContext | null) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  toggleSidebar: () => void;
  unreadMessages: number;
  unreadNotifications: number;
  sessions: AgentSession[];
  activeSessionId: string;
  setActiveSessionId: (id: string) => void;
  createNewSession: () => string;
  isStreamingAgent: boolean;
  signIn: (dto: LoginDTO) => Promise<void>;
  signUp: (dto: UserRegisterDTO) => Promise<void>;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<void>;
  refreshUnreadCounts: () => Promise<void>;
  navigate: (view: WorkspaceView, opts?: NavigateOptions) => void;
  openCopilot: (opts?: OpenCopilotOptions) => void;
  sendAgentPrompt: (text: string, opts?: { sessionId?: string; attachContext?: CopilotContext | null }) => Promise<void>;
  stopAgentStream: () => void;
  toasts: ToastItem[];
  notify: (message: string, tone?: 'info' | 'success' | 'error') => void;
  dismissToast: (id: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const AUTH_STORAGE_KEY = 'ep_auth_v1';
const SIDEBAR_STORAGE_KEY = 'ep_sidebar_collapsed_v1';

function createEmptySession(title = '新对话'): AgentSession {
  return {
    id: `sess-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title,
    updatedAt: new Date().toISOString(),
    messages: [],
  };
}

function loadSessionsForUser(userId: number): AgentSession[] {
  try {
    const raw = localStorage.getItem(`ep_agent_sessions_${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw) as AgentSession[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return [createEmptySession('工作台智能问答')];
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (raw) return (JSON.parse(raw) as { token?: string }).token ?? null;
    } catch {
      // ignore
    }
    return null;
  });

  const [user, setUser] = useState<UserVO | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(Boolean(token));

  const [activeView, setActiveView] = useState<WorkspaceView>('workbench');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedMessageUserId, setSelectedMessageUserId] = useState<number | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotContext, setCopilotContext] = useState<CopilotContext | null>(null);

  const [sidebarCollapsed, setSidebarCollapsedState] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      return raw ? JSON.parse(raw) === true : false;
    } catch {
      return false;
    }
  });

  const setSidebarCollapsed = useCallback((action: boolean | ((prev: boolean) => boolean)) => {
    setSidebarCollapsedState((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, [setSidebarCollapsed]);

  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const [sessions, setSessions] = useState<AgentSession[]>(() => [createEmptySession('工作台智能问答')]);
  const [activeSessionId, setActiveSessionId] = useState<string>(() => sessions[0]?.id ?? '');
  const [isStreamingAgent, setIsStreamingAgent] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const notify = useCallback((message: string, tone: 'info' | 'success' | 'error' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAuth = useCallback(() => {
    setToken(null);
    setUser(null);
    setUnreadMessages(0);
    setUnreadNotifications(0);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }, []);

  // Configure unified API client whenever auth changes
  useEffect(() => {
    configureApiClient({
      token,
      onUnauthorized: () => {
        clearAuth();
        notify('登录状态已过期，请重新登录', 'error');
      },
    });
  }, [token, clearAuth, notify]);

  const refreshUnreadCounts = useCallback(async () => {
    if (!token) return;
    try {
      const [msgCount, notifCount] = await Promise.all([
        enterpriseApi.getUnreadMessageCount(),
        enterpriseApi.getUnreadNotificationCount(),
      ]);
      setUnreadMessages(msgCount);
      setUnreadNotifications(notifCount);
    } catch {
      // silent during polling
    }
  }, [token]);

  const refreshMe = useCallback(async () => {
    if (!token) {
      setAuthLoading(false);
      return;
    }
    try {
      const profile = await enterpriseApi.getMe();
      setUser(profile);
      const userSessions = loadSessionsForUser(profile.id);
      setSessions(userSessions);
      setActiveSessionId(userSessions[0].id);
      await refreshUnreadCounts();
    } catch {
      clearAuth();
    } finally {
      setAuthLoading(false);
    }
  }, [token, clearAuth, refreshUnreadCounts]);

  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  // Persist agent sessions per user
  useEffect(() => {
    if (!user?.id) return;
    try {
      localStorage.setItem(`ep_agent_sessions_${user.id}`, JSON.stringify(sessions.slice(0, 12)));
    } catch {
      // ignore
    }
  }, [sessions, user?.id]);

  // Adaptive visibility-aware polling every 15s
  useEffect(() => {
    if (!user) return;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshUnreadCounts();
      }
    }, 15000);
    return () => clearInterval(timer);
  }, [user, refreshUnreadCounts]);

  // Global shortcuts (Cmd/Ctrl+K for Copilot, Cmd/Ctrl+B for Sidebar)
  useEffect(() => {
    if (!user) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCopilotOpen((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        const target = e.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable)
        ) {
          return;
        }
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [user, toggleSidebar]);

  const signIn = useCallback(
    async (dto: LoginDTO) => {
      const loginVo = await enterpriseApi.login(dto);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: loginVo.token, userId: loginVo.userId }));
      configureApiClient({ token: loginVo.token });
      setToken(loginVo.token);
      const profile = await enterpriseApi.getMe();
      setUser(profile);
      const userSessions = loadSessionsForUser(profile.id);
      setSessions(userSessions);
      setActiveSessionId(userSessions[0].id);
      setActiveView('workbench');
      await refreshUnreadCounts();
      notify(`欢迎回来，${profile.realName}`, 'success');
    },
    [notify, refreshUnreadCounts],
  );

  const signUp = useCallback(
    async (dto: UserRegisterDTO) => {
      await enterpriseApi.register(dto);
      notify('注册成功，请使用新账号登录', 'success');
    },
    [notify],
  );

  const signOut = useCallback(async () => {
    try {
      await enterpriseApi.logout();
    } catch {
      // ignore network error on logout
    }
    abortRef.current?.abort();
    clearAuth();
    setCopilotOpen(false);
    notify('已安全退出登录', 'info');
  }, [clearAuth, notify]);

  const navigate = useCallback((view: WorkspaceView, opts?: NavigateOptions) => {
    setActiveView(view);
    if (opts?.projectId !== undefined) setSelectedProjectId(opts.projectId);
    if (opts?.messageUserId !== undefined) setSelectedMessageUserId(opts.messageUserId);
    if (opts?.documentId !== undefined) setSelectedDocumentId(opts.documentId);
  }, []);

  const createNewSession = useCallback(() => {
    const next = createEmptySession(`新会话 · ${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`);
    setSessions((prev) => [next, ...prev]);
    setActiveSessionId(next.id);
    return next.id;
  }, []);

  const stopAgentStream = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreamingAgent(false);
  }, []);

  const sendAgentPrompt = useCallback(
    async (text: string, opts?: { sessionId?: string; attachContext?: CopilotContext | null }) => {
      const trimmed = text.trim();
      if (!trimmed || isStreamingAgent) return;

      const targetSessionId = opts?.sessionId || activeSessionId || sessions[0]?.id;
      if (!targetSessionId) return;

      const userMsg: AgentMessage = {
        id: `msg-u-${Date.now()}`,
        role: 'user',
        content: trimmed,
        createdAt: new Date().toISOString(),
      };
      const assistantMsgId = `msg-a-${Date.now() + 1}`;
      const assistantPlaceholder: AgentMessage = {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        steps: [],
        sources: [],
        createdAt: new Date().toISOString(),
      };

      let historySnapshot: { role: 'user' | 'assistant'; content: string }[] = [];

      setSessions((prev) =>
        prev.map((sess) => {
          if (sess.id !== targetSessionId) return sess;
          historySnapshot = sess.messages
            .filter((m) => m.content.trim().length > 0 && !m.error)
            .slice(-8)
            .map((m) => ({ role: m.role, content: m.content }));
          const nextTitle = sess.messages.length === 0 ? trimmed.slice(0, 18) : sess.title;
          return {
            ...sess,
            title: nextTitle,
            updatedAt: new Date().toISOString(),
            messages: [...sess.messages, userMsg, assistantPlaceholder],
          };
        }),
      );

      const controller = new AbortController();
      abortRef.current = controller;
      setIsStreamingAgent(true);

      const updateAssistant = (updater: (msg: AgentMessage) => AgentMessage) => {
        setSessions((prev) =>
          prev.map((sess) =>
            sess.id !== targetSessionId
              ? sess
              : {
                  ...sess,
                  updatedAt: new Date().toISOString(),
                  messages: sess.messages.map((m) => (m.id === assistantMsgId ? updater(m) : m)),
                },
          ),
        );
      };

      try {
        for await (const evt of enterpriseApi.streamAgentChat({
          message: trimmed,
          history: historySnapshot,
          context: opts?.attachContext ?? null,
          signal: controller.signal,
        })) {
          if (evt.kind === 'step') {
            updateAssistant((m) => {
              const steps: AgentStep[] = [...(m.steps ?? [])];
              const idx = steps.findIndex((s) => s.tool === evt.data.tool && s.status === 'running');
              if (evt.data.status === 'done' && idx >= 0) {
                steps[idx] = evt.data;
              } else {
                steps.push(evt.data);
              }
              return { ...m, steps };
            });
          } else if (evt.kind === 'sources') {
            updateAssistant((m) => ({
              ...m,
              sources: dedupeSources([...(m.sources ?? []), ...(evt.data.items as AgentSource[])]),
            }));
          } else if (evt.kind === 'delta') {
            updateAssistant((m) => ({ ...m, content: m.content + evt.data.text }));
          } else if (evt.kind === 'error') {
            updateAssistant((m) => ({ ...m, error: evt.data.message }));
          }
        }
      } catch (err) {
        if ((err as { name?: string }).name === 'AbortError') {
          updateAssistant((m) => ({ ...m, aborted: true }));
        } else {
          const message = err instanceof Error ? err.message : '请求失败，请稍后重试';
          updateAssistant((m) => ({ ...m, error: message }));
        }
      } finally {
        abortRef.current = null;
        setIsStreamingAgent(false);
      }
    },
    [activeSessionId, isStreamingAgent, sessions],
  );

  const openCopilot = useCallback(
    (opts?: OpenCopilotOptions) => {
      if (opts?.context !== undefined) setCopilotContext(opts.context);
      setCopilotOpen(true);
      if (opts?.prompt) {
        void sendAgentPrompt(opts.prompt, { attachContext: opts.context ?? copilotContext });
      }
    },
    [copilotContext, sendAgentPrompt],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      token,
      user,
      authLoading,
      activeView,
      selectedProjectId,
      selectedMessageUserId,
      selectedDocumentId,
      copilotOpen,
      setCopilotOpen,
      copilotContext,
      setCopilotContext,
      sidebarCollapsed,
      setSidebarCollapsed,
      toggleSidebar,
      unreadMessages,
      unreadNotifications,
      sessions,
      activeSessionId,
      setActiveSessionId,
      createNewSession,
      isStreamingAgent,
      signIn,
      signUp,
      signOut,
      refreshMe,
      refreshUnreadCounts,
      navigate,
      openCopilot,
      sendAgentPrompt,
      stopAgentStream,
      toasts,
      notify,
      dismissToast,
    }),
    [
      token,
      user,
      authLoading,
      activeView,
      selectedProjectId,
      selectedMessageUserId,
      selectedDocumentId,
      copilotOpen,
      copilotContext,
      sidebarCollapsed,
      setSidebarCollapsed,
      toggleSidebar,
      unreadMessages,
      unreadNotifications,
      sessions,
      activeSessionId,
      createNewSession,
      isStreamingAgent,
      signIn,
      signUp,
      signOut,
      refreshMe,
      refreshUnreadCounts,
      navigate,
      openCopilot,
      sendAgentPrompt,
      stopAgentStream,
      toasts,
      notify,
      dismissToast,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
