<template>
  <div class="msg">
    <!-- ======== Toolbar ======== -->
    <div class="msg-hd">
      <div class="msg-hd-left">
        <div class="msg-brand">
          <MessageSquare :size="16" :stroke-width="1.8" />
        </div>
        <div class="msg-hd-titles">
          <span class="msg-name">站内消息</span>
          <span class="msg-sub">
            {{ conversations.length ? conversations.length + ' 个会话' : '与同事私信沟通' }}
            <template v-if="totalUnread > 0"> · {{ totalUnread }} 条未读</template>
          </span>
        </div>
      </div>
      <div class="msg-hd-actions">
        <button class="msg-hd-btn" title="刷新" @click="refresh">
          <RefreshCw :size="13" :stroke-width="2" />
          刷新
        </button>
        <button class="msg-hd-btn" title="去通讯录找人" @click="router.push('/directory')">
          <Users :size="13" :stroke-width="2" />
          通讯录
        </button>
      </div>
    </div>

    <!-- ======== Workspace: 单卡片 + 内部分隔,取代原来的卡片套卡片 ======== -->
    <div class="msg-workspace">
      <!-- ---- 左:会话列表 ---- -->
      <aside class="convo-pane">
        <div class="convo-search">
          <Search :size="15" :stroke-width="1.8" class="convo-search-ico" />
          <input
            v-model="query"
            type="text"
            class="convo-search-input"
            placeholder="搜索会话"
          />
          <button v-if="query" class="convo-search-clear" title="清空" @click="query = ''">
            <X :size="13" :stroke-width="2.2" />
          </button>
        </div>

        <div class="convo-list">
          <template v-if="filteredConversations.length">
            <button
              v-for="c in filteredConversations"
              :key="c.userId"
              class="convo-item"
              :class="{ active: isActive(c) }"
              @click="selectConversation(c)"
            >
              <UserAvatar :name="c.name" :src="c.avatar" :size="38" />
              <div class="convo-info">
                <div class="convo-top">
                  <span class="convo-name">{{ c.name || '—' }}</span>
                  <span class="convo-time">{{ formatTime(c.lastTime) }}</span>
                </div>
                <div class="convo-bottom">
                  <span class="convo-preview" :class="{ unread: c.unreadCount > 0 }">
                    {{ c.lastMessage || '开始聊天吧' }}
                  </span>
                  <span v-if="c.unreadCount > 0" class="convo-badge">
                    {{ c.unreadCount > 99 ? '99+' : c.unreadCount }}
                  </span>
                </div>
              </div>
            </button>
          </template>

          <div v-else-if="query" class="convo-empty">
            <SearchX :size="22" :stroke-width="1.6" />
            <span class="convo-empty-title">没有匹配的会话</span>
            <span class="convo-empty-sub">试试其他关键词</span>
          </div>

          <div v-else-if="!loadingConv" class="convo-empty">
            <MessageSquare :size="22" :stroke-width="1.6" />
            <span class="convo-empty-title">还没有会话</span>
            <span class="convo-empty-sub">去通讯录找同事聊一聊</span>
            <button class="convo-empty-btn" @click="router.push('/directory')">打开通讯录</button>
          </div>
        </div>
      </aside>

      <!-- ---- 右:聊天窗口 ---- -->
      <section class="chat-pane">
        <template v-if="activeUser">
          <header class="chat-hd">
            <UserAvatar :name="activeUser.name" :src="activeUser.avatar" :size="38" />
            <div class="chat-hd-meta">
              <span class="chat-hd-name">{{ activeUser.name || '新对话' }}</span>
              <span class="chat-hd-sub">
                {{ [activeUser.position, activeUser.deptName].filter(Boolean).join(' · ') || '暂无职位信息' }}
              </span>
            </div>
            <button class="chat-hd-btn" title="去通讯录" @click="router.push('/directory')">
              <UserRound :size="14" :stroke-width="1.8" />
            </button>
          </header>

          <div ref="chatBody" class="chat-body">
            <div v-if="messages.length === 0" class="chat-blank">
              <UserAvatar :name="activeUser.name" :src="activeUser.avatar" :size="52" />
              <span class="chat-blank-title">{{ activeUser.name || '对方' }}</span>
              <span class="chat-blank-sub">还没有消息往来,发送第一条消息开始对话</span>
            </div>

            <template v-for="item in timeline" :key="item.key">
              <div v-if="item.type === 'day'" class="chat-day">
                <span>{{ item.label }}</span>
              </div>
              <div v-else class="bubble-row" :class="{ mine: item.mine }">
                <UserAvatar
                  v-if="!item.mine"
                  :name="activeUser.name"
                  :src="activeUser.avatar"
                  :size="30"
                  class="bubble-avatar"
                />
                <div class="bubble" :class="{ mine: item.mine }">
                  <div class="bubble-text">{{ item.content }}</div>
                  <div class="bubble-time">{{ fmtClock(item.createdAt) }}</div>
                </div>
              </div>
            </template>
          </div>

          <footer class="chat-composer">
            <div class="chat-composer-box">
              <textarea
                ref="textareaRef"
                v-model="draft"
                rows="1"
                class="chat-textarea"
                placeholder="输入消息,Enter 发送 · Shift + Enter 换行"
                @keydown.enter.exact.prevent="send"
                @input="autoGrow"
              ></textarea>
              <button
                class="chat-send"
                :disabled="!draft.trim() || sending"
                title="发送"
                @click="send"
              >
                <ArrowUp :size="16" :stroke-width="2.4" />
              </button>
            </div>
          </footer>
        </template>

        <div v-else class="chat-placeholder">
          <div class="chat-placeholder-mark">
            <MessageSquare :size="24" :stroke-width="1.6" />
          </div>
          <span class="chat-placeholder-title">选择一位同事开始对话</span>
          <span class="chat-placeholder-sub">从左侧会话列表选择,或到通讯录发起新的对话</span>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  MessageSquare, Search, SearchX, X, RefreshCw, Users, UserRound, ArrowUp
} from 'lucide-vue-next'
import UserAvatar from '@/components/UserAvatar.vue'
import { messageApi, userApi } from '@/api'
import { useUserStore } from '@/stores/user'
import { useMessageStore } from '@/stores/message'
import dayjs from 'dayjs'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const messageStore = useMessageStore()

