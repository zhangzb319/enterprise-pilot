<template>
  <div class="dashboard">
    <!-- ======== Hero ======== -->
    <section class="hero">
      <div class="hero-main">
        <h1 class="hero-greeting">{{ greeting }}，{{ firstName }}</h1>
        <p class="hero-date">{{ todayText }}</p>
        <p class="hero-status">{{ statusLine }}</p>
      </div>
      <div class="hero-actions">
        <button class="btn-secondary" @click="$router.push('/projects')">新建项目</button>
        <button class="btn-primary" @click="$router.push('/meetings')">预约会议</button>
      </div>
    </section>

    <!-- ======== Today's focus ======== -->
    <section v-if="focusItem" class="focus">
      <span class="focus-label">今日重点</span>
      <span class="focus-time">{{ focusItem.time }}</span>
      <span class="focus-title">{{ focusItem.title }}</span>
      <span class="focus-meta">{{ focusItem.meta }}</span>
      <router-link :to="focusItem.link" class="focus-link">{{ focusItem.linkText }}</router-link>
    </section>
    <section v-else class="focus focus-empty">
      <span class="focus-empty-text">今日暂无重点安排</span>
    </section>

    <!-- ======== Week overview stats ======== -->
    <section class="stats">
      <div class="stat-card">
        <span class="stat-label">本周会议</span>
        <div class="stat-value-row">
          <span class="stat-value">{{ weekStats.meetings }}</span>
          <span class="stat-unit">场</span>
        </div>
        <div class="stat-bar">
          <div class="stat-bar-fill" :style="{ width: statBars.meetings + '%' }"></div>
        </div>
      </div>
      <div class="stat-card">
        <span class="stat-label">进行中项目</span>
        <div class="stat-value-row">
          <span class="stat-value">{{ activeProjects }}</span>
          <span class="stat-unit">个</span>
        </div>
        <div class="stat-bar">
          <div class="stat-bar-fill" :style="{ width: statBars.projects + '%' }"></div>
        </div>
      </div>
      <div class="stat-card">
        <span class="stat-label">待办事项</span>
        <div class="stat-value-row">
          <span class="stat-value">{{ weekStats.pending }}</span>
          <span class="stat-unit">项</span>
        </div>
        <div class="stat-bar">
          <div class="stat-bar-fill" :style="{ width: statBars.pending + '%' }"></div>
        </div>
      </div>
      <div class="stat-card">
        <span class="stat-label">完成率</span>
        <div class="stat-value-row">
          <span class="stat-value stat-value-brand">{{ weekStats.rate }}</span>
          <span class="stat-unit">%</span>
        </div>
        <div class="stat-bar">
          <div class="stat-bar-fill stat-bar-brand" :style="{ width: statBars.rate + '%' }"></div>
        </div>
      </div>
    </section>

    <!-- ======== Two columns ======== -->
    <div class="dash-grid">
      <!-- ======== Left column ======== -->
      <div class="dash-col">
        <!-- Today's schedule -->
        <section class="card">
          <div class="card-head">
            <h3 class="card-title">今日安排</h3>
            <router-link to="/meetings" class="card-link">查看全部 →</router-link>
          </div>
          <div v-if="todayBookings.length === 0" class="card-empty">
            <el-icon :size="18"><Calendar /></el-icon>
            <span>今日暂无会议安排</span>
          </div>
          <div v-else class="tl">
            <div v-for="b in todayBookings" :key="b.id" class="tl-item">
              <div class="tl-track">
                <span class="tl-dot" :class="tlStatusClass(b.status)"></span>
              </div>
              <div class="tl-body">
                <div class="tl-title-row">
                  <span class="tl-title">{{ b.title }}</span>
                  <span class="tl-status" :class="tlStatusClass(b.status)">{{ bookingStatusLabel(b.status) }}</span>
                </div>
                <div class="tl-meta">{{ formatTime(b.startTime) }} · {{ b.roomName }}</div>
              </div>
            </div>
          </div>
        </section>

        <!-- My projects -->
        <section class="card">
          <div class="card-head">
            <h3 class="card-title">我的项目</h3>
            <router-link to="/projects" class="card-link">查看全部 →</router-link>
          </div>
          <div v-if="projects.length === 0" class="card-empty">
            <el-icon :size="18"><FolderOpened /></el-icon>
            <span>暂无项目</span>
          </div>
          <div v-else class="proj-list">
            <div v-for="p in projects.slice(0, 4)" :key="p.id" class="proj-item">
              <div class="proj-top">
                <span class="proj-name">{{ p.projectName }}</span>
                <span class="proj-status" :class="projectStatusClass(p.status)">{{ projectStatusLabel(p.status) }}</span>
              </div>
              <div class="proj-bar-row">
                <div class="proj-bar">
                  <div class="proj-bar-fill" :style="{ width: (p.progress || 0) + '%' }"></div>
                </div>
                <span class="proj-progress">{{ p.progress || 0 }}%</span>
              </div>
              <div class="proj-meta">
                <span>{{ p.ownerName }}</span>
                <span v-if="p.endDate" class="proj-date">截止 {{ p.endDate }}</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- ======== Right column ======== -->
      <div class="dash-col">
        <!-- My tasks -->
        <section class="card">
          <div class="card-head">
            <h3 class="card-title">我的任务</h3>
            <router-link to="/projects" class="card-link">查看全部 →</router-link>
          </div>
          <div v-if="taskGroups.length === 0" class="card-empty">
            <el-icon :size="18"><List /></el-icon>
            <span>暂无待办任务</span>
          </div>
          <template v-else>
            <div class="task-scroll">
              <div v-for="group in taskGroups" :key="group.label" class="task-group">
                <div class="task-group-label">{{ group.label }}</div>
                <div v-for="t in group.items" :key="t.id" class="task-item">
                  <span class="task-check" :class="{ progress: t.status === 1, done: t.status === 2 }">
                    <el-icon v-if="t.status === 2" :size="10"><Check /></el-icon>
                  </span>
                  <div class="task-body">
                    <span class="task-title" :class="{ done: t.status === 2, overdue: isOverdue(t) }">{{ t.title }}</span>
                    <span class="task-meta">{{ t.projectName }}</span>
                  </div>
                  <span class="task-due" :class="{ overdue: isOverdue(t) }">{{ dueLabel(t) }}</span>
                </div>
              </div>
            </div>
            <button class="more-btn" @click="$router.push('/projects')">查看更多</button>
          </template>
        </section>

        <!-- Recent activity -->
        <section class="card">
          <div class="card-head">
            <h3 class="card-title">最近活动</h3>
          </div>
          <div v-if="activities.length === 0" class="card-empty">
            <el-icon :size="18"><Clock /></el-icon>
            <span>暂无活动记录</span>
          </div>
          <div v-else class="act-feed">
            <div v-for="(a, i) in activities" :key="i" class="act-item">
              <div class="act-track">
                <span class="act-dot" :class="a.type || 'default'"></span>
              </div>
              <div class="act-body">
                <span class="act-text"><strong>{{ a.user }}</strong> {{ a.action }}</span>
              </div>
              <span class="act-time">{{ a.time }}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Calendar, FolderOpened, List, Clock, Check } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { useUserStore } from '@/stores/user'
