<template>
  <div class="agent">
    <!-- ======== Top toolbar ======== -->
    <div class="agent-hd">
      <div class="agent-hd-left">
        <div class="agent-brand">
          <Sparkles :size="16" :stroke-width="1.8" />
        </div>
        <span class="agent-name">企业智能助手</span>
        <span class="agent-hd-dot"></span>
        <div class="agent-tags">
          <span class="agent-tag">知识库</span>
          <span class="agent-tag">会议</span>
          <span class="agent-tag">项目</span>
        </div>
      </div>
      <div class="agent-hd-actions">
        <button class="agent-hd-btn" title="导出对话" @click="exportChat">
          <el-icon :size="13"><Download /></el-icon>
          导出
        </button>
        <button class="agent-hd-btn agent-hd-btn-danger" title="清空对话" @click="clearChat">
          <el-icon :size="13"><Delete /></el-icon>
          清空对话
        </button>
      </div>
    </div>

    <!-- ======== Message area ======== -->
    <div ref="chatBody" class="agent-body">
      <div class="agent-column">
        <!-- Empty state -->
        <div v-if="messages.length === 0" class="agent-empty">
          <div class="agent-empty-icon">
            <Sparkles :size="26" :stroke-width="1.6" />
          </div>
          <div class="agent-empty-title">有什么可以帮您？</div>
          <p class="agent-empty-desc">我是您的智能工作助手，可以回答知识库问题、查询会议安排、总结工作内容。</p>
          <div class="agent-suggestions">
            <div v-for="s in suggestions" :key="s" class="agent-suggestion" @click="send(s)">
              <span class="agent-suggestion-icon">
                <component :is="suggestionIcon(s)" :size="15" />
              </span>
              <span class="agent-suggestion-text">{{ s }}</span>
              <span class="agent-suggestion-arrow">→</span>
            </div>
          </div>
        </div>

        <!-- Messages -->
        <div
          v-for="(m, i) in messages"
          :key="i"
          class="agent-msg"
          :class="m.role === 'user' ? 'agent-msg-user' : 'agent-msg-assistant'"
        >
          <div class="agent-msg-avatar">
            <Sparkles v-if="m.role === 'assistant'" :size="16" :stroke-width="1.8" />
            <template v-else>{{ userInitials }}</template>
          </div>

          <div class="agent-msg-main">
            <div v-if="m.role === 'assistant'" class="agent-msg-role">助手</div>
            <div class="agent-msg-content">
              <div v-if="m.role === 'user'" class="agent-msg-user-bubble">{{ m.content }}</div>
              <div v-else class="agent-msg-rich">
                <span v-if="m.content" v-html="renderRich(m.content)"></span>
                <span v-else-if="loading && i === messages.length - 1" class="agent-msg-thinking">正在思考...</span>
              </div>

              <div v-if="m.role === 'assistant' && m.content" class="agent-msg-actions">
                <button class="agent-action" title="复制" @click="copy(m.content)">
                  <el-icon :size="13"><CopyDocument /></el-icon>
                </button>
                <button class="agent-action" title="重新生成" @click="retry(i)">
                  <el-icon :size="13"><Refresh /></el-icon>
                </button>
                <button
                  class="agent-action"
                  :class="{ active: m.feedback === 'up' }"
                  title="有帮助"
                  @click="setFeedback(m, 'up')"
                >
                  <ThumbsUp :size="13" />
                </button>
                <button
                  class="agent-action"
                  :class="{ active: m.feedback === 'down' }"
                  title="没帮助"
                  @click="setFeedback(m, 'down')"
                >
                  <ThumbsDown :size="13" />
                </button>
              </div>

              <div v-if="m.toolResult" class="agent-tool">
                <div class="agent-tool-label">
                  <el-icon :size="13"><component :is="toolMeta(m.toolResult.name).icon" /></el-icon>
                  {{ toolMeta(m.toolResult.name).label }}
                </div>

                <!-- Meetings -->
                <div v-if="m.toolResult.name === 'my_bookings'" class="agent-cards">
                  <template v-if="m.toolResult.data && m.toolResult.data.length">
                    <div v-for="bk in m.toolResult.data" :key="bk.id" class="agent-meeting">
                      <div class="agent-meeting-time">
                        <span class="agent-meeting-date">{{ fmtDate(bk.startTime) }}</span>
                        <span class="agent-meeting-clock">{{ fmtTime(bk.startTime) }} – {{ fmtTime(bk.endTime) }}</span>
                      </div>
                      <div class="agent-meeting-body">
                        <span class="agent-meeting-title">{{ bk.title }}</span>
                        <span class="agent-meeting-meta">
                          {{ bk.roomName }}<template v-if="bk.organizerName"> · {{ bk.organizerName }}</template>
                        </span>
                      </div>
                      <span class="agent-meeting-status" :class="meetingStatusClass(bk.status)">
                        {{ meetingStatusLabel(bk.status) }}
                      </span>
                    </div>
                  </template>
                  <div v-else class="agent-cards-empty">暂无会议安排</div>
                </div>

                <!-- Projects -->
                <div v-else-if="m.toolResult.name === 'my_projects'" class="agent-cards">
                  <template v-if="m.toolResult.data && m.toolResult.data.length">
                    <div v-for="p in m.toolResult.data" :key="p.id" class="agent-meeting">
                      <div class="agent-meeting-body">
                        <span class="agent-meeting-title">{{ p.projectName }}</span>
                        <span class="agent-meeting-meta">
                          {{ p.ownerName }}<template v-if="p.endDate"> · 截止 {{ p.endDate }}</template>
                        </span>
                      </div>
                      <span class="agent-meeting-status" :class="projectStatusClass(p.status)">
                        {{ projectStatusLabel(p.status) }}
                      </span>
                      <span class="agent-progress">{{ p.progress || 0 }}%</span>
                    </div>
                  </template>
                  <div v-else class="agent-cards-empty">暂无项目</div>
                </div>

                <!-- Tasks -->
                <div v-else-if="m.toolResult.name === 'my_tasks'" class="agent-cards">
                  <template v-if="m.toolResult.data && m.toolResult.data.length">
                    <div v-for="t in m.toolResult.data" :key="t.id" class="agent-meeting">
                      <div class="agent-meeting-body">
                        <span class="agent-meeting-title">{{ t.title }}</span>
                        <span class="agent-meeting-meta">
                          {{ t.projectName }}<template v-if="t.assigneeName"> · {{ t.assigneeName }}</template>
                          <template v-if="t.dueDate"> · 截止 {{ t.dueDate }}</template>
                        </span>
                      </div>
                      <span class="agent-meeting-status" :class="taskStatusClass(t.status)">
                        {{ taskStatusLabel(t.status) }}
                      </span>
                    </div>
                  </template>
                  <div v-else class="agent-cards-empty">暂无任务</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Typing indicator -->
        <div v-if="loading" class="agent-msg agent-msg-assistant">
          <div class="agent-msg-avatar">
            <Sparkles :size="16" :stroke-width="1.8" />
          </div>
          <div class="agent-msg-main">
            <div class="agent-msg-role">助手</div>
            <div class="agent-typing"><span></span><span></span><span></span></div>
          </div>
        </div>
      </div>
    </div>

    <!-- ======== Composer ======== -->
    <div class="agent-composer-wrap">
      <div class="agent-composer" :class="{ 'is-loading': loading }">
        <el-input
          v-model="input"
          type="textarea"
          :autosize="{ minRows: 1, maxRows: 5 }"
          placeholder="输入您的问题..."
          resize="none"
          @keydown.enter.exact.prevent="send()"
        />
        <div class="agent-composer-foot">
          <span class="agent-hint">Enter 发送 · Shift+Enter 换行</span>
          <button class="agent-send" :disabled="loading || !input.trim()" @click="send()">
            <el-icon v-if="!loading" :size="16"><Promotion /></el-icon>
            <span v-else class="agent-send-loading"></span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { agentApi, meetingApi, projectApi } from '@/api'