const me = computed(() => userStore.userInfo?.id)

const conversations = ref([])
const activeUser = ref(null)
const messages = ref([])
const draft = ref('')
const query = ref('')
const loadingConv = ref(true)
const sending = ref(false)
const chatBody = ref(null)
const textareaRef = ref(null)

let pollTimer = null

/* ---------- derived ---------- */
const totalUnread = computed(() =>
  conversations.value.reduce((sum, c) => sum + (c.unreadCount || 0), 0)
)

const filteredConversations = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return conversations.value
  return conversations.value.filter((c) =>
    [c.name, c.lastMessage, c.position, c.deptName]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q))
  )
})

/** 消息 + 日期分隔线,交给模板一次渲染 */
const timeline = computed(() => {
  const out = []
  let lastDay = ''
  messages.value.forEach((m, i) => {
    const day = m.createdAt ? dayjs(m.createdAt).format('YYYY-MM-DD') : ''
    if (day && day !== lastDay) {
      lastDay = day
      out.push({ type: 'day', key: 'd-' + day + '-' + i, label: dayLabel(m.createdAt) })
    }
    out.push({
      type: 'msg',
      key: m.id == null ? 'm-' + i : m.id,
      content: m.content,
      createdAt: m.createdAt,
      mine: m.senderId === me.value
    })
  })
  return out
})

/* ---------- helpers ---------- */
function isActive(c) {
  return !!activeUser.value && activeUser.value.userId === c.userId
}

async function loadConversations() {
  try {
    conversations.value = (await messageApi.conversations()) || []
  } catch {
    /* 静默:轮询失败不打扰用户 */
  }
}

async function loadMessages(userId) {
  try {
    const atBottom = isNearBottom()
    messages.value = (await messageApi.with(userId)) || []
    // 后端 listWith 会把对方发来的消息置为已读,这里同步右侧未读徽标,
    // 并把本会话在列表里的未读数清零,避免轮询期间徽标来回闪烁
    messageStore.fetchMsgUnread()
    const c = conversations.value.find((x) => x.userId === userId)
    if (c) c.unreadCount = 0
    // 只在用户本来就贴着底部时才自动滚动,否则不打断正在翻看历史记录的人
    if (atBottom) scrollToBottom()
  } catch {
    /* 同上 */
  }
}