import { meetingApi, projectApi } from '@/api'

dayjs.extend(utc)

const userStore = useUserStore()

const displayName = computed(() => userStore.userInfo?.realName || userStore.userInfo?.username || '用户')
const firstName = computed(() => {
  const name = displayName.value.trim()
  return name.split(/\s+/)[0] || name
})

const myBookings = ref([])
const projects = ref([])
const activities = ref([])
const allTasksMap = ref([])

// ======== Helpers ========
const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '上午好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})

const todayText = computed(() => {
  const week = ['日', '一', '二', '三', '四', '五', '六'][new Date().getDay()]
  return `${dayjs().format('M月D日')} · 星期${week}`
})

const statusLine = computed(() => {
  const parts = []
  if (todayBookings.value.length) parts.push(`今天有 ${todayBookings.value.length} 场会议`)
  const pending = allTasksMap.value.filter((t) => t.status !== 2).length
  if (pending) parts.push(`${pending} 项待办`)
  if (!parts.length) parts.push('今天没有安排')
  return parts.join('，')
})

// ======== Week overview ========
const weekStats = computed(() => {
  const start = dayjs().startOf('week').add(1, 'day')
  const end = start.add(7, 'day')
  const meetings = myBookings.value.filter((b) => {
    const d = dayjs(b.startTime)
    return d.isAfter(start) && d.isBefore(end)
  }).length
  const totalTasks = allTasksMap.value.length
  const doneTasks = allTasksMap.value.filter((t) => t.status === 2).length
  const rate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
  return {
    meetings,
    projects: projects.value.length,
    pending: totalTasks - doneTasks,
    rate
  }
})