import { useUserStore } from '@/stores/user'
import {
  Promotion, Calendar, Delete, CopyDocument, Refresh,
  Download, FolderOpened, List, ChatDotRound
} from '@element-plus/icons-vue'
import { Sparkles, ThumbsUp, ThumbsDown } from 'lucide-vue-next'
import { renderRich } from '@/utils/markdown'
import dayjs from 'dayjs'

const STORAGE_KEY = 'enterprise-pilot:agent:messages'

const userStore = useUserStore()
const messages = ref([])
const input = ref('')
const loading = ref(false)
const chatBody = ref(null)
const suggestions = ref([])
let streamAbort = null
let isUnmounted = false

function persistMessages() {
  const toSave = messages.value.map((m) => ({
    role: m.role,
    content: m.content,
    toolResult: m.toolResult || null,
    feedback: m.feedback || null
  }))
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
}

const userInitials = computed(() => {
  const name = (userStore.userInfo?.realName || userStore.userInfo?.username || '').trim()
  return name ? name.slice(0, 1).toUpperCase() : 'U'
})

const TOOL_META = {
  my_bookings: { icon: Calendar, label: '已查询您的会议安排' },
  my_projects: { icon: FolderOpened, label: '已查询您的项目' },
  my_tasks: { icon: List, label: '已查询您的任务' }
}
function toolMeta(name) {
  return TOOL_META[name] || { icon: List, label: '工具结果' }
}

