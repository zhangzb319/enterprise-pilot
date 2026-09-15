<template>
  <div class="layout">
    <!-- ======== Sidebar ======== -->
    <aside class="sidebar" :class="{ collapsed: appStore.sidebarCollapsed }">
      <div class="sidebar-brand">
        <div class="brand-mark">
          <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
            <rect x="1" y="1" width="30" height="30" rx="8" fill="#292524" stroke="#44403c" stroke-width="1"/>
            <path d="M9 11.5h14M9 16h9M9 20.5h12" stroke="#2dd4bf" stroke-width="2.2" stroke-linecap="round"/>
            <circle cx="23" cy="20.5" r="2.2" fill="#2dd4bf"/>
          </svg>
        </div>
        <div v-show="!appStore.sidebarCollapsed" class="brand-text">
          <span class="brand-name">Enterprise Pilot</span>
          <span class="brand-sub">企业智能协作平台</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <template v-for="group in navGroups" :key="group.label">
          <div v-if="group.label && !appStore.sidebarCollapsed" class="nav-section-label">{{ group.label }}</div>
          <router-link
            v-for="item in group.items"
            :key="item.path"
            :to="item.path"
            class="nav-item"
            :class="{ active: isActive(item.path) }"
          >
            <span class="nav-icon"><component :is="item.icon" :size="16" :stroke-width="1.6" /></span>
            <span v-show="!appStore.sidebarCollapsed" class="nav-label">{{ item.label }}</span>
            <span v-if="item.badge && !appStore.sidebarCollapsed" class="nav-badge">{{ item.badge }}</span>
          </router-link>
        </template>
      </nav>

      <div class="sidebar-foot">
        <template v-for="item in footItems" :key="item.path">
          <router-link
            :to="item.path"
            class="foot-item"
            :class="{ active: isActive(item.path) }"
          >
            <span class="nav-icon"><component :is="item.icon" :size="16" :stroke-width="1.8" /></span>
            <span v-show="!appStore.sidebarCollapsed" class="nav-label">{{ item.label }}</span>
          </router-link>
        </template>
        <div class="foot-user" @click="router.push('/profile')">
          <div class="avatar-ring">
            <div class="ring-avatar">
              <img v-if="userAvatar" :src="userAvatar" alt="" />
              <template v-else>{{ userInitials }}</template>
            </div>
          </div>
          <div v-show="!appStore.sidebarCollapsed" class="foot-user-meta">
            <span class="foot-user-name">{{ displayName }}</span>
            <span class="foot-user-role">{{ roleLabel }}</span>
          </div>
        </div>
      </div>
    </aside>

    <!-- ======== Main ======== -->
    <div class="layout-main">
      <header class="topbar">
        <div class="topbar-left">
          <button class="collapse-btn" @click="appStore.toggleSidebar">
            <component :is="appStore.sidebarCollapsed ? PanelRightOpen : PanelLeftClose" :size="17" :stroke-width="1.8" />
          </button>
          <el-breadcrumb v-if="route.path !== '/dashboard'" separator="/" class="breadcrumb">
            <el-breadcrumb-item>{{ currentGroup }}</el-breadcrumb-item>
            <el-breadcrumb-item v-if="route.meta.title">{{ route.meta.title }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>

        <div class="topbar-center">
          <div class="topbar-search" @click="focusSearch">
            <kbd class="search-kbd">⌘K</kbd>
            <input
              ref="searchRef"
              v-model="searchText"
              class="search-input"
              placeholder="搜索会议、项目、文档…"
              @keyup.enter="doSearch"
            />
          </div>
        </div>

        <div class="topbar-right">
          <div class="notify-wrap" ref="notifyWrapRef">
            <button class="topbar-icon-btn notify-btn" @click="togglePanel">
              <component :is="Bell" :size="17" :stroke-width="1.8" />
              <span v-if="totalUnread > 0" class="notify-badge">
                {{ totalUnread > 99 ? '99+' : totalUnread }}
              </span>
            </button>

            <transition name="notify-drop">
              <div v-if="panelOpen" class="notify-panel">
                <div v-if="messageStore.msgUnread > 0" class="notify-msg-entry" @click="openMessages">
                  <component :is="MessageSquare" :size="15" :stroke-width="1.8" />
                  <span>你有 {{ messageStore.msgUnread }} 条新消息</span>
                  <span class="notify-msg-go">去查看 →</span>
                </div>
                <div class="notify-header">
                  <span class="notify-title">通知</span>
                  <div class="notify-header-actions">
                    <span v-if="notifyStore.unreadCount > 0" class="notify-unread-tip">
                      {{ notifyStore.unreadCount }} 条未读
                    </span>
                    <button v-if="notifyStore.unreadCount > 0" class="notify-mark-all" @click="markAllRead">
                      全部已读
                    </button>
                  </div>
                </div>

                <div v-if="notifyStore.loading" class="notify-loading">
                  <div v-for="i in 3" :key="i" class="notify-skeleton"></div>
                </div>

                <div v-else-if="notifyStore.records.length === 0" class="notify-empty">
                  <component :is="BellOff" :size="22" :stroke-width="1.6" />
                  <span>暂无通知</span>
                </div>

                <div v-else class="notify-list">
                  <div
                    v-for="n in notifyStore.records"
                    :key="n.id"
                    class="notify-item"
                    :class="{ unread: !n.isRead }"
                    @click="onItemClick(n)"
                  >
                    <div class="notify-item-icon" :class="n.type.toLowerCase()">
                      <component :is="typeIcon(n.type)" :size="15" :stroke-width="1.8" />
                    </div>
                    <div class="notify-item-body">
                      <div class="notify-item-title">{{ n.title }}</div>
                      <div class="notify-item-content">{{ n.content }}</div>
                      <div class="notify-item-time">{{ formatTime(n.createdAt) }}</div>
                    </div>
                    <span v-if="!n.isRead" class="notify-item-dot"></span>
                    <button class="notify-item-close" @click.stop="removeItem(n)">
                      <component :is="X" :size="13" :stroke-width="2" />
                    </button>
                  </div>
                </div>

                <div v-if="notifyStore.total > 20" class="notify-footer">
                  <span>共 {{ notifyStore.total }} 条通知</span>
                </div>
              </div>
            </transition>
          </div>

          <el-tooltip content="帮助中心" placement="bottom">
            <router-link to="/help" class="topbar-icon-btn">
              <component :is="CircleHelp" :size="17" :stroke-width="1.8" />
            </router-link>
          </el-tooltip>

          <el-dropdown trigger="click" @command="handleCommand">
            <div class="user-chip">
              <div class="avatar-ring">
                <div class="ring-avatar">
                  <img v-if="userAvatar" :src="userAvatar" alt="" />
                  <template v-else>{{ userInitials }}</template>
                </div>
              </div>
              <div class="user-meta">
                <span class="user-name">{{ displayName }}</span>
                <span class="user-role">{{ roleLabel }}</span>
              </div>
              <component :is="ChevronDown" :size="14" :stroke-width="2" class="user-caret" />
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">
                  <component :is="UserRound" :size="15" :stroke-width="1.8" />个人信息
                </el-dropdown-item>
                <el-dropdown-item divided command="logout">
                  <component :is="LogOut" :size="15" :stroke-width="1.8" />退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <main class="content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'
import { useNotificationStore } from '@/stores/notification'
import { useMessageStore } from '@/stores/message'
import {
  LayoutGrid, Calendar, FolderKanban, BookOpen, Sparkles,
  CircleHelp, UserRound, LogOut, Search, Bell, BellOff, ChevronDown,
  PanelRightOpen, PanelLeftClose, X, ListTodo, Info, Users, MessageSquare
} from 'lucide-vue-next'
import dayjs from 'dayjs'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const appStore = useAppStore()
const notifyStore = useNotificationStore()
const messageStore = useMessageStore()

const searchText = ref('')
const searchRef = ref(null)

const navGroups = [
  {
    label: '',
    items: [{ path: '/dashboard', label: '首页', icon: LayoutGrid }]
  },
  {
    label: '工作',
    items: [
      { path: '/meetings', label: '会议', icon: Calendar },
      { path: '/projects', label: '项目', icon: FolderKanban },
      { path: '/messages', label: '消息', icon: MessageSquare }
    ]
  },
  {
    label: '知识',
    items: [
      { path: '/knowledge', label: '知识库', icon: BookOpen },
      { path: '/agent', label: 'AI 助手', icon: Sparkles }
    ]
  },
  {
    label: '组织',
    items: [{ path: '/directory', label: '通讯录', icon: Users }]
  }
]

const footItems = [
  { path: '/help', label: '帮助中心', icon: CircleHelp },
  { path: '/profile', label: '个人主页', icon: UserRound }
]

const groupMap = {
  '/dashboard': '首页',
  '/meetings': '工作',
  '/projects': '工作',
  '/messages': '工作',
  '/directory': '组织',
  '/knowledge': '知识',
  '/agent': '知识',
  '/help': '帮助',
  '/profile': '个人'
}

const currentGroup = computed(() => groupMap[route.path] || '首页')

const displayName = computed(() => userStore.userInfo?.realName || userStore.userInfo?.username || '用户')
const userAvatar = computed(() => userStore.userInfo?.avatar || '')
const userInitials = computed(() => {
  const name = displayName.value.trim()
  if (!name) return 'U'
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
})

const roleLabel = computed(() => {
  const code = userStore.userInfo?.roleCode || ''
  if (code === 'ROLE_ADMIN') return '管理员'
  if (code === 'ROLE_MANAGER') return '部门经理'
  return '员工'
})

function isActive(path) {
  if (path === '/dashboard') return route.path === path
  return route.path.startsWith(path)
}

function handleCommand(cmd) {
  if (cmd === 'profile') {
    router.push('/profile')
  } else if (cmd === 'logout') {
    userStore.logout()
    router.push('/login')
  }
}

function doSearch() {
  const q = searchText.value.trim()
  if (!q) return
  searchText.value = ''
  router.push('/agent')
}

function focusSearch() {
  searchRef.value?.focus()
}

// ======== Notifications ========
const notifyTimer = ref(null)
const panelOpen = ref(false)
const notifyWrapRef = ref(null)

function togglePanel() {
  panelOpen.value = !panelOpen.value
  if (panelOpen.value) notifyStore.fetchList()
}

function closePanel() {
  panelOpen.value = false
}

const totalUnread = computed(() => notifyStore.unreadCount + messageStore.msgUnread)

function openMessages() {
  closePanel()
  router.push('/messages')
}

function onClickOutside(e) {
  if (panelOpen.value && notifyWrapRef.value && !notifyWrapRef.value.contains(e.target)) {
    panelOpen.value = false
  }
}

function markAllRead() {
  notifyStore.markAllRead().then(() => ElMessage.success('已全部标记为已读'))
}

function removeItem(n) {
  notifyStore.remove(n.id).then(() => ElMessage.success('通知已删除'))
}

function onItemClick(n) {
  if (!n.isRead) notifyStore.markRead(n.id)
  const map = { MEETING: '/meetings', TASK: '/projects', PROJECT: '/projects' }
  const target = map[n.type]
  if (target) router.push(target)
  panelOpen.value = false
}

function typeIcon(type) {
  if (type === 'MEETING') return Calendar
  if (type === 'PROJECT') return FolderKanban
  if (type === 'TASK') return ListTodo
  return Info
}

function formatTime(t) {
  if (!t) return ''
  const diff = dayjs().diff(dayjs(t), 'minute')
  if (diff < 1) return '刚刚'
  if (diff < 60) return `${diff} 分钟前`
  const hours = Math.floor(diff / 60)
  if (hours < 24) return `${hours} 小时前`
  if (hours < 48) return '昨天'
  return dayjs(t).format('M月D日')
}

function onKeydown(e) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    focusSearch()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  document.addEventListener('click', onClickOutside)
  notifyStore.fetchUnread()
  messageStore.fetchMsgUnread()
  notifyTimer.value = setInterval(() => {
    notifyStore.fetchUnread()
    messageStore.fetchMsgUnread()
  }, 30000)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.removeEventListener('click', onClickOutside)
  if (notifyTimer.value) clearInterval(notifyTimer.value)
})
</script>

