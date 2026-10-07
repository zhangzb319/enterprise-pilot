<template>
  <div class="dir">
    <!-- ======== Toolbar ======== -->
    <div class="dir-hd">
      <div class="dir-hd-left">
        <div class="dir-brand">
          <Users :size="16" :stroke-width="1.8" />
        </div>
        <div class="dir-hd-titles">
          <span class="dir-name">员工通讯录</span>
          <span class="dir-sub">
            {{ totalCount }} 位同事 · {{ deptCount }} 个部门
            <template v-if="monthNew > 0"> · 本月新入职 {{ monthNew }} 人</template>
          </span>
        </div>
      </div>
      <div class="dir-hd-actions">
        <div class="dir-viewswitch">
          <button
            class="switch-btn"
            :class="{ active: view === 'grid' }"
            title="卡片视图"
            @click="view = 'grid'"
          >
            <LayoutGrid :size="14" :stroke-width="1.9" />
          </button>
          <button
            class="switch-btn"
            :class="{ active: view === 'list' }"
            title="紧凑列表"
            @click="view = 'list'"
          >
            <List :size="14" :stroke-width="1.9" />
          </button>
        </div>
        <button class="dir-hd-btn" title="展开全部" @click="expandAll">
          <ChevronsDownUp :size="13" :stroke-width="2" />
          展开全部
        </button>
        <button class="dir-hd-btn" title="收起全部" @click="collapseAll">
          <ChevronsUpDown :size="13" :stroke-width="2" />
          收起全部
        </button>
      </div>
    </div>

    <!-- ======== Workspace:单卡片 ======== -->
    <div class="dir-workspace">
      <!-- ---- 左:部门导航 ---- -->
      <aside class="dir-nav">
        <div class="nav-search">
          <Search :size="15" :stroke-width="1.8" class="nav-search-ico" />
          <input
            v-model="query"
            type="text"
            class="nav-search-input"
            placeholder="搜索姓名、工号、职位"
          />
          <button v-if="query" class="nav-search-clear" title="清空" @click="query = ''">
            <X :size="13" :stroke-width="2.2" />
          </button>
        </div>

        <div class="nav-list">
          <button
            class="nav-item"
            :class="{ active: activeDept === '' }"
            @click="jumpTo('')"
          >
            <span class="nav-item-name">全部同事</span>
            <span class="nav-count">{{ totalCount }}</span>
          </button>

          <button
            v-for="g in groups"
            :key="g.name"
            class="nav-item"
            :class="{ active: activeDept === g.name }"
            @click="jumpTo(g.name)"
          >
            <span class="nav-item-name">{{ g.name }}</span>
            <span class="nav-count">{{ g.count }}</span>
          </button>
        </div>

        <div v-if="!loading && groups.length === 0" class="nav-empty">
          {{ query ? '没有匹配的同事' : '暂无部门数据' }}
        </div>
      </aside>

      <!-- ---- 右:人员区 ---- -->
      <section class="dir-main">
        <!-- 骨架屏 -->
        <div v-if="loading" class="skel-grid">
          <div v-for="i in 6" :key="i" class="skel-card">
            <div class="skel-top">
              <div class="skel skel-avatar"></div>
              <div class="skel-lines">
                <div class="skel skel-line w60"></div>
                <div class="skel skel-line w40"></div>
              </div>
            </div>
            <div class="skel skel-line w80"></div>
            <div class="skel skel-line w70"></div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else-if="groups.length === 0" class="dir-empty">
          <div class="dir-empty-mark">
            <SearchX :size="24" :stroke-width="1.6" />
          </div>
          <span class="dir-empty-title">
            {{ query ? '没有找到匹配的同事' : '暂无员工信息' }}
          </span>
          <span class="dir-empty-sub">
            {{ query ? '换个关键词试试,支持姓名、工号、职位、部门' : '请先在后台维护员工资料' }}
          </span>
          <button v-if="query" class="dir-empty-btn" @click="query = ''">清空搜索</button>
        </div>

        <!-- 分组列表 -->
        <div v-else class="dir-groups">
          <section
            v-for="g in groups"
            :id="groupAnchor(g.name)"
            :key="g.name"
            class="dir-group"
          >
            <div class="group-head" @click="toggleGroup(g.name)">
              <div class="group-name">
                <ChevronDown
                  :size="15"
                  :stroke-width="2.2"
                  class="group-caret"
                  :class="{ collapsed: isCollapsed(g.name) }"
                />
                <span>{{ g.name }}</span>
              </div>
              <span class="group-count">{{ g.count }} 人</span>
            </div>

            <div v-show="!isCollapsed(g.name)">
              <!-- 卡片视图 -->
              <div v-if="view === 'grid'" class="member-grid">
                <article v-for="m in g.users" :key="m.id" class="member-card">
                  <div class="member-top">
                    <UserAvatar :name="memberName(m)" :src="m.avatar" :size="44" />
                    <div class="member-meta">
                      <div class="member-name">{{ memberName(m) }}</div>
                      <div class="member-position">{{ m.position || '—' }}</div>
                    </div>
                  </div>

                  <dl class="member-rows">
                    <div v-if="m.employeeNo" class="member-row">
                      <dt>工号</dt>
                      <dd>{{ m.employeeNo }}</dd>
                    </div>
                    <div v-if="m.phone" class="member-row">
                      <dt>手机</dt>
                      <dd>
                        <span class="row-text">{{ m.phone }}</span>
                        <button class="row-copy" title="复制手机号" @click="copy(m.phone)">
                          <Copy :size="12" :stroke-width="1.9" />
                        </button>
                      </dd>
                    </div>
                    <div v-if="m.email" class="member-row">
                      <dt>邮箱</dt>
                      <dd>
                        <span class="row-text">{{ m.email }}</span>
                        <button class="row-copy" title="复制邮箱" @click="copy(m.email)">
                          <Copy :size="12" :stroke-width="1.9" />
                        </button>
                      </dd>
                    </div>
                    <div v-if="m.hireDate" class="member-row">
                      <dt>入职</dt>
                      <dd>{{ formatMonth(m.hireDate) }}</dd>
                    </div>
                  </dl>

                  <div class="member-foot">
                    <button class="member-action" @click="startChat(m)">
                      <MessageSquare :size="13" :stroke-width="1.9" />
                      发消息
                    </button>
                  </div>
                </article>
              </div>

              <!-- 紧凑列表视图 -->
              <ul v-else class="member-list">
                <li v-for="m in g.users" :key="m.id" class="member-line">
                  <UserAvatar :name="memberName(m)" :src="m.avatar" :size="30" />
                  <span class="line-name">{{ memberName(m) }}</span>
                  <span class="line-position">{{ m.position || '—' }}</span>
                  <span class="line-no">{{ m.employeeNo || '—' }}</span>
                  <span class="line-contact">
                    <template v-if="m.phone">
                      <Phone :size="12" :stroke-width="1.8" class="line-ico" />
                      {{ m.phone }}
                    </template>
                    <template v-else-if="m.email">
                      <Mail :size="12" :stroke-width="1.8" class="line-ico" />
                      {{ m.email }}
                    </template>
                    <template v-else>—</template>
                  </span>
                  <button
                    v-if="m.phone || m.email"
                    class="row-copy"
                    title="复制联系方式"
                    @click="copy(m.phone || m.email)"
                  >
                    <Copy :size="12" :stroke-width="1.9" />
                  </button>
                  <button class="member-action compact" @click="startChat(m)">
                    <MessageSquare :size="13" :stroke-width="1.9" />
                    发消息
                  </button>
                </li>
              </ul>
            </div>
          </section>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Users, Search, SearchX, X, ChevronDown, ChevronsDownUp, ChevronsUpDown,
  Phone, Mail, Copy, MessageSquare, LayoutGrid, List
} from 'lucide-vue-next'
import UserAvatar from '@/components/UserAvatar.vue'
import { userApi } from '@/api'
import dayjs from 'dayjs'