function suggestionIcon(s) {
  if (s.includes('会议')) return Calendar
  if (s.includes('项目')) return FolderOpened
  if (s.includes('任务')) return List
  return ChatDotRound
}

function buildHistory() {
  return messages.value
    .filter((m) => m.role === 'user' || (m.role === 'assistant' && m.content))
    .slice(-10)
    .map((m) => ({ role: m.role, content: m.content }))
}

function parseSSE(block) {
  let event = 'message'
  let data = ''
  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim()
    else if (line.startsWith('data:')) data += line.slice(5).trim()
  }
  if (!data) return null
  return { event, data }
}

async function streamChat(payload, handlers, signal) {
  const res = await fetch('/ai/api/v1/agent/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: userStore.token ? `Bearer ${userStore.token}` : ''
    },
    body: JSON.stringify(payload),
    signal
  })
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop()
    for (const part of parts) {
      const evt = parseSSE(part)
      if (!evt) continue
      if (evt.event === 'tool') handlers.onTool?.(JSON.parse(evt.data))
      else if (evt.event === 'error') handlers.onError?.(JSON.parse(evt.data)?.message || '流式请求失败')
      else if (evt.event === 'done') handlers.onDone?.()
      else if (evt.data) handlers.onDelta?.(JSON.parse(evt.data)?.text || '')
    }
  }
}

async function send(text) {
  const content = (text ?? input.value).trim()
  if (!content || loading.value) return
  input.value = ''
  const history = buildHistory()
  messages.value.push({ role: 'user', content })
  const assistantMsg = { role: 'assistant', content: '', toolResult: null, feedback: null }
  messages.value.push(assistantMsg)
  loading.value = true
  scrollToBottom()
  streamAbort = new AbortController()
  let lastDataAt = Date.now()
  const idleTimer = setInterval(() => {
    if (Date.now() - lastDataAt > 20000) streamAbort.abort()
  }, 5000)
  try {
    await streamChat(
      { message: content, history },
      {
        onTool: (tool) => { lastDataAt = Date.now(); assistantMsg.toolResult = tool; if (!isUnmounted) persistMessages() },
        onDelta: (t) => { lastDataAt = Date.now(); assistantMsg.content += t; scrollToBottom() },
        onError: (msg) => { if (!assistantMsg.content) assistantMsg.content = `请求失败：${msg}` }
      },
      streamAbort.signal
    )
  } catch {
    if (isUnmounted) return
    assistantMsg.content = ''
    try {
      const data = await agentApi.chat({ message: content, history })
      assistantMsg.content = data?.answer || '（无回复）'
      assistantMsg.toolResult = data?.tool_result || null
    } catch {
      assistantMsg.content = '请求失败，请稍后重试'
    }
  } finally {
    clearInterval(idleTimer)
    loading.value = false
    if (!assistantMsg.content && !assistantMsg.toolResult) assistantMsg.content = '（无回复）'
    persistMessages()
    scrollToBottom()
  }
}