const activeProjects = computed(() => projects.value.filter((p) => p.status === 1).length)

const statBars = computed(() => ({
  meetings: Math.min(weekStats.value.meetings / 8, 1) * 100,
  projects: Math.min(activeProjects.value / 6, 1) * 100,
  pending: Math.min(weekStats.value.pending / 10, 1) * 100,
  rate: weekStats.value.rate
}))

// ======== Today's focus ========
const focusItem = computed(() => {
  const now = dayjs()
  const next = todayBookings.value.find((b) => {
    const s = dayjs(b.startTime)
    const e = dayjs(b.endTime)
    return e.isAfter(now) && (s.isAfter(now) || b.status === 2)
  })
  if (next) {
    return {
      time: dayjs(next.startTime).format('HH:mm'),
      title: next.title,
      meta: next.roomName,
      link: '/meetings',
      linkText: '查看会议 →'
    }
  }
  const pending = [...allTasksMap.value]
    .filter((t) => t.status !== 2)
    .sort((a, b) => (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31'))
  const t = pending[0]
  if (t) {
    return {
      time: dueLabel(t),
      title: t.title,
      meta: t.projectName,
      link: '/projects',
      linkText: '查看任务 →'
    }
  }
  return null
})

// ======== Today's Bookings ========
const todayBookings = computed(() => {
  const today = dayjs().format('YYYY-MM-DD')
  return myBookings.value
    .filter((b) => dayjs(b.startTime).format('YYYY-MM-DD') === today)
    .sort((a, b) => dayjs(a.startTime).valueOf() - dayjs(b.startTime).valueOf())
})

// ======== Tasks ========
const taskGroups = computed(() => {
  const inProgress = []
  const upcoming = []
  for (const t of allTasksMap.value) {
    if (t.status === 2) continue
    if (t.status === 1) {
      inProgress.push(t)
      continue
    }
    upcoming.push(t)
  }
  const sortByDue = (a, b) => (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31')
  const groups = []
  if (inProgress.length) groups.push({ label: '进行中', items: inProgress.sort(sortByDue) })
  if (upcoming.length) groups.push({ label: '待开始', items: upcoming.sort(sortByDue) })
  return groups
})

function isOverdue(t) {
  return !!t.dueDate && dayjs(t.dueDate).isBefore(dayjs().startOf('day'))
}

function dueLabel(t) {
  if (!t.dueDate) return '未设置'
  const d = dayjs(t.dueDate)
  const today = dayjs().startOf('day')
  if (d.isSame(today, 'day')) return '今天'
  if (d.isSame(today.add(1, 'day'), 'day')) return '明天'
  if (d.isBefore(today)) return '已逾期'
  return d.format('M月D日')
}

// ======== Data Loading ========
let refreshTimer = null

onMounted(async () => {
  try {
    const [b, p] = await Promise.all([meetingApi.myBookings(), projectApi.my()])
    myBookings.value = b || []
    projects.value = p || []
  } catch {}

  const taskPromises = (projects.value || []).map(async (proj) => {
    try {
      const tasks = await projectApi.tasks(proj.id)
      return (tasks || []).map((t) => ({ ...t, projectName: proj.projectName }))
    } catch {
      return []
    }
  })
  const taskResults = await Promise.all(taskPromises)
  allTasksMap.value = taskResults.flat()

  buildActivity()
  refreshTimer = setInterval(buildActivity, 60000)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})

async function buildActivity() {
  const acts = []
  for (const b of myBookings.value.slice(0, 3)) {
    acts.push({
      user: displayName.value,
      action: `预约了会议「${b.title}」`,
      time: formatAgo(b.startTime || b.createdAt),
      type: 'meeting'
    })
  }
  for (const proj of (projects.value || []).slice(0, 2)) {
    try {
      const d = await projectApi.discussions(proj.id)
      if (d && d.length) {
        for (const disc of d.slice(0, 2)) {
          acts.push({
            user: disc.userName || '用户',
            action: `在「${proj.projectName}」中发表了讨论`,
            time: formatAgo(disc.createdAt),
            type: 'discussion'
          })
        }
      }
    } catch {}
  }
  acts.sort((a, b) => parseTimeAgo(a.time) - parseTimeAgo(b.time))
  activities.value = acts.slice(0, 6)
}

// ======== Formatting ========
function formatTime(t) {
  return dayjs(t).format('HH:mm')
}

function formatAgo(t) {
  if (!t) return ''
  const diff = dayjs().diff(dayjs(t), 'minute')
  if (diff < 1) return '刚刚'
  if (diff < 60) return `${diff} 分钟前`
  const hours = Math.floor(diff / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  return `${days} 天前`
}

function parseTimeAgo(t) {
  if (!t) return 0
  if (t === '刚刚') return 0
  if (t.includes('分钟')) return parseInt(t) || 0
  if (t.includes('小时')) return (parseInt(t) || 0) * 60
  if (t.includes('天')) return (parseInt(t) || 0) * 1440
  return 0
}

function tlStatusClass(s) {
  if (s === 2) return 'live'
  if (s === 1) return 'upcoming'
  if (s === 3) return 'done'
  return 'cancelled'
}

function bookingStatusLabel(s) {
  return ['已取消', '即将开始', '进行中', '已结束'][s] || '未知'
}

function projectStatusClass(s) {
  if (s === 1) return 'active'
  if (s === 2) return 'done'
  if (s === 3) return 'delayed'
  return 'draft'
}

function projectStatusLabel(s) {
  return ['草稿', '进行中', '已完成', '已延期'][s] || '未知'
}
</script>

<style scoped>
/* ======== Hero ======== */
.hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;
}

.hero-main {
  min-width: 0;
}

.hero-greeting {
  font-size: 24px;
  font-weight: 700;
  color: var(--ink-950);
  margin: 0 0 6px;
  letter-spacing: -0.02em;
  line-height: 1.3;
}

.hero-date {
  font-size: 13px;
  color: var(--ink-500);
  margin: 0 0 6px;
}

.hero-status {
  font-size: 13px;
  color: var(--ink-500);
  margin: 0;
}

.hero-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  height: 34px;
  padding: 0 16px;
  border: none;
  border-radius: 8px;
  background: var(--brand-600);
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
  white-space: nowrap;
}

.btn-primary:hover {
  background: var(--brand-700);
}

.btn-primary:active {
  transform: translateY(1px);
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  height: 34px;
  padding: 0 16px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: #fff;
  color: var(--ink-700);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
  white-space: nowrap;
}

.btn-secondary:hover {
  border-color: var(--ink-400);
  background: var(--ink-50);
}

/* ======== Today's focus ======== */
.focus {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: linear-gradient(135deg, var(--brand-50), var(--brand-100));
  border-radius: 10px;
  margin-bottom: 20px;
}

.focus-label {
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  background: var(--brand-600);
  border-radius: 999px;
  padding: 3px 10px;
  flex-shrink: 0;
  letter-spacing: 0.02em;
}

.focus-time {
  font-size: 16px;
  font-weight: 700;
  color: var(--ink-950);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.focus-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--ink-950);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.focus-meta {
  font-size: 13px;
  color: var(--ink-500);
  flex-shrink: 0;
}

.focus-link {
  margin-left: auto;
  font-size: 13px;
  font-weight: 500;
  color: var(--brand-700);
  text-decoration: none;
  flex-shrink: 0;
  transition: transform var(--dur-fast) var(--ease-out);
}

.focus-link:hover {
  transform: translateX(2px);
}

.focus-empty {
  justify-content: center;
  background: var(--bg-card);
  box-shadow: var(--shadow-sm);
}

.focus-empty-text {
  font-size: 13px;
  color: var(--ink-400);
}

/* ======== Week overview stats ======== */
.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  background: var(--bg-card);
  border-radius: 10px;
  box-shadow: var(--shadow-sm);
  padding: 16px;
  transition: all var(--dur-fast) var(--ease-out);
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.stat-label {
  display: block;
  font-size: 12px;
  color: var(--ink-500);
  margin-bottom: 10px;
}

.stat-value-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 12px;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--ink-950);
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.stat-value-brand {
  color: var(--brand-600);
}

.stat-unit {
  font-size: 14px;
  color: var(--ink-500);
}

.stat-bar {
  height: 4px;
  border-radius: 2px;
  background: var(--ink-100);
  overflow: hidden;
}

.stat-bar-fill {
  height: 100%;
  border-radius: 2px;
  background: var(--brand-300);
  transition: width 0.4s var(--ease-out);
}

.stat-bar-brand {
  background: linear-gradient(90deg, var(--brand-400), var(--brand-600));
}

/* ======== Two columns ======== */
.dash-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.dash-col {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}

/* ======== Card base ======== */
.card {
  background: var(--bg-card);
  border-radius: 10px;
  box-shadow: var(--shadow-sm);
  padding: 18px 20px;
  transition: box-shadow var(--dur-fast) var(--ease-out);
}

.card:hover {
  box-shadow: var(--shadow-md);
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.card-title {
  font-size: 15px;
  font-weight: 650;
  color: var(--ink-950);
  letter-spacing: -0.01em;
  margin: 0;
}

.card-link {
  font-size: 13px;
  color: var(--brand-600);
  text-decoration: none;
  font-weight: 500;
}

.card-link:hover {
  text-decoration: underline;
}

.card-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 28px 0;
  color: var(--ink-400);
  font-size: 13px;
}

/* ======== Today's schedule timeline ======== */
.tl-item {
  display: flex;
  gap: 14px;
  padding-bottom: 14px;
}

.tl-item:last-child {
  padding-bottom: 0;
}

.tl-track {
  position: relative;
  display: flex;
  justify-content: center;
  width: 10px;
  flex-shrink: 0;
}

.tl-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--brand-400);
  margin-top: 5px;
  flex-shrink: 0;
}

