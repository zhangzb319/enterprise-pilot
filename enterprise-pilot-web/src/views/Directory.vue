<template>
  <div class="directory">
    <!-- 顶部：标题 + 全宽搜索 -->
    <div ref="headerRef" class="dir-header">
      <div class="dir-title">
        <h1>员工通讯录</h1>
        <p>查找团队同事，快速获取联系方式</p>
      </div>
      <div class="dir-search">
        <div class="search-input-wrap">
          <component :is="Search" :size="17" :stroke-width="1.8" class="search-icon" />
          <input
            v-model="searchQuery"
            type="text"
            class="search-input"
            placeholder="搜索姓名、工号、职位、部门…"
          />
          <button v-if="searchQuery" class="search-clear" title="清空" @click="searchQuery = ''">
            <component :is="X" :size="15" :stroke-width="2" />
          </button>
        </div>
      </div>
    </div>

    <!-- 统计条 -->
    <div class="dir-stats">
      <div class="stat-card">
        <span class="stat-num">{{ totalCount }}</span>
        <span class="stat-label">在职员工</span>
      </div>
      <div class="stat-card">
        <span class="stat-num">{{ deptCount }}</span>
        <span class="stat-label">部门</span>
      </div>
      <div class="stat-card">
        <span class="stat-num">{{ monthNew }}</span>
        <span class="stat-label">本月新入职</span>
      </div>
    </div>

    <!-- 部门快速跳转导航 -->
    <nav class="dept-nav">
      <button class="pill active" @click="scrollToAll">全部</button>
      <button
        v-for="g in groups"
        :key="g.name"
        class="pill"
        @click="scrollToGroup(g.name)"
      >
        {{ g.name }}
      </button>
    </nav>

    <!-- 加载中：骨架屏 -->
    <div v-if="loading" class="skel-grid">
      <div v-for="i in 4" :key="i" class="skel-card">
        <div class="skel-top">
          <div class="skel skel-avatar"></div>
          <div class="skel-lines">
            <div class="skel skel-line w60"></div>
            <div class="skel skel-line w40"></div>
          </div>
        </div>
        <div class="skel skel-line"></div>
        <div class="skel skel-line"></div>
        <div class="skel skel-line w70"></div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="groups.length === 0" class="dir-empty">
      <component :is="Search" :size="30" :stroke-width="1.4" />
      <span class="dir-empty-title">
        {{ searchQuery ? '未找到匹配的同事' : '暂无员工信息' }}
      </span>
      <span v-if="searchQuery" class="dir-empty-sub">试试其他关键词</span>
    </div>

    <!-- 按部门分组 -->
    <div v-else class="dir-groups">
      <section
        v-for="g in groups"
        :id="`group-${g.name}`"
        :key="g.name"
        class="dir-group"
      >
        <div class="group-head" @click="toggleGroup(g.name)">
          <div class="group-name">
            <span class="group-dot" :class="{ unassigned: g.name === '未分组' }"></span>
            <span>{{ g.name }}</span>
          </div>
          <div class="group-head-right">
            <span class="group-count">{{ g.count }} 人</span>
            <span class="collapse-btn" title="收起/展开">
              <component
                :is="ChevronDown"
                :size="16"
                :stroke-width="2"
                :class="{ collapsed: isCollapsed(g.name) }"
              />
            </span>
          </div>
        </div>

        <div v-show="!isCollapsed(g.name)" class="member-grid">
          <div v-for="m in g.users" :key="m.id" class="member-card">
            <div class="member-top">
              <div class="avatar-ring">
                <div class="ring-avatar">
                  <img v-if="m.avatar" :src="m.avatar" alt="" />
                  <template v-else>{{ initials(m) }}</template>
                </div>
              </div>
              <div class="member-meta">
                <div class="member-name-line">
                  <span class="member-name">{{ m.realName || m.nickname || '—' }}</span>
                  <span v-if="m.deptName" class="member-dept">{{ m.deptName }}</span>
                </div>
                <div class="member-position">{{ m.position || '' }}</div>
              </div>
            </div>

            <div class="member-body">
              <div v-if="m.employeeNo" class="member-row">
                <span class="row-label">工号</span>
                <span class="row-value">{{ m.employeeNo }}</span>
              </div>
              <div v-if="m.phone" class="member-row">
                <span class="row-label">手机</span>
                <div class="row-main">
                  <component :is="Phone" :size="13" :stroke-width="1.8" class="row-ico" />
                  <span class="row-value">{{ m.phone }}</span>
                </div>
                <button class="copy-btn" title="复制手机号" @click="copy(m.phone)">
                  <component :is="Copy" :size="13" :stroke-width="1.8" />
                </button>
              </div>
              <div v-if="m.email" class="member-row">
                <span class="row-label">邮箱</span>
                <div class="row-main">
                  <component :is="Mail" :size="13" :stroke-width="1.8" class="row-ico" />
                  <span class="row-value email">{{ m.email }}</span>
                </div>
                <button class="copy-btn" title="复制邮箱" @click="copy(m.email)">
                  <component :is="Copy" :size="13" :stroke-width="1.8" />
                </button>
              </div>
              <div v-if="m.hireDate" class="member-row">
                <span class="row-label">入职</span>
                <span class="row-value">{{ formatDate(m.hireDate) }}</span>
              </div>
            </div>

            <div class="member-footer">
              <button class="chat-link" @click="startChat(m)">
                <component :is="MessageSquare" :size="14" :stroke-width="1.9" />
                发消息
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, X, ChevronDown, Phone, Mail, Copy, MessageSquare } from 'lucide-vue-next'
import { userApi } from '@/api'
import dayjs from 'dayjs'