function retry(index) {
  if (loading.value) return
  let userIndex = -1
  for (let i = index; i >= 0; i--) {
    if (messages.value[i].role === 'user') { userIndex = i; break }
  }
  if (userIndex < 0) return
  const content = messages.value[userIndex].content
  messages.value = messages.value.slice(0, userIndex)
  input.value = content
  send(content)
}

async function clearChat() {
  if (!messages.value.length) return
  try {
    await ElMessageBox.confirm('确定清空当前对话？', '清空对话', {
      confirmButtonText: '清空',
      cancelButtonText: '取消',
      type: 'warning'
    })
    messages.value = []
    localStorage.removeItem(STORAGE_KEY)
  } catch { /* cancelled */ }
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制')
  } catch { /* clipboard unavailable */ }
}

function setFeedback(msg, value) {
  msg.feedback = msg.feedback === value ? null : value
}

function exportChat() {
  if (!messages.value.length) return
  const lines = messages.value.map((m) => {
    const role = m.role === 'user' ? '我' : '助手'
    let text = `## ${role}\n\n${m.content}`
    if (m.toolResult?.data?.length) text += `\n\n> 工具结果：${m.toolResult.name}`
    return text
  })
  const blob = new Blob([lines.join('\n\n---\n\n')], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `对话记录-${dayjs().format('YYYYMMDD-HHmm')}.md`
  a.click()
  URL.revokeObjectURL(url)
}

async function loadSuggestions() {
  const list = []
  try {
    const meetings = await meetingApi.myBookings()
    if (meetings?.length) list.push('查询我的会议安排')
  } catch { /* ignore */ }
  try {
    const projects = await projectApi.my()
    if (projects?.length) list.push('我的项目进展如何')
  } catch { /* ignore */ }
  list.push('总结本周工作安排', '介绍一下这个平台')
  suggestions.value = list.slice(0, 3)
}

function handleKeydown(e) {
  if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
    e.preventDefault()
    clearChat()
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (chatBody.value) chatBody.value.scrollTop = chatBody.value.scrollHeight
  })
}

function fmtDate(t) {
  return t ? dayjs(t).format('M月D日') : ''
}
function fmtTime(t) {
  return t ? dayjs(t).format('HH:mm') : ''
}

function meetingStatusClass(s) {
  if (s === 2) return 'live'
  if (s === 1) return 'upcoming'
  if (s === 3) return 'done'
  return 'cancelled'
}
function meetingStatusLabel(s) {
  return ['已取消', '即将开始', '进行中', '已结束'][s] || '未知'
}
function projectStatusClass(s) {
  if (s === 1) return 'upcoming'
  if (s === 2) return 'done'
  return 'draft'
}
function projectStatusLabel(s) {
  return ['草稿', '进行中', '已完成', '已延期'][s] || '未知'
}
function taskStatusClass(s) {
  if (s === 1) return 'upcoming'
  if (s === 2) return 'done'
  return 'draft'
}
function taskStatusLabel(s) {
  return ['待开始', '进行中', '已完成'][s] || '未知'
}

watch(messages, persistMessages, { deep: true })