<style scoped>
.layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* ======== Sidebar ======== */
.sidebar {
  width: 228px;
  min-width: 228px;
  background: #1c1917;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  transition: width var(--dur-base) var(--ease-out), min-width var(--dur-base) var(--ease-out);
  overflow: hidden;
}

.sidebar.collapsed {
  width: 64px;
  min-width: 64px;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 18px 16px 16px;
  height: 62px;
  flex-shrink: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.brand-mark {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.brand-text {
  display: flex;
  flex-direction: column;
  white-space: nowrap;
  min-width: 0;
}

.brand-name {
  font-size: 14px;
  font-weight: 650;
  letter-spacing: -0.01em;
  color: #fafaf9;
  line-height: 1.3;
}

.brand-sub {
  font-size: 10.5px;
  color: #78716c;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.sidebar-nav {
  flex: 1;
  padding: 12px 10px;
  overflow-y: auto;
  overflow-x: hidden;
}

.nav-section-label {
  font-size: 10.5px;
  font-weight: 600;
  color: #78716c;
  letter-spacing: 0.08em;
  padding: 12px 10px 6px;
  text-transform: uppercase;
  white-space: nowrap;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 11px;
  height: 36px;
  padding: 0 10px;
  margin-bottom: 1px;
  border-radius: 6px;
  color: #a8a29e;
  text-decoration: none;
  font-size: 13.5px;
  font-weight: 500;
  transition: all var(--dur-fast) var(--ease-out);
  position: relative;
  white-space: nowrap;
}

.nav-item:hover {
  color: #f5f5f4;
  background: rgba(255, 255, 255, 0.06);
}

.nav-item.active {
  color: #5eead4;
  background: rgba(20, 184, 166, 0.12);
  font-weight: 600;
}

.nav-item.active .nav-icon {
  color: #5eead4;
}

.nav-icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  color: inherit;
}

.nav-label {
  flex: 1;
}

.nav-badge {
  font-size: 10.5px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.1);
  color: #d6d3d1;
  border-radius: 8px;
  padding: 1px 6px;
}