const router = useRouter()

const loading = ref(true)
const allPeople = ref([])
const query = ref('')
const view = ref('grid')
const collapsed = ref(new Set())
const activeDept = ref('')

/* ---------- derived ---------- */
const filteredPeople = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return allPeople.value
  return allPeople.value.filter((p) =>
    [p.realName, p.nickname, p.employeeNo, p.position, p.deptName]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q))
  )
})

function buildGroups(people) {
  const map = new Map()
  people.forEach((p) => {
    const name = p.deptName || '未分组'
    if (!map.has(name)) map.set(name, [])
    map.get(name).push(p)
  })
  return Array.from(map.entries()).map(([name, users]) => ({
    name,
    count: users.length,
    users
  }))
}

const groups = computed(() => buildGroups(filteredPeople.value))
const totalCount = computed(() => allPeople.value.length)
const deptCount = computed(() => buildGroups(allPeople.value).length)
const monthNew = computed(() =>
  allPeople.value.filter((p) => p.hireDate && dayjs(p.hireDate).isSame(dayjs(), 'month')).length
)

/* ---------- 折叠 ---------- */
function isCollapsed(name) {
  return collapsed.value.has(name)
}

function toggleGroup(name) {
  const next = new Set(collapsed.value)
  if (next.has(name)) next.delete(name)
  else next.add(name)
  collapsed.value = next
}

