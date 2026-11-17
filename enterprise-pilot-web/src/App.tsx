/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppShell } from './components/AppShell';
import { AppProvider, useApp } from './context/AppContext';
import { AdminView } from './views/AdminView';
import { AgentView } from './views/AgentView';
import { AuthView } from './views/AuthView';
import { DirectoryView } from './views/DirectoryView';
import { KnowledgeView } from './views/KnowledgeView';
import { MeetingsView } from './views/MeetingsView';
import { MessagesView } from './views/MessagesView';
import { NotificationsView } from './views/NotificationsView';
import { ProfileView } from './views/ProfileView';
import { ProjectsView } from './views/ProjectsView';
import { WorkbenchView } from './views/WorkbenchView';

function WorkspaceRouter() {
  const { user, authLoading, activeView } = useApp();

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] text-sm text-zinc-500">
        正在恢复工作台会话…
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  const renderView = () => {
    switch (activeView) {
      case 'projects':
        return <ProjectsView />;
      case 'meetings':
        return <MeetingsView />;
      case 'knowledge':
        return <KnowledgeView />;
      case 'agent':
        return <AgentView />;
      case 'messages':
        return <MessagesView />;
      case 'notifications':
        return <NotificationsView />;
      case 'directory':
        return <DirectoryView />;
      case 'profile':
        return <ProfileView />;
      case 'admin':
        return <AdminView />;
      case 'workbench':
      default:
        return <WorkbenchView />;
    }
  };

  return <AppShell>{renderView()}</AppShell>;
}

export default function App() {
  return (
    <AppProvider>
      <WorkspaceRouter />
    </AppProvider>
  );
}