/* ======== Sidebar footer ======== */
.sidebar-foot {
  padding: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.foot-item {
  display: flex;
  align-items: center;
  gap: 11px;
  height: 36px;
  padding: 0 10px;
  border-radius: 6px;
  color: #a8a29e;
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
  transition: all var(--dur-fast) var(--ease-out);
  white-space: nowrap;
}

.foot-item:hover {
  color: #f5f5f4;
  background: rgba(255, 255, 255, 0.06);
}

.foot-item.active {
  color: #5eead4;
  background: rgba(20, 184, 166, 0.12);
  font-weight: 600;
}

.foot-item.active .nav-icon {
  color: #5eead4;
}

.foot-user {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px;
  margin-top: 4px;
  border-radius: 6px;
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease-out);
  white-space: nowrap;
}

.foot-user:hover {
  background: rgba(255, 255, 255, 0.06);
}

.foot-user .avatar-ring {
  width: 34px;
  height: 34px;
}

.foot-user .ring-avatar {
  font-size: 11px;
}

.foot-user:hover .avatar-ring {
  --ring-angle: 25deg;
}

.foot-user-meta {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
  min-width: 0;
}

.foot-user-name {
  font-size: 12.5px;
  font-weight: 600;
  color: #f5f5f4;
  overflow: hidden;
  text-overflow: ellipsis;
}