onMounted(() => {
  isUnmounted = false
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const saved = JSON.parse(raw)
      messages.value = saved.filter(
        (m) => m.role === 'user' || (m.role === 'assistant' && m.content)
      )
    }
  } catch { /* ignore */ }
  if (!userStore.userInfo) userStore.fetchMe().catch(() => {})
  loadSuggestions()
  window.addEventListener('keydown', handleKeydown)
})
onUnmounted(() => {
  isUnmounted = true
  persistMessages()
  streamAbort?.abort()
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
/* ======== Root: flex column fills parent ======== */
.agent {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 480px;
}

/* ======== Top toolbar ======== */
.agent-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 2px 2px 14px;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}
.agent-hd-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.agent-brand {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--brand-400), var(--brand-700));
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.agent-name {
  font-size: 16px;
  font-weight: 650;
  letter-spacing: -0.01em;
  color: var(--ink-950);
  white-space: nowrap;
}
.agent-hd-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--ink-300);
  flex-shrink: 0;
}
.agent-tags {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.agent-tag {
  font-size: 11.5px;
  font-weight: 500;
  color: var(--ink-600);
  background: var(--ink-100);
  border-radius: 999px;
  padding: 2.5px 10px;
  white-space: nowrap;
}
.agent-hd-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.agent-hd-btn {
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
.agent-hd-btn:hover {
  color: var(--ink-800);
  background: var(--ink-100);
}
.agent-hd-btn-danger:hover {
  color: var(--danger);
  background: var(--danger-bg);
}

/* ======== Message area (white card) ======== */
.agent-body {
  flex: 1;
  overflow-y: auto;
  background: var(--bg-page);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
  padding: 32px 28px;
}
.agent-column {
  max-width: 780px;
  margin: 0 auto;
}

/* ---- Empty state ---- */
.agent-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 420px;
  padding: 24px 0;
}
.agent-empty-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--brand-400), var(--brand-700));
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}
.agent-empty-title {
  font-size: 22px;
  font-weight: 650;
  letter-spacing: -0.02em;
  color: var(--ink-950);
  margin-bottom: 8px;
}
.agent-empty-desc {
  font-size: 14px;
  color: var(--ink-500);
  line-height: 1.7;
  max-width: 460px;
  margin: 0 0 30px;
}
.agent-suggestions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  width: 100%;
  max-width: 720px;
}
.agent-suggestion {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 13px 14px;
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-left: 2px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
  transition: all var(--dur-fast) var(--ease-out);
}
.agent-suggestion:hover {
  border-color: var(--border-strong);
  border-left-color: var(--brand-500);
}
.agent-suggestion-icon {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: var(--brand-50);
  color: var(--brand-600);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.agent-suggestion-text {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--ink-800);
  line-height: 1.45;
}
.agent-suggestion-arrow {
  color: var(--ink-300);
  font-size: 13px;
  flex-shrink: 0;
  transition: all var(--dur-fast) var(--ease-out);
}
.agent-suggestion:hover .agent-suggestion-arrow {
  color: var(--brand-600);
  transform: translateX(2px);
}

/* ---- Messages ---- */
.agent-msg {
  display: flex;
  gap: 12px;
  margin-bottom: 28px;
  animation: agent-msg-in 0.2s var(--ease-out) both;
}
.agent-msg-user {
  flex-direction: row-reverse;
}
@keyframes agent-msg-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.agent-msg-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--brand-400), var(--brand-700));
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
  margin-top: 2px;
}
.agent-msg-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}
.agent-msg-user .agent-msg-main {
  align-items: flex-end;
}
.agent-msg-role {
  font-size: 11.5px;
  font-weight: 500;
  color: var(--brand-700);
  background: var(--brand-50);
  display: inline-block;
  border-radius: 4px;
  padding: 1px 8px;
  margin-bottom: 6px;
  align-self: flex-start;
}
.agent-msg-content {
  position: relative;
  min-width: 0;
  max-width: 100%;
}
.agent-msg-user .agent-msg-content {
  max-width: 65%;
}
.agent-msg-assistant .agent-msg-content {
  background: var(--ink-50);
  border-radius: 10px;
  padding: 16px 18px;
}
.agent-msg-user-bubble {
  background: var(--ink-100);
  color: var(--ink-900);
  border-radius: 12px;
  border-top-left-radius: 4px;
  padding: 10px 14px;
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}
.agent-msg-rich {
  font-size: 14px;
  line-height: 1.8;
  color: var(--ink-800);
  word-break: break-word;
}

.agent-msg-thinking {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--ink-400);
}
.agent-msg-thinking::before {
  content: '';
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid var(--ink-200);
  border-top-color: var(--brand-500);
  animation: agent-spin 0.8s linear infinite;
}

