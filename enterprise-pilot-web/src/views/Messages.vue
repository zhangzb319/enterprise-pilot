<template>
  <div class="messages">
    <!-- 顶部标题 -->
    <div class="msg-header">
      <h1>站内消息</h1>
      <p>与同事私信沟通，消息实时同步</p>
    </div>

    <div class="msg-main">
      <!-- 左侧：会话列表 -->
      <aside class="convo-panel">
        <div class="convo-list">
          <div
            v-for="c in conversations"
            :key="c.userId"
            class="convo-item"
            :class="{ active: activeUser && activeUser.userId === c.userId }"
            @click="selectConversation(c)"
          >
            <div class="avatar-ring">
              <div class="ring-avatar">
                <img v-if="c.avatar" :src="c.avatar" alt="" />
                <template v-else>{{ initials(c.name) }}</template>
              </div>
            </div>
            <div class="convo-info">
              <div class="convo-top">
                <span class="convo-name">{{ c.name || '—' }}</span>
                <span class="convo-time">{{ formatTime(c.lastTime) }}</span>
              </div>
              <div class="convo-bottom">
                <span class="convo-preview" :class="{ unread: c.unreadCount > 0 }">
                  {{ c.lastMessage || '开始聊天吧' }}
                </span>
                <span v-if="c.unreadCount > 0" class="unread-badge">{{ c.unreadCount }}</span>
              </div>
            </div>
          </div>

          <div v-if="!loadingFlag && conversations.length === 0" class="convo-empty">
            <component :is="MessageSquare" :size="26" :stroke-width="1.6" />
            <span>暂无会话，通讯录里找同事聊一聊吧</span>
          </div>
        </div>
      </aside>

      <!-- 右侧：聊天窗口 -->
      <section class="chat-panel">
        <template v-if="activeUser">
          <div class="chat-oppo">
            <div class="avatar-ring">
              <div class="ring-avatar">
                <img v-if="activeUser.avatar" :src="activeUser.avatar" alt="" />
                <template v-else>{{ initials(activeUser.name) }}</template>
              </div>
            </div>
            <div class="chat-oppo-meta">
              <div class="chat-oppo-name">{{ activeUser.name || '新对话' }}</div>
              <div class="chat-oppo-sub">
                {{ activeUser.position || '' }}<template v-if="activeUser.position && activeUser.deptName"> · </template>{{ activeUser.deptName || '' }}
              </div>
            </div>
          </div>

          <div ref="chatBody" class="chat-body">
            <div v-if="messages.length === 0" class="chat-empty">
              还没有消息，打个招呼开始对话吧
            </div>
            <div v-for="m in messages" :key="m.id" class="bubble-row" :class="{ mine: m.senderId === me }">
              <div class="bubble" :class="{ mine: m.senderId === me }">
                <div class="bubble-text">{{ m.content }}</div>
                <div class="bubble-time">{{ formatTimeFull(m.createdAt) }}</div>
              </div>
            </div>
          </div>

          <div class="chat-input">
            <textarea
              v-model="draft"
              rows="1"
              class="chat-textarea"
              placeholder="输入消息，Enter 发送"
              @keydown.enter.exact.prevent="send"
            ></textarea>
            <button class="send-btn" :disabled="!draft.trim()" @click="send">
              <component :is="Send" :size="16" :stroke-width="2" />
              <span>发送</span>
            </button>
          </div>
        </template>

        <div v-else class="chat-placeholder">
          <component :is="MessageSquare" :size="36" :stroke-width="1.4" />
          <p>选择一个会话，或从通讯录发起对话</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { MessageSquare, Send } from 'lucide-vue-next'
import { messageApi, userApi } from '@/api'
import { useUserStore } from '@/stores/user'
import dayjs from 'dayjs'

const route = useRoute()
const userStore = useUserStore()

const me = computed(() => userStore.userInfo?.id)

const conversations = ref([])
const activeUser = ref(null)
const messages = ref([])
const draft = ref('')
const loadingFlag = ref(true)
const chatBody = ref(null)

let pollTimer = null

function initials(name) {
  const n = (name || '').trim()
  if (!n) return '?'
  return n.slice(0, 2).toUpperCase()
}

async function loadConversations() {
  try {
    conversations.value = (await messageApi.conversations()) || []
  } catch (e) {
    /* ignore */
  }
}

async function loadMessages(userId) {
  try {
    messages.value = (await messageApi.with(userId)) || []
    scrollToBottom()
  } catch (e) {
    /* ignore */
  }
}

function selectConversation(c) {
  activeUser.value = c
  loadMessages(c.userId)
}

async function send() {
  const content = draft.value.trim()
  if (!content || !activeUser.value) return
  try {
    await messageApi.send({ receiverId: activeUser.value.userId, content })
    draft.value = ''
    await Promise.all([loadMessages(activeUser.value.userId), loadConversations()])
  } catch (e) {
    ElMessage.error(e?.message || '发送失败')
  }
}