const router = useRouter()

const headerRef = ref(null)
const loading = ref(true)
const allPeople = ref([])
const searchQuery = ref('')
const collapsed = ref(new Set())

const filteredPeople = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return allPeople.value
  return allPeople.value.filter((p) => {
    return [p.realName, p.nickname, p.employeeNo, p.position, p.deptName]
      .filter(Boolean)
      .some((v) => v.toLowerCase().includes(q))
  })
})

function buildGroups(people) {
  const map = new Map()
  people.forEach((p) => {
    const name = p.deptName || '未分组'
    if (!map.has(name)) map.set(name, [])
    map.get(name).push(p)
  })
  return Array.from(map.entries()).map(([name, users]) => ({ name, count: users.length, users }))
}

const groups = computed(() => buildGroups(filteredPeople.value))

const totalCount = computed(() => allPeople.value.length)
const deptCount = computed(() => buildGroups(allPeople.value).length)
const monthNew = computed(() =>
  allPeople.value.filter(
    (p) => p.hireDate && dayjs(p.hireDate).isSame(dayjs(), 'month')
  ).length
)

function isCollapsed(name) {
  return collapsed.value.has(name)
}

function toggleGroup(name) {
  const next = new Set(collapsed.value)
  if (next.has(name)) next.delete(name)
  else next.add(name)
  collapsed.value = next
}

function scrollToAll() {
  headerRef.value?.scrollIntoView({ behavior: 'smooth' })
}

function scrollToGroup(name) {
  document.getElementById(`group-${name}`)?.scrollIntoView({ behavior: 'smooth' })
}

function initials(m) {
  const name = (m.realName || m.nickname || '').trim()
  if (!name) return '?'
  return name.slice(0, 2).toUpperCase()
}

function formatDate(d) {
  if (!d) return '—'
  return dayjs(d).format('YYYY-MM')
}

function copy(text) {
  navigator.clipboard?.writeText(text).then(
    () => ElMessage.success('已复制到剪贴板'),
    () => ElMessage.error('复制失败')
  )
}

function startChat(m) {
  router.push({ path: '/messages', query: { to: m.id } })
}

onMounted(async () => {
  try {
    allPeople.value = (await userApi.directory()) || []
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.directory {
  background: var(--bg-page);
  max-width: 1200px;
  margin: 0 auto;
}

/* ======== 顶部 ======== */
.dir-header {
  margin-bottom: 20px;
}

.dir-title h1 {
  font-size: 26px;
  font-weight: 650;
  letter-spacing: -0.01em;
  color: var(--ink-900);
  margin: 0 0 6px;
}

.dir-title p {
  font-size: 14px;
  color: var(--ink-500);
  margin: 0;
}

.dir-search {
  margin-top: 18px;
}

.search-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  max-width: 100%;
  height: 42px;
  padding: 0 14px;
  background: #fff;
  border: 1px solid var(--border-default);
  border-radius: 10px;
  box-shadow: var(--shadow-sm);
  transition: box-shadow var(--dur-fast) var(--ease-out),
    border-color var(--dur-fast) var(--ease-out);
}

.search-input-wrap:focus-within {
  border-color: var(--brand-400);
  box-shadow: 0 0 0 3px var(--brand-50);
}

.search-icon {
  color: var(--ink-300);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13.5px;
  color: var(--ink-800);
  min-width: 0;
}

.search-input::placeholder {
  color: var(--ink-300);
}

.search-clear {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: var(--ink-100);
  color: var(--ink-500);
  cursor: pointer;
  flex-shrink: 0;
  transition: background var(--dur-fast) var(--ease-out),
    color var(--dur-fast) var(--ease-out);
}

.search-clear:hover {
  background: var(--ink-100);
  color: var(--ink-800);
}

/* ======== 统计条 ======== */
.dir-stats {
  display: flex;
  gap: 12px;
  margin: 18px 0 22px;
}

.stat-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: var(--brand-50);
  border-radius: 8px;
  padding: 12px 16px;
}

.stat-num {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.1;
  color: var(--brand-600);
  letter-spacing: -0.01em;
}

.stat-label {
  font-size: 12px;
  color: var(--ink-500);
}

/* ======== 部门快速跳转 ======== */
.dept-nav {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  gap: 8px;
  align-items: center;
  overflow-x: auto;
  padding: 10px 2px;
  margin-bottom: 6px;
  background: var(--bg-page);
}

.pill {
  border: none;
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--ink-600);
  background: var(--ink-100);
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background var(--dur-fast) var(--ease-out),
    color var(--dur-fast) var(--ease-out);
}