.tl-dot.live {
  background: var(--success);
}

.tl-dot.done {
  background: var(--ink-300);
}

.tl-dot.cancelled {
  background: var(--ink-200);
}

.tl-item:not(:last-child) .tl-track::after {
  content: '';
  position: absolute;
  top: 20px;
  bottom: -2px;
  width: 1px;
  background: var(--border-subtle);
}

.tl-body {
  flex: 1;
  min-width: 0;
}

.tl-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.tl-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-900);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tl-meta {
  font-size: 12px;
  color: var(--ink-400);
  margin-top: 3px;
  font-variant-numeric: tabular-nums;
}

.tl-status {
  font-size: 11.5px;
  font-weight: 500;
  flex-shrink: 0;
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--ink-100);
  color: var(--ink-500);
}

.tl-status.upcoming {
  color: var(--brand-700);
  background: var(--brand-50);
}

.tl-status.live {
  color: var(--success);
  background: var(--success-bg);
}

.tl-status.done {
  color: var(--ink-400);
}

.tl-status.cancelled {
  color: var(--ink-300);
}

/* ======== Projects ======== */
.proj-item {
  padding: 14px 0;
  border-bottom: 1px solid var(--border-subtle);
}

.proj-item:first-child {
  padding-top: 0;
}

.proj-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.proj-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.proj-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-900);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.proj-status {
  font-size: 11.5px;
  font-weight: 500;
  flex-shrink: 0;
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--ink-100);
  color: var(--ink-500);
}