/** 距底部 80px 内视为"贴着底部" */
function isNearBottom() {
  const el = chatBody.value
  if (!el) return true
  return el.scrollHeight - el.scrollTop - el.clientHeight < 80
}

function selectConversation(c) {
  activeUser.value = c
  // 先本地清零,避免等轮询造成徽标闪烁
  c.unreadCount = 0
  loadMessages(c.userId)
}

async function refresh() {
  await loadConversations()
  if (activeUser.value?.userId) await loadMessages(activeUser.value.userId)
  ElMessage.success('已刷新')
}

async function send() {
  const content = draft.value.trim()
  if (!content || !activeUser.value || sending.value) return
  sending.value = true
  try {
    await messageApi.send({ receiverId: activeUser.value.userId, content })
    draft.value = ''
    resetHeight()
    await Promise.all([loadMessages(activeUser.value.userId), loadConversations()])
  } catch (e) {
    ElMessage.error(e?.message || '发送失败')
  } finally {
    sending.value = false
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (chatBody.value) chatBody.value.scrollTop = chatBody.value.scrollHeight
  })
}

function autoGrow() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 132) + 'px'
}

function resetHeight() {
  const el = textareaRef.value
  if (el) el.style.height = 'auto'
}

/* ---------- formatting ---------- */
function formatTime(t) {
  if (!t) return ''
  const d = dayjs(t)
  if (d.isSame(dayjs(), 'day')) return d.format('HH:mm')
  if (d.isSame(dayjs().subtract(1, 'day'), 'day')) return '昨天'
  if (d.isSame(dayjs(), 'year')) return d.format('MM-DD')
  return d.format('YYYY-MM-DD')
}

function fmtClock(t) {
  return t ? dayjs(t).format('HH:mm') : ''
}

function dayLabel(t) {
  const d = dayjs(t)
  if (d.isSame(dayjs(), 'day')) return '今天'
  if (d.isSame(dayjs().subtract(1, 'day'), 'day')) return '昨天'
  if (d.isSame(dayjs(), 'year')) return d.format('M月D日')
  return d.format('YYYY年M月D日')
}

/* ---------- 从 /messages?to=xx 进入 ---------- */
async function openFromQuery() {
  const to = Number(route.query.to)
  if (!to) return
  const found = conversations.value.find((c) => c.userId === to)
  if (found) {
    selectConversation(found)
    return
  }
  // 新会话:会话列表里还没有,去通讯录补全对方资料
  activeUser.value = {
    userId: to, name: '', avatar: '', position: '', deptName: '', unreadCount: 0
  }
  try {
    const dir = (await userApi.directory()) || []
    const u = dir.find((x) => x.id === to)
    if (u) {
      activeUser.value = {
        userId: to,
        name: u.realName || u.nickname,
        avatar: u.avatar,
        position: u.position,
        deptName: u.deptName,
        unreadCount: 0
      }
    }
  } catch {
    /* 取不到就先用空资料渲染,消息仍能正常拉取 */
  }
  loadMessages(to)
}

watch(
  () => route.query.to,
  (val) => {
    if (val && route.path === '/messages') openFromQuery()
  }
)