.pill:hover {
  background: var(--ink-100);
  color: var(--ink-800);
}

.pill.active {
  background: var(--brand-500);
  color: #fff;
}

/* ======== 骨架屏 ======== */
.skel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.skel-card {
  background: #fff;
  border: 1px solid var(--border-default);
  border-radius: 12px;
  padding: 18px;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skel-top {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}

.skel-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skel-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  flex-shrink: 0;
}

.skel-line {
  height: 12px;
  border-radius: 6px;
  background: var(--ink-100);
}

.skel-line.w60 {
  width: 60%;
}

.skel-line.w40 {
  width: 40%;
}

.skel-line.w70 {
  width: 70%;
}

/* ======== 空状态 ======== */
.dir-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 60px 20px;
  color: var(--ink-300);
  background: #fff;
  border: 1px dashed var(--border-default);
  border-radius: 12px;
}

.dir-empty-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--ink-800);
}

.dir-empty-sub {
  font-size: 13px;
  color: var(--ink-300);
}

/* ======== 分组 ======== */
.dir-groups {
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding-top: 12px;
}

.group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-subtle);
  cursor: pointer;
}

.group-name {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 16px;
  font-weight: 650;
  color: var(--ink-900);
}

.group-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--brand-500);
}

.group-dot.unassigned {
  background: var(--ink-300);
}

.group-head-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.group-count {
  font-size: 12.5px;
  color: var(--ink-300);
}

.collapse-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-300);
  transition: transform var(--dur-fast) var(--ease-out),
    color var(--dur-fast) var(--ease-out);
}

.collapse-btn:hover {
  color: var(--ink-600);
}

.collapse-btn :deep(svg) {
  transition: transform var(--dur-fast) var(--ease-out);
}

.collapse-btn svg.collapsed {
  transform: rotate(-90deg);
}

/* ======== 员工卡片 ======== */
.member-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-top: 14px;
}

.member-card {
  background: #fff;
  border: 1px solid var(--border-default);
  border-radius: 12px;
  padding: 16px 18px 14px;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  transition: border-color var(--dur-fast) var(--ease-out),
    box-shadow var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
}

.member-card:hover {
  border-color: var(--brand-300);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.member-top {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.member-meta {
  flex: 1;
  min-width: 0;
}

.member-name-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.member-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--ink-900);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member-dept {
  font-size: 11px;
  font-weight: 500;
  color: var(--brand-700);
  background: var(--brand-50);
  border-radius: 6px;
  padding: 2px 7px;
  flex-shrink: 0;
  max-width: 72px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member-position {
  font-size: 12px;
  color: var(--ink-500);
  margin-top: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member-body {
  display: flex;
  flex-direction: column;
  gap: 9px;
  border-top: 1px solid var(--border-subtle);
  padding-top: 12px;
}

.member-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12.5px;
}

.row-label {
  color: var(--ink-300);
  width: 32px;
  flex-shrink: 0;
}

.row-main {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.row-ico {
  color: var(--ink-300);
  flex-shrink: 0;
}

.row-value {
  color: var(--ink-800);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.copy-btn {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--ink-300);
  border-radius: 5px;
  cursor: pointer;
  flex-shrink: 0;
  transition: color var(--dur-fast) var(--ease-out),
    background var(--dur-fast) var(--ease-out);
}

.copy-btn:hover {
  background: var(--ink-100);
  color: var(--ink-600);
}

.member-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-subtle);
}

.chat-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--brand-600);
  background: var(--brand-50);
  border: none;
  border-radius: 8px;
  padding: 6px 12px;
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease-out),
    color var(--dur-fast) var(--ease-out);
}

.chat-link:hover {
  background: var(--brand-100);
  color: var(--brand-700);
}

/* ======== 头像 ======== */
.avatar-ring {
  --ring-angle: 200deg;
  width: 44px;
  height: 44px;
  padding: 1px;
  border-radius: 50%;
  background: conic-gradient(from var(--ring-angle), #14b8a6, #0ea5e9, #8b5cf6, #14b8a6);
  flex-shrink: 0;
}

.ring-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--brand-500), var(--brand-700));
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11.5px;
  font-weight: 500;
  overflow: hidden;
}

.ring-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* ======== 响应式 ======== */
@media (max-width: 640px) {
  .dir-stats {
    flex-direction: column;
  }
  .stat-card {
    flex-direction: row;
    align-items: baseline;
    justify-content: space-between;
  }
  .member-grid {
    grid-template-columns: 1fr;
  }
}
</style>