.foot-user-role {
  font-size: 11px;
  color: #78716c;
}

/* ======== Main area ======== */
.layout-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.topbar {
  display: flex;
  align-items: center;
  height: 58px;
  padding: 0 22px;
  background: #fff;
  border-bottom: 1px solid var(--border-default);
  flex-shrink: 0;
  gap: 16px;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex-shrink: 0;
}

.collapse-btn {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--ink-600);
  border-radius: 6px;
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
}

.collapse-btn:hover {
  background: var(--ink-100);
  color: var(--ink-800);
}

.breadcrumb {
  white-space: nowrap;
}

.breadcrumb :deep(.el-breadcrumb__inner) {
  font-size: 13px;
  font-weight: 500;
  color: var(--ink-600);
}

.breadcrumb :deep(.el-breadcrumb__item:last-child .el-breadcrumb__inner) {
  color: var(--ink-900);
  font-weight: 600;
}

.topbar-center {
  flex: 1;
  display: flex;
  justify-content: center;
  min-width: 0;
}

.topbar-search {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 340px;
  max-width: 100%;
  height: 34px;
  padding: 0 10px 0 12px;
  background: var(--ink-50);
  border: 1px solid var(--border-default);
  border-radius: 6px;
  cursor: text;
  transition: all var(--dur-base) var(--ease-out);
}

.topbar-search:hover {
  border-color: var(--ink-400);
}

.topbar-search:focus-within {
  background: #fff;
  border-color: var(--brand-400);
  box-shadow: 0 0 0 3px var(--brand-50);
}

.search-icon {
  color: var(--ink-400);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: var(--ink-800);
  min-width: 0;
}

.search-input::placeholder {
  color: var(--ink-400);
}

.search-kbd {
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 500;
  color: var(--ink-400);
  background: #fff;
  border: 1px solid var(--border-default);
  border-radius: 4px;
  padding: 1px 5px;
  flex-shrink: 0;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.topbar-icon-btn {
  position: relative;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 6px;
  color: var(--ink-600);
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
  text-decoration: none;
}

.topbar-icon-btn:hover {
  background: var(--ink-100);
  color: var(--ink-800);
}

.notify-btn {
  position: relative;
}

.notify-wrap {
  position: relative;
}

.notify-panel {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 380px;
  z-index: 100;
  background: #fff;
  border: 1px solid var(--border-default);
  border-radius: 10px;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.notify-drop-enter-active,
.notify-drop-leave-active {
  transition: opacity var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out);
}

.notify-drop-enter-from,
.notify-drop-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.notify-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: var(--danger);
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  line-height: 16px;
  text-align: center;
  border: 1.5px solid #fff;
  box-sizing: border-box;
}