/* ---- Rich text (markdown) ---- */
.agent-msg-rich :deep(p) {
  margin: 0 0 10px;
}
.agent-msg-rich :deep(p:last-child) {
  margin-bottom: 0;
}
.agent-msg-rich :deep(strong) {
  font-weight: 600;
  color: var(--ink-950);
}
.agent-msg-rich :deep(ul),
.agent-msg-rich :deep(ol) {
  margin: 0 0 10px;
  padding-left: 20px;
}
.agent-msg-rich :deep(li) {
  margin-bottom: 4px;
}
.agent-msg-rich :deep(blockquote) {
  margin: 0 0 10px;
  padding: 2px 0 2px 14px;
  border-left: 2px solid var(--ink-300);
  color: var(--ink-600);
}
.agent-msg-rich :deep(h1),
.agent-msg-rich :deep(h2),
.agent-msg-rich :deep(h3),
.agent-msg-rich :deep(h4) {
  font-weight: 650;
  color: var(--ink-950);
  margin: 16px 0 8px;
}
.agent-msg-rich :deep(h1) { font-size: 17px; }
.agent-msg-rich :deep(h2) { font-size: 16px; }
.agent-msg-rich :deep(h3) { font-size: 15px; }
.agent-msg-rich :deep(h4) { font-size: 14px; }
.agent-msg-rich :deep(code) {
  font-family: var(--font-mono);
  font-size: 12.5px;
  background: var(--ink-100);
  border-radius: 4px;
  padding: 1px 5px;
  color: var(--ink-800);
}
.agent-msg-rich :deep(pre) {
  margin: 0 0 12px;
  background: var(--ink-900);
  color: var(--ink-100);
  border-radius: 8px;
  padding: 14px 16px;
  overflow-x: auto;
}
.agent-msg-rich :deep(pre code) {
  background: transparent;
  padding: 0;
  color: inherit;
  font-size: 12.5px;
  line-height: 1.6;
}
.agent-msg-rich :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 0 0 12px;
  font-size: 13px;
}
.agent-msg-rich :deep(th),
.agent-msg-rich :deep(td) {
  border: 1px solid var(--ink-200);
  padding: 6px 10px;
  text-align: left;
}
.agent-msg-rich :deep(th) {
  background: var(--ink-50);
  font-weight: 600;
}
.agent-msg-rich :deep(a) {
  color: var(--brand-600);
  text-decoration: none;
}
.agent-msg-rich :deep(a:hover) {
  text-decoration: underline;
}

/* ---- Message actions (hover reveal) ---- */
.agent-msg-actions {
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--dur-fast) var(--ease-out);
  margin-top: 8px;
  display: flex;
  gap: 4px;
}
.agent-msg-assistant:hover .agent-msg-actions {
  opacity: 1;
  pointer-events: auto;
}
.agent-action {
  position: relative;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--ink-400);
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
}
.agent-action:hover {
  background: var(--ink-100);
  color: var(--ink-700);
}
.agent-action.active {
  color: var(--brand-600);
  background: var(--brand-50);
}
.agent-action::after {
  content: '';
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%) translateY(3px);
  background: var(--ink-800);
  color: #fff;
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
  padding: 4px 8px;
  border-radius: 4px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
  z-index: 10;
}
.agent-action:nth-child(1)::after { content: '复制'; }
.agent-action:nth-child(2)::after { content: '重新生成'; }
.agent-action:nth-child(3)::after { content: '有帮助'; }
.agent-action:nth-child(4)::after { content: '没帮助'; }
.agent-action:hover::after {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

/* ---- Tool result cards ---- */
.agent-tool {
  margin-top: 16px;
  border-top: 1px solid var(--border-subtle);
  padding-top: 14px;
}
.agent-tool-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-500);
  margin-bottom: 10px;
}
.agent-tool-label :deep(.el-icon) {
  color: var(--brand-600);
}
.agent-tool:not(:has(.agent-meeting-time)):not(:has(.agent-progress)) .agent-tool-label :deep(.el-icon) {
  color: var(--ink-400);
}
.agent-cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.agent-meeting {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 14px;
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  transition: border-color var(--dur-fast) var(--ease-out);
}
.agent-meeting:hover {
  border-color: var(--border-strong);
}
.agent-meeting:has(.agent-progress) {
  box-shadow: inset 3px 0 0 var(--brand-500);
}
.agent-meeting:not(:has(.agent-meeting-time)):not(:has(.agent-progress)) {
  box-shadow: inset 3px 0 0 var(--ink-400);
}
.agent-meeting-time {
  display: flex;
  flex-direction: column;
  min-width: 118px;
  flex-shrink: 0;
}
.agent-meeting-date {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink-800);
}
.agent-meeting-clock {
  font-size: 11.5px;
  color: var(--ink-400);
  font-variant-numeric: tabular-nums;
}
.agent-meeting-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.agent-meeting-title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--ink-900);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.agent-meeting-meta {
  font-size: 12px;
  color: var(--ink-400);
}
.agent-meeting-status {
  font-size: 11.5px;
  font-weight: 500;
  flex-shrink: 0;
}
.agent-meeting-status.upcoming,
.agent-meeting-status.live {
  color: var(--brand-600);
}
.agent-meeting-status.done {
  color: var(--ink-400);
}
.agent-meeting-status.cancelled,
.agent-meeting-status.draft {
  color: var(--ink-300);
}
.agent-progress {
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-700);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}
.agent-cards-empty {
  font-size: 13px;
  color: var(--ink-400);
  padding: 8px 0;
}