function expandAll() {
  collapsed.value = new Set()
}

function collapseAll() {
  collapsed.value = new Set(groups.value.map((g) => g.name))
}

/* ---------- 导航 ---------- */
// 部门名可能含空格/特殊字符,锚点 id 统一转义
function groupAnchor(name) {
  return 'dept-' + encodeURIComponent(name)
}

function jumpTo(name) {
  activeDept.value = name
  if (name === '') {
    document.querySelector('.dir-main')?.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  // 目标部门可能处于折叠状态
  if (isCollapsed(name)) toggleGroup(name)
  nextTick(() => {
    document.getElementById(groupAnchor(name))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

/* ---------- 展示 ---------- */
function memberName(m) {
  return m.realName || m.nickname || '—'
}

function formatMonth(d) {
  return d ? dayjs(d).format('YYYY-MM') : '—'
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
  } catch {
    ElMessage.error('通讯录加载失败')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
/* ======== Root ======== */
.dir {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 520px;
}

/* ======== Toolbar ======== */
.dir-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 4px 2px 14px;
  flex-shrink: 0;
}

.dir-hd-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.dir-brand {
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

.dir-hd-titles {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.dir-name {
  font-size: 15px;
  font-weight: 650;
  letter-spacing: -0.01em;
  color: var(--ink-950);
  line-height: 1.35;
}

.dir-sub {
  font-size: 11.5px;
  color: var(--ink-400);
  line-height: 1.3;
}

.dir-hd-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.dir-viewswitch {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  margin-right: 4px;
  border-radius: 8px;
  background: var(--ink-100);
}

.switch-btn {
  width: 26px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--ink-500);
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
}

.switch-btn:hover {
  color: var(--ink-800);
}

.switch-btn.active {
  background: #fff;
  color: var(--brand-700);
  box-shadow: var(--shadow-xs);
}

.dir-hd-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: none;
  background: transparent;
  color: var(--ink-500);
  font-size: 12.5px;
  font-family: inherit;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 8px;
  transition: all var(--dur-fast) var(--ease-out);
}

.dir-hd-btn:hover {
  color: var(--ink-800);
  background: var(--ink-100);
}

/* ======== Workspace:单卡片 ======== */
.dir-workspace {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 240px 1fr;
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: 12px;
  box-shadow: var(--shadow-xs);
  overflow: hidden;
}

/* ======== 左:部门导航 ======== */
.dir-nav {
  display: flex;
  flex-direction: column;
  min-width: 0;
  border-right: 1px solid var(--border-subtle);
  background: #fdfdfc;
  padding: 12px 0 10px;
}

.nav-search {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 12px 8px;
  padding: 0 10px;
  height: 34px;
  border-radius: 8px;
  background: var(--ink-50);
  border: 1px solid transparent;
  transition: all var(--dur-fast) var(--ease-out);
  flex-shrink: 0;
}

.nav-search:focus-within {
  background: #fff;
  border-color: var(--brand-400);
  box-shadow: 0 0 0 3px var(--brand-50);
}

.nav-search-ico {
  color: var(--ink-400);
  flex-shrink: 0;
}

.nav-search-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: var(--ink-800);
}

.nav-search-input::placeholder {
  color: var(--ink-400);
}

.nav-search-clear {
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

.nav-search-clear:hover {
  background: var(--ink-150);
  color: var(--ink-700);
}

.nav-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px;
}

.nav-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  margin-bottom: 1px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--ink-700);
  font-family: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
}

.nav-item:hover {
  background: var(--ink-50);
  color: var(--ink-900);
}

.nav-item.active {
  background: var(--brand-50);
  color: var(--brand-800);
  font-weight: 600;
}

.nav-item-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-count {
  font-size: 11px;
  color: var(--ink-400);
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.nav-item.active .nav-count {
  color: var(--brand-600);
}

.nav-empty {
  padding: 24px 16px;
  text-align: center;
  font-size: 12.5px;
  color: var(--ink-400);
}

/* ======== 右:人员区 ======== */
.dir-main {
  overflow-y: auto;
  padding: 18px 20px 26px;
  min-width: 0;
  scroll-behavior: smooth;
}

/* ---- 骨架屏 ---- */
.skel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(252px, 1fr));
  gap: 12px;
}