async function openFromQuery() {
  const to = Number(route.query.to)
  if (!to) return
  const found = conversations.value.find((c) => c.userId === to)
  if (found) {
    selectConversation(found)
    return
  }
  // 新对话：从通讯录补全对方信息
  activeUser.value = { userId: to, name: '', avatar: '', position: '', deptName: '' }
  try {
    const dir = (await userApi.directory()) || []
    const u = dir.find((x) => x.id === to)
    if (u) {
      activeUser.value = {
        userId: to,
        name: u.realName || u.nickname,
        avatar: u.avatar,
        position: u.position,
        deptName: u.deptName
      }
    }
  } catch (e) {
    /* ignore */
  }
  loadMessages(to)
}

function scrollToBottom() {
  nextTick(() => {
    if (chatBody.value) chatBody.value.scrollTop = chatBody.value.scrollHeight
  })
}

function formatTime(t) {
  if (!t) return ''
  const d = dayjs(t)
  if (d.isSame(dayjs(), 'day')) return d.format('HH:mm')
  if (d.isSame(dayjs().subtract(1, 'day'), 'day')) return '昨天'
  if (d.isSame(dayjs(), 'year')) return d.format('MM-DD')
  return d.format('YYYY-MM-DD')
}

function formatTimeFull(t) {
  const d = dayjs(t)
  return d.format('HH:mm')
}

onMounted(async () => {
  await loadConversations()
  loadingFlag.value = false
  await openFromQuery()
  // 轮询刷新会话与当前消息
  pollTimer = setInterval(async () => {
    const uid = activeUser.value?.userId
    await loadConversations()
    if (uid) await loadMessages(uid)
  }, 3000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<style scoped>
.messages {
  background: var(--bg-page);
  max-width: 1200px;
  margin: 0 auto;
}

.msg-header h1 {
  font-size: 26px;
  font-weight: 650;
  letter-spacing: -0.01em;
  color: var(--ink-900);
  margin: 0 0 6px;
}

.msg-header p {
  font-size: 14px;
  color: var(--ink-500);
  margin: 0 0 20px;
}

.msg-main {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 18px;
  height: calc(100vh - 260px);
  min-height: 480px;
}

/* ======== 会话列表 ======== */
.convo-panel {
  background: #fff;
  border: 1px solid var(--border-default);
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.convo-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.convo-item {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 11px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 150ms ease;
}

.convo-item:hover {
  background: var(--ink-100);
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
  margin-top: 4px;
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

.unread-badge {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--brand-500);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.convo-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 40px 16px;
  color: var(--ink-400);
  font-size: 13px;
  text-align: center;
}

/* ======== 聊天窗口 ======== */
.chat-panel {
  background: #fff;
  border: 1px solid var(--border-default);
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.chat-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--ink-400);
  font-size: 14px;
}

.chat-oppo {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-subtle);
}

.chat-oppo-meta {
  min-width: 0;
}

.chat-oppo-name {
  font-size: 15px;
  font-weight: 650;
  color: var(--ink-900);
}

.chat-oppo-sub {
  font-size: 12px;
  color: var(--ink-500);
  margin-top: 2px;
}

.chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #fafaf9;
}

.chat-empty {
  color: var(--ink-400);
  font-size: 13px;
  text-align: center;
  padding: 40px 0;
}

.bubble-row {
  display: flex;
  justify-content: flex-start;
}

.bubble-row.mine {
  justify-content: flex-end;
}

.bubble {
  max-width: 68%;
  padding: 10px 14px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid var(--border-default);
  box-shadow: var(--shadow-sm);
}

.bubble.mine {
  background: var(--brand-500);
  color: #fff;
  border-color: var(--brand-500);
}

.bubble-text {
  font-size: 13.5px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}

.bubble-time {
  font-size: 11px;
  margin-top: 4px;
  color: var(--ink-400);
}

.bubble.mine .bubble-time {
  color: rgba(255, 255, 255, 0.75);
}

/* ======== 输入区 ======== */
.chat-input {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding: 14px 18px;
  border-top: 1px solid var(--border-subtle);
  background: #fff;
}

.chat-textarea {
  flex: 1;
  resize: none;
  border: 1px solid var(--border-default);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 13.5px;
  font-family: inherit;
  color: var(--ink-800);
  outline: none;
  background: #fff;
  line-height: 1.5;
  max-height: 120px;
  box-sizing: border-box;
  transition: border-color 150ms ease;
}

.chat-textarea:focus {
  border-color: var(--brand-400);
  box-shadow: 0 0 0 3px var(--brand-50);
}

.send-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 18px;
  border: none;
  border-radius: 10px;
  background: var(--brand-500);
  color: #fff;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background 150ms ease;
  flex-shrink: 0;
}

.send-btn:hover {
  background: var(--brand-600);
}

.send-btn:disabled {
  background: var(--ink-200);
  cursor: not-allowed;
}

/* ======== 头像 ======== */
.avatar-ring {
  --ring-angle: 200deg;
  width: 40px;
  height: 40px;
  padding: 1px;
  border-radius: 50%;
  background: conic-gradient(from var(--ring-angle), #14b8a6, #0ea5e9, #8b5cf6, #14b8a6);
  flex-shrink: 0;
}

.ring-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #e7e5e4;
  color: #475569;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 500;
  overflow: hidden;
}

.ring-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

@media (max-width: 760px) {
  .msg-main {
    grid-template-columns: 1fr;
    height: auto;
  }
  .convo-panel {
    max-height: 320px;
  }
}
</style>