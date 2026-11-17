import React, { useState } from 'react';
import {
  Bell,
  BookOpen,
  Calendar,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { isAdminUser } from '../lib/workspace';
import type { WorkspaceView } from '../types/domain';
import { BrandMark } from './BrandMark';
import { GlobalCopilotDrawer } from './GlobalCopilotDrawer';
import { UserMonogram } from './UserMonogram';

interface NavItem {
  id: WorkspaceView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

const VIEW_TITLES: Record<WorkspaceView, string> = {
  workbench: '个人工作台',
  projects: '项目协同',
  meetings: '会议与纪要',
  knowledge: '知识库 RAG',
  agent: 'AI 助手工作区',
  messages: '站内消息',
  notifications: '通知中心',
  directory: '组织通讯录',
  profile: '个人设置',
  admin: '管理后台',
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const {
    user,
    activeView,
    navigate,
    unreadMessages,
    unreadNotifications,
    copilotOpen,
    setCopilotOpen,
    signOut,
    toasts,
    dismissToast,
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const admin = isAdminUser(user);

  const navItems: NavItem[] = [
    { id: 'workbench', label: '工作台', icon: LayoutDashboard },
    { id: 'projects', label: '项目协同', icon: FolderKanban },
    { id: 'meetings', label: '会议与纪要', icon: Calendar },
    { id: 'knowledge', label: '知识库', icon: BookOpen },
    { id: 'agent', label: 'AI 助手', icon: Sparkles },
    { id: 'messages', label: '站内消息', icon: MessageSquare, badge: unreadMessages },
    { id: 'notifications', label: '通知中心', icon: Bell, badge: unreadNotifications },
    { id: 'directory', label: '通讯录', icon: Users },
    ...(admin ? [{ id: 'admin' as WorkspaceView, label: '管理后台', icon: ShieldCheck }] : []),
  ];

  const handleSelectNav = (view: WorkspaceView) => {
    navigate(view);
    setMobileMenuOpen(false);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#F1F3F6] border-r border-slate-200/80">
      <div className="flex h-14 items-center justify-between border-b border-slate-200/80 px-4">
        <button
          type="button"
          onClick={() => handleSelectNav('workbench')}
          className="flex items-center gap-2.5 font-display text-[15px] font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          <BrandMark className="h-6 w-6 shrink-0" />
          <span>Enterprise Pilot</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="关闭导航菜单"
          className="md:hidden inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-200/60"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav aria-label="主工作区导航" className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectNav(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-[13px] font-medium transition-all whitespace-nowrap ${
                active
                  ? 'bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/80'
                  : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </span>
              {typeof item.badge === 'number' && item.badge > 0 && (
                <span className="ml-2 font-mono text-[11px] font-semibold text-blue-600 tabular-nums">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-slate-200/80 p-3 space-y-1.5">
        <button
          type="button"
          onClick={() => handleSelectNav('profile')}
          className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors ${
            activeView === 'profile'
              ? 'bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/80'
              : 'hover:bg-white/70 text-slate-700'
          }`}
        >
          <UserMonogram name={user?.realName ?? '用'} size="md" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-slate-900">{user?.realName}</span>
            <span className="block truncate text-[11px] text-slate-500">
              {user?.deptName ?? '未分配部门'} · {user?.roleName ?? '成员'}
            </span>
          </span>
          <Settings className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        </button>

        <button
          type="button"
          onClick={() => void signOut()}
          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium text-slate-500 hover:bg-white/70 hover:text-red-600 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" />
          <span>退出登录</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F7F8FA] text-slate-900">
      {/* Desktop Fixed Sidebar (248px) */}
      <aside className="hidden md:block w-[248px] shrink-0 h-full">{sidebarContent}</aside>

      {/* Mobile Drawer Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-950/25"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-[260px] h-full">{sidebarContent}</aside>
        </div>
      )}

      {/* Main Viewport Column */}
      <div className="flex flex-1 flex-col min-w-0 h-full">
        {/* Strict Single-Row 56px Top Bar */}
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-slate-200/80 bg-white px-4 md:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="打开导航菜单"
              className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 shrink-0"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 text-[13px] min-w-0">
              <span className="hidden sm:inline text-slate-400 whitespace-nowrap">Enterprise Pilot</span>
              <span className="hidden sm:inline text-slate-300" aria-hidden="true">/</span>
              <h1 className="font-display text-[14px] font-semibold text-slate-900 truncate">
                {VIEW_TITLES[activeView]}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => navigate('notifications')}
              aria-label={`通知中心（${unreadNotifications} 条未读）`}
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 shrink-0"
            >
              <Bell className="h-4 w-4" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded bg-blue-600 px-1 font-mono text-[10px] font-semibold text-white tabular-nums">
                  {unreadNotifications}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setCopilotOpen(!copilotOpen)}
              className={`inline-flex h-9 items-center gap-1.5 rounded-md px-3.5 text-[12px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                copilotOpen
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-900 text-white hover:bg-blue-600'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Copilot</span>
              <kbd className="hidden lg:inline font-mono text-[10px] text-slate-300 ml-0.5">⌘K</kbd>
            </button>
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto">{children}</main>
      </div>

      <GlobalCopilotDrawer />

      {/* Toast Stack */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
          {toasts.map((t) => (
            <div
              key={t.id}
              role="status"
              className={`flex items-center justify-between gap-3 rounded-md border px-3.5 py-2.5 text-[13px] shadow-sm ${
                t.tone === 'error'
                  ? 'border-red-200 bg-red-50 text-red-800'
                  : t.tone === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-white text-slate-800'
              }`}
            >
              <span>{t.message}</span>
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                aria-label="关闭提示"
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