.skel-card {
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  padding: 15px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skel-top {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-bottom: 2px;
}

.skel-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.skel {
  background: linear-gradient(90deg, var(--ink-100) 25%, var(--ink-150) 50%, var(--ink-100) 75%);
  background-size: 200% 100%;
  animation: skel-shimmer 1.4s infinite;
  border-radius: 5px;
}

.skel-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  flex-shrink: 0;
}

.skel-line {
  height: 10px;
}

.skel-line.w40 { width: 40%; }
.skel-line.w60 { width: 60%; }
.skel-line.w70 { width: 70%; }
.skel-line.w80 { width: 80%; }

@keyframes skel-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ---- 空状态 ---- */
.dir-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 340px;
  text-align: center;
  padding: 40px 20px;
}

.dir-empty-mark {
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

.dir-empty-title {
  font-size: 14px;
  font-weight: 650;
  color: var(--ink-700);
}

.dir-empty-sub {
  font-size: 12.5px;
  color: var(--ink-400);
  max-width: 320px;
  line-height: 1.6;
}

.dir-empty-btn {
  margin-top: 10px;
  border: 1px solid var(--border-default);
  background: #fff;
  color: var(--ink-700);
  font-size: 12.5px;
  font-weight: 500;
  font-family: inherit;
  padding: 6px 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
}

.dir-empty-btn:hover {
  border-color: var(--brand-300);
  color: var(--brand-700);
  background: var(--brand-50);
}

/* ---- 分组 ---- */
.dir-groups {
  display: flex;
  flex-direction: column;
  gap: 26px;
}

.dir-group {
  scroll-margin-top: 8px;
}

.group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 2px 9px;
  border-bottom: 1px solid var(--border-subtle);
  cursor: pointer;
  user-select: none;
}

.group-name {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 14px;
  font-weight: 650;
  color: var(--ink-900);
  letter-spacing: -0.01em;
}

.group-caret {
  color: var(--ink-400);
  transition: transform var(--dur-fast) var(--ease-out);
  flex-shrink: 0;
}

