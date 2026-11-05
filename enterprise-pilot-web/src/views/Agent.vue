<template>
  <div class="agent">
    <!-- ======== Top toolbar ======== -->
    <div class="agent-hd">
      <div class="agent-hd-left">
        <div class="agent-brand">
          <Sparkles :size="16" :stroke-width="1.8" />
        </div>
        <div class="agent-hd-titles">
          <span class="agent-name">企业智能助手</span>
          <span class="agent-sub">知识库 · 会议 · 项目 · 任务</span>
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
        <div v-if="messages.length === 0" class="agent-hero">
          <div class="agent-hero-mark">
            <Sparkles :size="26" :stroke-width="1.6" />
          </div>
          <div class="agent-hero-title">{{ greeting }}{{ displayName ? '，' + displayName : '' }}</div>
          <p class="agent-hero-sub">我可以帮你检索知识库、查询会议安排、跟进项目与任务，有什么可以帮您？</p>
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
          <div v-if="m.role === 'assistant'" class="agent-msg-avatar">
            <Sparkles :size="15" :stroke-width="1.8" />
          </div>

          <div class="agent-msg-main">
            <div v-if="m.role === 'assistant'" class="agent-msg-role">智能助手</div>
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

              <div v-if="m.steps && m.steps.length" class="agent-tool">
                <div
                  v-for="(s, si) in m.steps"
                  :key="si"
                  class="agent-step"
                  :class="{ 'is-running': s.status === 'running' }"
                >
                  <span class="agent-step-dot">
                    <span v-if="s.status === 'running'" class="agent-step-pulse"></span>
                    <el-icon v-else :size="12"><component :is="toolMeta(s.tool).icon" /></el-icon>
                  </span>
                  <span class="agent-step-label">{{ toolMeta(s.tool).label }}</span>
                  <span v-if="s.summary" class="agent-step-summary">{{ s.summary }}</span>
                </div>
              </div>

              <div v-if="m.sources && m.sources.length" class="agent-sources">
                <div class="agent-sources-label">参考资料</div>
                <div v-for="(src, si) in m.sources" :key="src.document_id" class="agent-source">
                  <span class="agent-source-index">{{ si + 1 }}</span>
                  <span class="agent-source-title">{{ src.title }}</span>
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
      <div class="agent-composer-column">
        <div class="agent-composer">
          <el-input
            v-model="input"
            type="textarea"
            :autosize="{ minRows: 1, maxRows: 5 }"
            placeholder="给智能助手发送消息…"
            resize="none"
            @keydown.enter.exact.prevent="send()"
          />
          <div class="agent-composer-foot">
            <span class="agent-hint"><kbd>Enter</kbd> 发送 · <kbd>Shift + Enter</kbd> 换行</span>
            <button class="agent-send" :disabled="loading || !input.trim()" title="发送" @click="send()">
              <ArrowUp v-if="!loading" :size="17" :stroke-width="2.2" />
              <span v-else class="agent-send-loading"></span>
            </button>
          </div>
        </div>
        <div class="agent-composer-note">内容由 AI 生成，仅供参考</div>
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
  Calendar, Delete, CopyDocument, Refresh,
  Download, FolderOpened, List, ChatDotRound, OfficeBuilding, Reading, User
} from '@element-plus/icons-vue'
import { Sparkles, ThumbsUp, ThumbsDown, ArrowUp } from 'lucide-vue-next'
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
    steps: m.steps || [],
    sources: m.sources || [],
    feedback: m.feedback || null
  }))
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
}

const displayName = computed(() => userStore.userInfo?.nickname || userStore.userInfo?.realName || userStore.userInfo?.username || '')
const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '上午好'
  if (h < 18) return '下午好'
  return '晚上好'
})

const TOOL_META = {
  list_my_bookings: { icon: Calendar, label: '查询会议安排' },
  list_meeting_rooms: { icon: OfficeBuilding, label: '查询会议室' },
  list_my_projects: { icon: FolderOpened, label: '查询项目' },
  list_my_tasks: { icon: List, label: '查询任务' },
  search_knowledge: { icon: Reading, label: '检索知识库' },
  find_colleague: { icon: User, label: '查找同事' },
  // 旧版记录里的工具名，保留映射避免历史对话显示成"工具结果"
  my_bookings: { icon: Calendar, label: '查询会议安排' },
  my_projects: { icon: FolderOpened, label: '查询项目' },
  my_tasks: { icon: List, label: '查询任务' },
  knowledge_base: { icon: Reading, label: '检索知识库' }
}
function toolMeta(name) {
  return TOOL_META[name] || { icon: List, label: '调用工具' }
}