.proj-status.active {
  color: var(--success);
  background: var(--success-bg);
}

.proj-status.done {
  color: var(--brand-700);
  background: var(--brand-50);
}

.proj-status.delayed {
  color: var(--warning);
  background: var(--warning-bg);
}

.proj-bar-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.proj-bar {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: var(--ink-100);
  overflow: hidden;
}

.proj-bar-fill {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, var(--brand-400), var(--brand-600));
  transition: width 0.4s var(--ease-out);
}

.proj-progress {
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-600);
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.proj-meta {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 12px;
  color: var(--ink-400);
}

/* ======== Tasks ======== */
.task-scroll {
  max-height: 400px;
  overflow-y: auto;
  margin: 0 -6px;
  padding: 0 6px;
}

.task-group-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--ink-400);
  letter-spacing: 0.05em;
  padding: 10px 0 6px;
}

.task-group:first-child .task-group-label {
  padding-top: 0;
}

.task-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 8px;
  margin: 0 -10px;
  transition: background var(--dur-fast) var(--ease-out);
}

.task-item:hover {
  background: var(--ink-50);
}

.task-check {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1.5px solid var(--ink-300);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  color: #fff;
}

.task-check.progress {
  border-color: var(--brand-400);
  background: var(--brand-500);
}

.task-check.progress::after {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #fff;
}