.group-caret.collapsed {
  transform: rotate(-90deg);
}

.group-count {
  font-size: 12px;
  color: var(--ink-400);
  font-variant-numeric: tabular-nums;
}

/* ---- 卡片视图 ---- */
.member-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(252px, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.member-card {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-default);
  border-radius: 10px;
  padding: 15px 16px 12px;
  background: var(--bg-card);
  transition: border-color var(--dur-fast) var(--ease-out),
    box-shadow var(--dur-fast) var(--ease-out);
}

.member-card:hover {
  border-color: var(--brand-300);
  box-shadow: var(--shadow-sm);
}

.member-top {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-bottom: 12px;
}

.member-meta {
  flex: 1;
  min-width: 0;
}

.member-name {
  font-size: 14px;
  font-weight: 650;
  color: var(--ink-950);
  letter-spacing: -0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member-position {
  font-size: 11.5px;
  color: var(--ink-500);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member-rows {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin: 0;
  padding-top: 11px;
  border-top: 1px solid var(--border-subtle);
}

.member-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12.5px;
  min-width: 0;
}

.member-row dt {
  width: 30px;
  flex-shrink: 0;
  color: var(--ink-400);
}

.member-row dd {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  min-width: 0;
  flex: 1;
  color: var(--ink-800);
}

.row-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-copy {
  width: 21px;
  height: 21px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--ink-300);
  border-radius: 5px;
  cursor: pointer;
  flex-shrink: 0;
  transition: all var(--dur-fast) var(--ease-out);
}

.row-copy:hover {
  background: var(--ink-100);
  color: var(--ink-700);
}

.member-foot {
  display: flex;
  justify-content: flex-end;
  margin-top: 11px;
  padding-top: 11px;
  border-top: 1px solid var(--border-subtle);
}

.member-action {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: none;
  border-radius: 7px;
  padding: 5px 11px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  color: var(--brand-700);
  background: var(--brand-50);
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
}

.member-action:hover {
  background: var(--brand-100);
  color: var(--brand-800);
}

/* ---- 紧凑列表视图 ---- */
.member-list {
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
  border: 1px solid var(--border-default);
  border-radius: 10px;
  overflow: hidden;
}

.member-line {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--border-subtle);
  font-size: 12.5px;
  transition: background var(--dur-fast) var(--ease-out);
}

.member-line:last-child {
  border-bottom: none;
}

.member-line:hover {
  background: var(--ink-50);
}

.line-name {
  width: 88px;
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-900);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.line-position {
  width: 108px;
  flex-shrink: 0;
  color: var(--ink-500);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.line-no {
  width: 78px;
  flex-shrink: 0;
  color: var(--ink-500);
  font-variant-numeric: tabular-nums;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.line-contact {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--ink-700);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.line-ico {
  color: var(--ink-300);
  flex-shrink: 0;
}

.member-action.compact {
  padding: 4px 10px;
  flex-shrink: 0;
}

/* ======== 响应式 ======== */
@media (max-width: 1000px) {
  .member-grid {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }
  .line-position,
  .line-no {
    display: none;
  }
}

@media (max-width: 860px) {
  .dir-workspace {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(120px, 30%) 1fr;
  }
  .dir-nav {
    border-right: none;
    border-bottom: 1px solid var(--border-subtle);
  }
  .nav-list {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    overflow-y: hidden;
    padding-bottom: 4px;
  }
  .nav-item {
    width: auto;
    flex-shrink: 0;
    margin-bottom: 0;
  }
  .nav-item-name {
    white-space: nowrap;
  }
  .dir-main {
    padding: 14px 16px 22px;
  }
}

@media (max-width: 620px) {
  .member-grid {
    grid-template-columns: 1fr;
  }
  .dir-hd-btn span {
    display: none;
  }
  .member-line {
    flex-wrap: wrap;
  }
}
</style>