onMounted(async () => {
  await loadConversations()
  loadingConv.value = false
  await openFromQuery()
  // 轮询:刷新会话列表与当前会话消息
  pollTimer = setInterval(async () => {
    const uid = activeUser.value?.userId
    await loadConversations()
    if (uid) await loadMessages(uid)
  }, 4000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<style scoped>
/* ======== Root ======== */
.msg {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 520px;
}

/* ======== Toolbar ======== */
.msg-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 4px 2px 14px;
  flex-shrink: 0;
}

.msg-hd-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.msg-brand {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: linear-gradient(180deg, #ffffff, var(--ink-50));
  border: 1px solid var(--border-default);
  box-shadow: var(--shadow-xs);
  color: var(--brand-700);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.msg-hd-titles {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.msg-name {
  font-size: 15px;
  font-weight: 650;
  letter-spacing: -0.01em;
  color: var(--ink-950);
  line-height: 1.35;
}

.msg-sub {
  font-size: 11.5px;
  color: var(--ink-400);
  line-height: 1.3;
}

.msg-hd-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.msg-hd-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: none;
  background: transparent;
  color: var(--ink-500);
  font-size: 12.5px;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 8px;
  transition: all var(--dur-fast) var(--ease-out);
}

.msg-hd-btn:hover {
  color: var(--ink-800);
  background: var(--ink-100);
}

/* ======== Workspace:单卡片,靠内部分隔线分区 ======== */
.msg-workspace {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 296px 1fr;
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: 12px;
  box-shadow: var(--shadow-xs);
  overflow: hidden;
}

/* ======== 左侧会话列表 ======== */
.convo-pane {
  display: flex;
  flex-direction: column;
  min-width: 0;
  border-right: 1px solid var(--border-subtle);
  background: #fdfdfc;
}

.convo-search {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 12px 6px;
  padding: 0 10px;
  height: 34px;
  border-radius: 8px;
  background: var(--ink-50);
  border: 1px solid transparent;
  transition: all var(--dur-fast) var(--ease-out);
  flex-shrink: 0;
}

.convo-search:focus-within {
  background: #fff;
  border-color: var(--brand-400);
  box-shadow: 0 0 0 3px var(--brand-50);
}

.convo-search-ico {
  color: var(--ink-400);
  flex-shrink: 0;
}

.convo-search-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: var(--ink-800);
}

.convo-search-input::placeholder {
  color: var(--ink-400);
}

.convo-search-clear {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: var(--ink-400);
  cursor: pointer;
  flex-shrink: 0;
}

.convo-search-clear:hover {
  background: var(--ink-150);
  color: var(--ink-700);
}

.convo-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px 8px 10px;
}

.convo-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 10px;
  border: none;
  border-radius: 9px;
  background: transparent;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  transition: background var(--dur-fast) var(--ease-out);
}

.convo-item:hover {
  background: var(--ink-50);
}

.convo-item.active {
  background: var(--brand-50);
}

.convo-info {
  flex: 1;
  min-width: 0;
}

.convo-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.convo-name {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--ink-900);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.convo-item.active .convo-name {
  color: var(--brand-800);
}

.convo-time {
  font-size: 11px;
  color: var(--ink-400);
  flex-shrink: 0;
}

.convo-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 3px;
}

.convo-preview {
  font-size: 12px;
  color: var(--ink-500);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.convo-preview.unread {
  color: var(--ink-800);
  font-weight: 600;
}

.convo-badge {
  min-width: 17px;
  height: 17px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--brand-600);
  color: #fff;
  font-size: 10.5px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  line-height: 1;
}

.convo-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 44px 20px;
  text-align: center;
  color: var(--ink-300);
}

.convo-empty-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-700);
  margin-top: 5px;
}

.convo-empty-sub {
  font-size: 12px;
  color: var(--ink-400);
}

.convo-empty-btn {
  margin-top: 8px;
  border: 1px solid var(--border-default);
  background: #fff;
  color: var(--ink-700);
  font-size: 12px;
  font-weight: 500;
  font-family: inherit;
  padding: 5px 12px;
  border-radius: 7px;
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
}

.convo-empty-btn:hover {
  border-color: var(--brand-300);
  color: var(--brand-700);
  background: var(--brand-50);
}

/* ======== 右侧聊天窗口 ======== */
.chat-pane {
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: #fff;
}

.chat-hd {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 12px 18px;
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}

.chat-hd-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.chat-hd-name {
  font-size: 14px;
  font-weight: 650;
  color: var(--ink-950);
  letter-spacing: -0.01em;
  line-height: 1.35;
}

.chat-hd-sub {
  font-size: 11.5px;
  color: var(--ink-400);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-hd-btn {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--ink-400);
  border-radius: 8px;
  cursor: pointer;
  flex-shrink: 0;
  transition: all var(--dur-fast) var(--ease-out);
}

.chat-hd-btn:hover {
  background: var(--ink-100);
  color: var(--ink-700);
}

/* ---- 消息区 ---- */
.chat-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 18px 22px 20px;
  display: flex;
  flex-direction: column;
  background: #fdfdfc;
}

.chat-blank {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  text-align: center;
  padding: 30px 0;
}

.chat-blank-title {
  margin-top: 8px;
  font-size: 14px;
  font-weight: 650;
  color: var(--ink-800);
}