function suggestionIcon(s) {
  if (s.includes('会议')) return Calendar
  if (s.includes('项目')) return FolderOpened
  if (s.includes('任务')) return List
  if (s.includes('知识库')) return FolderOpened
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
      if (evt.event === 'step') handlers.onStep?.(JSON.parse(evt.data))
      else if (evt.event === 'sources') handlers.onSources?.(JSON.parse(evt.data))
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
  const assistantMsg = { role: 'assistant', content: '', steps: [], sources: [], feedback: null }
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
        onStep: (step) => {
          lastDataAt = Date.now()
          // 同名工具的 running 事件先到、done 事件后到，按名称配对
          const pending = assistantMsg.steps.find((s) => s.tool === step.tool && s.status === 'running')
          if (step.status === 'done' && pending) {
            pending.status = 'done'
            pending.summary = step.summary || ''
          } else {
            assistantMsg.steps.push({ ...step })
          }
          if (!isUnmounted) persistMessages()
        },
        onSources: (payload) => {
          lastDataAt = Date.now()
          assistantMsg.sources = payload?.items || []
        },
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
      assistantMsg.steps = data?.steps || []
      assistantMsg.sources = data?.sources || []
    } catch {
      assistantMsg.content = '请求失败，请稍后重试'
    }
  } finally {
    clearInterval(idleTimer)
    loading.value = false
    if (!assistantMsg.content && !assistantMsg.steps.length) assistantMsg.content = '（无回复）'
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
    const used = (m.steps || []).filter((s) => s.status === 'done').map((s) => toolMeta(s.tool).label)
    if (used.length) text += `\n\n> 已调用：${used.join('、')}`
    if (m.sources?.length) text += `\n\n> 参考资料：${m.sources.map((s) => s.title).join('、')}`
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
  // Add knowledge base suggestion
  list.push('搜索知识库', '总结本周工作安排', '介绍一下这个平台')
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

function normalizeMessage(m) {
  // 兼容旧版本地记录：过去存的是单个 toolResult，现在统一成 steps 数组
  const steps = m.steps || (m.toolResult ? [{ tool: m.toolResult.name, status: 'done', summary: '' }] : [])
  return { role: m.role, content: m.content, steps, sources: m.sources || [], feedback: m.feedback || null }
}

watch(messages, persistMessages, { deep: true })

onMounted(() => {
  isUnmounted = false
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const saved = JSON.parse(raw)
      messages.value = saved
        .filter((m) => m.role === 'user' || (m.role === 'assistant' && m.content))
        .map(normalizeMessage)
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
  padding: 4px 2px 14px;
  flex-shrink: 0;
}
.agent-hd-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.agent-brand {
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
.agent-hd-titles {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.agent-name {
  font-size: 15px;
  font-weight: 650;
  letter-spacing: -0.01em;
  color: var(--ink-950);
  white-space: nowrap;
  line-height: 1.35;
}
.agent-sub {
  font-size: 11.5px;
  color: var(--ink-400);
  line-height: 1.3;
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

/* ======== Message area ======== */
.agent-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 28px 32px;
}
.agent-column {
  max-width: 780px;
  margin: 0 auto;
}

/* ---- Empty state hero ---- */
.agent-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 420px;
  padding: 24px 0;
  animation: agent-hero-in 0.4s var(--ease-out) both;
}
@keyframes agent-hero-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.agent-hero-mark {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: linear-gradient(180deg, #ffffff, var(--ink-50));
  border: 1px solid var(--border-default);
  box-shadow: var(--shadow-sm);
  color: var(--brand-700);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}
.agent-hero-title {
  font-size: 22px;
  font-weight: 650;
  letter-spacing: -0.02em;
  color: var(--ink-950);
  margin-bottom: 8px;
}
.agent-hero-sub {
  font-size: 14px;
  color: var(--ink-500);
  line-height: 1.7;
  max-width: 460px;
  margin: 0 0 32px;
}
.agent-suggestions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  width: 100%;
  max-width: 640px;
}
.agent-suggestion {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  transition: all var(--dur-fast) var(--ease-out);
}
.agent-suggestion:hover {
  border-color: var(--brand-300);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}
.agent-suggestion-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--brand-50);
  color: var(--brand-600);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background var(--dur-fast) var(--ease-out);
}
.agent-suggestion:hover .agent-suggestion-icon {
  background: var(--brand-100);
}
.agent-suggestion-text {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--ink-700);
  line-height: 1.45;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.agent-suggestion-arrow {
  color: var(--brand-600);
  font-size: 14px;
  opacity: 0;
  transform: translateX(-6px);
  flex-shrink: 0;
  transition: all var(--dur-fast) var(--ease-out);
}
.agent-suggestion:hover .agent-suggestion-arrow {
  opacity: 1;
  transform: none;
}

/* ---- Messages ---- */
.agent-msg {
  display: flex;
  gap: 12px;
  margin-bottom: 26px;
  animation: agent-msg-in 0.25s var(--ease-out) both;
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
  width: 30px;
  height: 30px;
  border-radius: 9px;
  background: linear-gradient(180deg, #ffffff, var(--ink-50));
  border: 1px solid var(--border-default);
  box-shadow: var(--shadow-xs);
  color: var(--brand-700);
  display: flex;
  align-items: center;
  justify-content: center;
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
  font-size: 12px;
  font-weight: 500;
  color: var(--ink-400);
  margin-bottom: 5px;
}
.agent-msg-content {
  position: relative;
  min-width: 0;
  max-width: 100%;
}
.agent-msg-user .agent-msg-content {
  max-width: 72%;
}
.agent-msg-user-bubble {
  background: rgba(20, 184, 166, 0.1);
  color: var(--ink-900);
  border-radius: 16px;
  border-top-right-radius: 4px;
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

/* ---- Tool timeline ---- */
.agent-tool {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 14px;
}
.agent-step {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--ink-500);
  animation: agent-step-in var(--dur-fast) var(--ease-out);
}
.agent-step-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 6px;
  background: var(--ink-50);
  color: var(--ink-400);
  flex-shrink: 0;
}
.agent-step.is-running .agent-step-dot {
  background: var(--brand-50);
}
.agent-step-label {
  font-weight: 500;
  color: var(--ink-700);
}
.agent-step.is-running .agent-step-label {
  color: var(--ink-500);
}
.agent-step-summary {
  color: var(--ink-400);
}
.agent-step-summary::before {
  content: "·";
  margin-right: 6px;
}
.agent-step-pulse {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--brand-600);
  animation: agent-pulse 1.1s ease-in-out infinite;
}
@keyframes agent-pulse {
  0%, 100% { opacity: 0.25; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1); }
}
@keyframes agent-step-in {
  from { opacity: 0; transform: translateY(-2px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ---- Knowledge sources ---- */
.agent-sources {
  margin-top: 12px;
  padding: 10px 12px;
  border: 1px solid var(--border-default);
  border-radius: 10px;
  background: var(--bg-card);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.agent-sources-label {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--ink-400);
  letter-spacing: 0.02em;
}
.agent-source {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--ink-700);
}
.agent-source-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  border-radius: 4px;
  background: var(--ink-50);
  color: var(--ink-400);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.agent-source-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---- Typing ---- */
.agent-typing {
  display: inline-flex;
  gap: 5px;
  padding: 9px 14px;
  background: var(--ink-100);
  border-radius: 14px;
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
  padding: 14px 0 0;
  flex-shrink: 0;
}
.agent-composer-column {
  max-width: 780px;
  margin: 0 auto;
}
.agent-composer {
  position: relative;
  border: 1px solid var(--border-default);
  border-radius: 22px;
  padding: 12px 14px 10px 18px;
  background: var(--bg-card);
  box-shadow: 0 1px 2px rgba(28, 25, 23, 0.04), 0 8px 24px -8px rgba(28, 25, 23, 0.08);
  transition: border-color var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out);
}
.agent-composer:hover {
  border-color: var(--border-strong);
}
.agent-composer:focus-within {
  border-color: var(--brand-500);
  box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.12), 0 8px 24px -8px rgba(15, 118, 110, 0.18);
}
.agent-composer :deep(.el-textarea__inner) {
  background: transparent;
  border: none;
  box-shadow: none !important;
  padding: 4px 2px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--ink-900);
}
.agent-composer :deep(.el-textarea__inner::placeholder) {
  color: var(--ink-400);
}
.agent-composer-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 6px;
}
.agent-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--ink-400);
  user-select: none;
}
.agent-hint kbd {
  font-family: inherit;
  font-size: 10px;
  line-height: 1;
  color: var(--ink-500);
  background: var(--ink-50);
  border: 1px solid var(--border-default);
  border-bottom-width: 2px;
  border-radius: 4px;
  padding: 2.5px 5px;
}
.agent-send {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  flex-shrink: 0;
  background: linear-gradient(135deg, var(--brand-500), var(--brand-700));
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(15, 118, 110, 0.3);
  transition: all var(--dur-fast) var(--ease-out);
}
.agent-send:hover:not(:disabled) {
  transform: translateY(-1px) scale(1.04);
  box-shadow: 0 4px 14px rgba(15, 118, 110, 0.38);
}
.agent-send:active:not(:disabled) {
  transform: translateY(0) scale(0.96);
}
.agent-send:disabled {
  background: var(--ink-100);
  color: var(--ink-300);
  box-shadow: none;
  cursor: not-allowed;
}
.agent-send-loading {
  width: 15px;
  height: 15px;
  border-radius: 50%;
  border: 2px solid var(--ink-200);
  border-top-color: var(--ink-500);
  animation: agent-spin 0.8s linear infinite;
}
@keyframes agent-spin {
  to { transform: rotate(360deg); }
}
.agent-composer-note {
  margin-top: 8px;
  text-align: center;
  font-size: 11px;
  color: var(--ink-400);
}

/* ======== Responsive ======== */
@media (max-width: 900px) {
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
    padding: 16px 16px 24px;
  }
  .agent-hero {
    padding-top: 5vh;
    min-height: 0;
  }
  .agent-hint {
    display: none;
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