.user-chip {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 5px 8px;
  border-radius: 8px;
  transition: background var(--dur-base) var(--ease-out);
}

.user-chip:hover {
  background: var(--ink-100);
}

.user-chip .avatar-ring {
  width: 40px;
  height: 40px;
}

.user-chip .ring-avatar {
  font-size: 12px;
}

.user-chip:hover .avatar-ring {
  --ring-angle: 25deg;
}

.user-meta {
  display: flex;
  flex-direction: column;
  justify-content: center;
  line-height: 1.3;
  min-width: 0;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: #0f172a;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-role {
  font-size: 12px;
  font-weight: 400;
  color: #94a3b8;
  margin-top: 2px;
}

.user-caret {
  color: var(--ink-400);
  margin-left: 4px;
  flex-shrink: 0;
}

.user-chip:hover .user-caret {
  color: var(--ink-600);
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 22px 28px 40px;
}

@media (max-width: 900px) {
  .topbar-search {
    width: 200px;
  }
  .user-meta {
    display: none;
  }
}
</style>

<style>
/* ======== Notification panel content styles ======== */
.notify-panel {
  display: flex;
  flex-direction: column;
  max-height: 460px;
}

.notify-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}

.notify-msg-entry {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  margin: 10px 10px 0;
  border-radius: 10px;
  background: var(--brand-50);
  color: var(--brand-700);
  font-size: 13px;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 150ms ease;
}

.notify-msg-entry:hover {
  background: var(--brand-100);
}

.notify-msg-go {
  margin-left: auto;
  font-weight: 600;
  flex-shrink: 0;
}

.notify-title {
  font-size: 15px;
  font-weight: 650;
  color: var(--ink-950);
  letter-spacing: -0.01em;
}

.notify-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.notify-unread-tip {
  font-size: 12px;
  color: var(--ink-500);
}

.notify-mark-all {
  border: none;
  background: none;
  color: var(--brand-600);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: background var(--dur-fast) var(--ease-out);
}

.notify-mark-all:hover {
  background: var(--brand-50);
}

.notify-list {
  overflow-y: auto;
  padding: 6px;
  flex: 1;
}

.notify-item {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  padding: 11px 10px;
  border-radius: 8px;
  cursor: pointer;
  position: relative;
  transition: background var(--dur-fast) var(--ease-out);
}

.notify-item:hover {
  background: var(--ink-50);
}

.notify-item.unread {
  background: var(--brand-50);
}

.notify-item.unread:hover {
  background: var(--brand-100);
}

.notify-item-icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--ink-100);
  color: var(--ink-500);
}

.notify-item-icon.meeting {
  background: var(--brand-50);
  color: var(--brand-600);
}

.notify-item-icon.task {
  background: var(--warning-bg);
  color: var(--warning);
}

.notify-item-icon.project {
  background: var(--success-bg);
  color: var(--success);
}

.notify-item-icon.system {
  background: var(--ink-100);
  color: var(--ink-500);
}

.notify-item-body {
  flex: 1;
  min-width: 0;
}

.notify-item-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-900);
  margin-bottom: 2px;
}

.notify-item-content {
  font-size: 12.5px;
  color: var(--ink-600);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.notify-item-time {
  font-size: 11.5px;
  color: var(--ink-400);
  margin-top: 4px;
}

.notify-item-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--brand-500);
  flex-shrink: 0;
  margin-top: 5px;
}

.notify-item-close {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--ink-300);
  border-radius: 4px;
  cursor: pointer;
  opacity: 0;
  transition: all var(--dur-fast) var(--ease-out);
  flex-shrink: 0;
}

.notify-item:hover .notify-item-close {
  opacity: 1;
}

.notify-item-close:hover {
  background: var(--ink-100);
  color: var(--ink-600);
}

.notify-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 48px 0;
  color: var(--ink-400);
  font-size: 13px;
}

.notify-loading {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.notify-skeleton {
  height: 52px;
  border-radius: 8px;
  background: linear-gradient(90deg, var(--ink-100) 25%, var(--ink-150) 50%, var(--ink-100) 75%);
  background-size: 200% 100%;
  animation: notify-shimmer 1.4s infinite;
}

@keyframes notify-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.notify-footer {
  padding: 10px 16px;
  border-top: 1px solid var(--border-subtle);
  text-align: center;
  font-size: 12px;
  color: var(--ink-400);
  flex-shrink: 0;
}
</style>