/* ---- Typing ---- */
.agent-typing {
  display: flex;
  gap: 5px;
  padding: 10px 0;
}
.agent-typing span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--brand-400);
  animation: agent-blink 1.2s infinite ease-in-out;
}
.agent-typing span:nth-child(2) {
  animation-delay: 0.2s;
}
.agent-typing span:nth-child(3) {
  animation-delay: 0.4s;
}
@keyframes agent-blink {
  0%, 80%, 100% { opacity: 0.3; }
  40% { opacity: 1; }
}

/* ======== Composer ======== */
.agent-composer-wrap {
  padding: 16px 0 0;
  flex-shrink: 0;
}
.agent-composer {
  position: relative;
  border: 1px solid var(--border-default);
  border-radius: 12px;
  padding: 12px 14px 10px;
  background: var(--bg-card);
  transition: border-color var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out), opacity var(--dur-base) var(--ease-out);
}
.agent-composer:focus-within {
  border-color: var(--brand-400);
  box-shadow: var(--shadow-sm);
}
.agent-composer.is-loading {
  opacity: 0.7;
  pointer-events: none;
}
.agent-composer.is-loading::after {
  content: '正在思考...';
  position: absolute;
  left: 14px;
  bottom: 12px;
  font-size: 11px;
  color: var(--ink-400);
}
.agent-composer.is-loading .agent-hint {
  visibility: hidden;
}
.agent-composer :deep(.el-textarea__inner) {
  background: transparent;
  border: none;
  box-shadow: none !important;
  padding: 2px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--ink-900);
}
.agent-composer :deep(.el-textarea__inner::placeholder) {
  color: var(--ink-300);
}
.agent-composer-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}
.agent-hint {
  font-size: 11px;
  color: var(--ink-300);
}
.agent-send {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: none;
  background: var(--brand-600);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
}
.agent-send:hover:not(:disabled) {
  background: var(--brand-700);
  transform: translateY(-1px);
}
.agent-send:disabled {
  background: var(--ink-100);
  color: var(--ink-300);
  cursor: not-allowed;
}
.agent-send-loading {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid var(--ink-200);
  border-top-color: #fff;
  animation: agent-spin 0.8s linear infinite;
}
@keyframes agent-spin {
  to { transform: rotate(360deg); }
}

/* ======== Responsive ======== */
@media (max-width: 900px) {
  .agent-tags {
    display: none;
  }
  .agent-hd-dot {
    display: none;
  }
  .agent-suggestions {
    grid-template-columns: 1fr;
    max-width: 420px;
  }
  .agent-meeting {
    flex-wrap: wrap;
    gap: 8px;
  }
}
@media (max-width: 768px) {
  .agent-body {
    padding: 24px 18px;
  }
  .agent-msg-user .agent-msg-content {
    max-width: 90%;
  }
  .agent-meeting {
    flex-wrap: wrap;
    gap: 8px;
  }
}
</style>