.task-check.done {
  border-color: var(--brand-500);
  background: var(--brand-500);
}

.task-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.task-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--ink-800);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-title.overdue {
  color: var(--danger);
}

.task-title.done {
  text-decoration: line-through;
  color: var(--ink-400);
}

.task-meta {
  font-size: 12px;
  color: var(--ink-400);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-due {
  font-size: 12px;
  color: var(--ink-400);
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.task-due.overdue {
  color: var(--danger);
  font-weight: 500;
}

.more-btn {
  display: block;
  width: 100%;
  margin-top: 12px;
  padding: 8px 0;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: #fff;
  color: var(--ink-500);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
}

.more-btn:hover {
  border-color: var(--brand-400);
  color: var(--brand-600);
  background: var(--brand-50);
}

/* ======== Activity feed ======== */
.act-item {
  display: flex;
  gap: 12px;
  padding-bottom: 14px;
  position: relative;
}

.act-item:last-child {
  padding-bottom: 0;
}

.act-track {
  position: relative;
  display: flex;
  justify-content: center;
  width: 10px;
  flex-shrink: 0;
}

.act-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--ink-300);
  margin-top: 5px;
  flex-shrink: 0;
}

.act-dot.meeting {
  background: var(--brand-500);
}

.act-dot.project {
  background: var(--success);
}

.act-dot.discussion {
  background: var(--warning);
}

.act-item:not(:last-child) .act-track::after {
  content: '';
  position: absolute;
  top: 20px;
  bottom: -2px;
  width: 1px;
  background: var(--border-subtle);
}

.act-body {
  flex: 1;
  min-width: 0;
}

.act-text {
  font-size: 13px;
  color: var(--ink-600);
  line-height: 1.5;
}

.act-text strong {
  color: var(--ink-900);
  font-weight: 600;
}

.act-time {
  font-size: 12px;
  color: var(--ink-400);
  flex-shrink: 0;
  padding-top: 1px;
}

/* ======== Responsive ======== */
@media (max-width: 1100px) {
  .stats {
    grid-template-columns: repeat(2, 1fr);
  }
  .dash-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 800px) {
  .hero {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  .focus {
    flex-wrap: wrap;
    gap: 10px;
  }
  .focus-link {
    margin-left: 0;
  }
}
</style>