.chat-blank-sub {
  font-size: 12.5px;
  color: var(--ink-400);
  max-width: 280px;
  line-height: 1.6;
}

.chat-day {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 14px 0 12px;
}

.chat-day span {
  font-size: 11px;
  font-weight: 500;
  color: var(--ink-400);
  background: var(--ink-100);
  border-radius: 10px;
  padding: 3px 10px;
  letter-spacing: 0.02em;
}

.bubble-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  margin-bottom: 10px;
  animation: bubble-in 0.2s var(--ease-out) both;
}

.bubble-row.mine {
  justify-content: flex-end;
}

@keyframes bubble-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.bubble-avatar {
  margin-bottom: 2px;
}

.bubble {
  max-width: min(68%, 560px);
  padding: 9px 13px;
  border-radius: 14px;
  border-bottom-left-radius: 4px;
  background: #fff;
  border: 1px solid var(--border-default);
  box-shadow: var(--shadow-xs);
}

.bubble.mine {
  background: var(--brand-600);
  border-color: var(--brand-600);
  color: #fff;
  border-bottom-left-radius: 14px;
  border-bottom-right-radius: 4px;
}

.bubble-text {
  font-size: 13.5px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.bubble-time {
  font-size: 10.5px;
  margin-top: 3px;
  color: var(--ink-400);
  text-align: right;
}

.bubble.mine .bubble-time {
  color: rgba(255, 255, 255, 0.68);
}

/* ---- 输入区 ---- */
.chat-composer {
  padding: 12px 18px 16px;
  border-top: 1px solid var(--border-subtle);
  background: #fff;
  flex-shrink: 0;
}

.chat-composer-box {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding: 8px 8px 8px 14px;
  border: 1px solid var(--border-default);
  border-radius: 18px;
  background: var(--bg-card);
  transition: border-color var(--dur-base) var(--ease-out),
    box-shadow var(--dur-base) var(--ease-out);
}

.chat-composer-box:focus-within {
  border-color: var(--brand-500);
  box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.1);
}

.chat-textarea {
  flex: 1;
  min-width: 0;
  resize: none;
  border: none;
  outline: none;
  background: transparent;
  font-family: inherit;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--ink-900);
  padding: 6px 0;
  max-height: 132px;
  overflow-y: auto;
}

.chat-textarea::placeholder {
  color: var(--ink-400);
}

.chat-send {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: none;
  flex-shrink: 0;
  background: linear-gradient(135deg, var(--brand-500), var(--brand-700));
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(15, 118, 110, 0.28);
  transition: all var(--dur-fast) var(--ease-out);
}

.chat-send:hover:not(:disabled) {
  transform: translateY(-1px) scale(1.04);
  box-shadow: 0 4px 14px rgba(15, 118, 110, 0.36);
}

.chat-send:active:not(:disabled) {
  transform: translateY(0) scale(0.96);
}

.chat-send:disabled {
  background: var(--ink-100);
  color: var(--ink-300);
  box-shadow: none;
  cursor: not-allowed;
}

/* ---- 未选中会话时的占位 ---- */
.chat-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  text-align: center;
  padding: 30px;
  background: #fdfdfc;
}

.chat-placeholder-mark {
  width: 52px;
  height: 52px;
  border-radius: 15px;
  background: linear-gradient(180deg, #ffffff, var(--ink-50));
  border: 1px solid var(--border-default);
  box-shadow: var(--shadow-xs);
  color: var(--ink-300);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
}

.chat-placeholder-title {
  font-size: 14px;
  font-weight: 650;
  color: var(--ink-700);
}

.chat-placeholder-sub {
  font-size: 12.5px;
  color: var(--ink-400);
  max-width: 300px;
  line-height: 1.6;
}

/* ======== 响应式 ======== */
@media (max-width: 900px) {
  .msg-workspace {
    grid-template-columns: 240px 1fr;
  }
  .bubble {
    max-width: 82%;
  }
}

@media (max-width: 720px) {
  .msg {
    min-height: 0;
  }
  .msg-workspace {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(150px, 34%) 1fr;
  }
  .convo-pane {
    border-right: none;
    border-bottom: 1px solid var(--border-subtle);
  }
  .chat-body {
    padding: 16px 14px;
  }
  .bubble {
    max-width: 88%;
  }
}
</style>