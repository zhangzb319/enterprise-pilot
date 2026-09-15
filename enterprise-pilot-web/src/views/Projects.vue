<template>
  <div class="projects">
    <div class="page-header">
      <div>
        <h2>项目看板</h2>
        <div class="sub">管理项目、任务与团队讨论</div>
      </div>
      <el-button type="primary" :icon="Plus" @click="openCreate">新建项目</el-button>
    </div>

    <div class="kanban-grid">
      <!-- ======== Left: project list ======== -->
      <div class="panel project-list-panel">
        <div class="panel-head">
          <h3 class="panel-title">
            <span class="title-icon"><el-icon><FolderOpened /></el-icon></span>我的项目
            <span class="count-badge">{{ projects.length }}</span>
          </h3>
        </div>

        <div v-if="projects.length === 0" class="empty-state">
          <div class="empty-icon"><el-icon :size="24"><FolderOpened /></el-icon></div>
          <div class="empty-title">暂无项目</div>
          <div class="empty-desc">点击右上角新建项目</div>
        </div>

        <div v-else class="project-list">
          <div
            v-for="p in projects"
            :key="p.id"
            class="project-card"
            :class="{ active: selected?.id === p.id }"
            @click="selectProject(p)"
          >
            <div class="project-card-hd">
              <span class="project-card-name">{{ p.projectName }}</span>
              <el-tag :type="statusTag(p.status)" size="small" effect="light" round>
                {{ statusLabel(p.status) }}
              </el-tag>
            </div>
            <div class="project-card-desc">{{ p.description || '暂无描述' }}</div>
            <div class="project-card-progress">
              <div class="progress-track">
                <div class="progress-fill" :style="{ width: (p.progress || 0) + '%' }"></div>
              </div>
              <span class="progress-num">{{ p.progress || 0 }}%</span>
            </div>
            <div class="project-card-ft">
              <span class="ft-owner">
                <span class="ft-avatar">{{ (p.ownerName || 'U').charAt(0) }}</span>
                {{ p.ownerName }}
              </span>
              <span class="ft-dot">·</span>
              <span v-if="p.endDate" class="ft-date">
                <el-icon :size="12"><Calendar /></el-icon>{{ p.endDate }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- ======== Right: project detail ======== -->
      <div class="panel detail-panel">
        <template v-if="selected">
          <div class="detail-head">
            <div class="detail-head-info">
              <div class="detail-title-row">
                <h3 class="detail-title">{{ selected.projectName }}</h3>
                <el-tag :type="statusTag(selected.status)" size="small" effect="light" round>
                  {{ statusLabel(selected.status) }}
                </el-tag>
              </div>
              <div class="detail-sub">
                <span v-if="selected.ownerName">
                  <el-icon :size="13"><User /></el-icon>负责人 {{ selected.ownerName }}
                </span>
                <span v-if="selected.endDate">
                  <el-icon :size="13"><Calendar /></el-icon>截止 {{ selected.endDate }}
                </span>
              </div>
            </div>
            <div class="progress-ring">
              <el-progress
                type="circle"
                :percentage="selected.progress || 0"
                :width="72"
                :stroke-width="6"
                :color="progressGradient"
                :show-text="false"
              />
              <span class="progress-ring-num">{{ selected.progress || 0 }}%</span>
            </div>
          </div>

          <el-tabs v-model="activeTab" class="detail-tabs">
            <!-- ===== Tasks ===== -->
            <el-tab-pane name="tasks">
              <template #label>
                <span class="tab-label"><el-icon><List /></el-icon>任务<span v-if="tasks.length" class="tab-count">{{ tasks.length }}</span></span>
              </template>

              <div class="task-input">
                <div class="task-input-wrap">
                  <el-icon class="task-input-icon" :size="15"><Plus /></el-icon>
                  <el-input
                    v-model="taskForm.title"
                    placeholder="输入任务标题，回车添加"
                    clearable
                    @keyup.enter="addTask"
                  />
                </div>
                <el-button type="primary" class="task-add-btn" @click="addTask">
                  <el-icon :size="15"><Plus /></el-icon>
                  <span class="task-add-text">添加</span>
                </el-button>
              </div>

              <div v-if="tasks.length === 0" class="empty-state compact">
                <div class="empty-icon small"><el-icon :size="20"><Check /></el-icon></div>
                <div class="empty-title">暂无任务</div>
                <div class="empty-desc">在上方输入框添加第一个任务</div>
              </div>

              <div v-else class="task-list">
                <div v-for="t in tasks" :key="t.id" class="task-row" :class="{ done: t.status === 2 }">
                  <div class="task-check" :class="{ done: t.status === 2 }">
                    <el-icon v-if="t.status === 2" :size="13"><Check /></el-icon>
                  </div>
                  <div class="task-main">
                    <span class="task-title" :class="{ done: t.status === 2 }">{{ t.title }}</span>
                    <span v-if="t.description" class="task-desc">{{ t.description }}</span>
                  </div>
                  <div class="task-meta">
                    <el-tag :type="taskStatusTag(t.status)" size="small" effect="light" round>
                      {{ taskStatusLabel(t.status) }}
                    </el-tag>
                    <span v-if="t.assigneeName" class="task-assignee">
                      <el-avatar :size="24" class="mini-avatar">{{ t.assigneeName.charAt(0) }}</el-avatar>
                    </span>
                    <span v-if="t.dueDate" class="task-due">{{ t.dueDate }}</span>
                  </div>
                </div>
              </div>
            </el-tab-pane>

            <!-- ===== Discussions ===== -->
            <el-tab-pane name="discussions">
              <template #label>
                <span class="tab-label"><el-icon><ChatLineRound /></el-icon>讨论<span v-if="discussions.length" class="tab-count">{{ discussions.length }}</span></span>
              </template>

              <div class="discuss-input">
                <el-input
                  v-model="discussionForm.content"
                  type="textarea"
                  :rows="3"
                  placeholder="发起讨论或提问…"
                  resize="none"
                />
                <div class="discuss-input-ft">
                  <span class="discuss-hint">支持回复与追问</span>
                  <el-button type="primary" :icon="Promotion" @click="addDiscussion">发表</el-button>
                </div>
              </div>

              <div v-if="discussions.length === 0" class="empty-state compact">
                <div class="empty-icon small"><el-icon :size="20"><ChatLineRound /></el-icon></div>
                <div class="empty-title">暂无讨论</div>
                <div class="empty-desc">发起第一条讨论，让团队对齐目标</div>
              </div>

              <div v-else class="discuss-list">
                <div v-for="d in discussions" :key="d.id" class="discuss-item">
                  <div class="discuss-hd">
                    <el-avatar :size="28" class="mini-avatar">{{ (d.userName || 'U').charAt(0) }}</el-avatar>
                    <span class="discuss-author">{{ d.userName }}</span>
                    <span class="discuss-time">{{ formatTime(d.createdAt) }}</span>
                  </div>
                  <div class="discuss-content">{{ d.content }}</div>
                  <div v-if="d.children && d.children.length" class="discuss-replies">
                    <div v-for="c in d.children" :key="c.id" class="discuss-reply">
                      <span class="reply-avatar">{{ (c.userName || 'U').charAt(0) }}</span>
                      <div class="reply-body">
                        <div class="reply-hd">
                          <span class="discuss-author">{{ c.userName }}</span>
                          <span class="discuss-time">{{ formatTime(c.createdAt) }}</span>
                        </div>
                        <div class="reply-text">{{ c.content }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </template>

        <div v-else class="empty-state select-hint">
          <div class="empty-icon"><el-icon :size="30"><FolderOpened /></el-icon></div>
          <div class="empty-title">选择一个项目</div>
          <div class="empty-desc">从左侧列表选择项目，查看任务与讨论</div>
        </div>
      </div>
    </div>

    <!-- ======== Create project dialog ======== -->
    <el-dialog v-model="createVisible" title="新建项目" width="480px" destroy-on-close>
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-position="top">
        <el-form-item label="项目名称" prop="projectName">
          <el-input v-model="createForm.projectName" placeholder="输入项目名称" clearable />
        </el-form-item>
        <el-form-item label="项目描述" prop="description">
          <el-input
            v-model="createForm.description"
            type="textarea"
            :rows="3"
            maxlength="200"
            show-word-limit
            placeholder="项目目标与说明"
            resize="none"
          />
        </el-form-item>
        <el-form-item label="起止日期">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="confirmCreate">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'
import { projectApi } from '@/api'
import { Plus, Promotion, User, Calendar, List, ChatLineRound, Check, FolderOpened } from '@element-plus/icons-vue'

const projects = ref([])
const selected = ref(null)
const tasks = ref([])
const discussions = ref([])
const activeTab = ref('tasks')

const createVisible = ref(false)
const creating = ref(false)
const createFormRef = ref(null)
const dateRange = ref([])
const createForm = reactive({ projectName: '', description: '' })
const createRules = {
  projectName: [{ required: true, message: '请输入项目名称', trigger: 'blur' }]
}

const taskForm = reactive({ title: '' })
const discussionForm = reactive({ content: '' })

const progressGradient = [
  { color: '#2dd4bf', percentage: 20 },
  { color: '#0f766e', percentage: 100 }
]

onMounted(loadProjects)

async function loadProjects() {
  try {
    projects.value = (await projectApi.my()) || []
    if (projects.value.length && !selected.value) {
      selectProject(projects.value[0])
    }
  } catch {}
}

async function selectProject(p) {
  selected.value = p
  try {
    const [t, d] = await Promise.all([projectApi.tasks(p.id), projectApi.discussions(p.id)])
    tasks.value = t || []
    discussions.value = d || []
  } catch {}
}

function openCreate() {
  createForm.projectName = ''
  createForm.description = ''
  dateRange.value = []
  createVisible.value = true
}

async function confirmCreate() {
  await createFormRef.value.validate()
  creating.value = true
  try {
    await projectApi.create({
      projectName: createForm.projectName,
      description: createForm.description || undefined,
      startDate: dateRange.value?.[0] || undefined,
      endDate: dateRange.value?.[1] || undefined
    })
    ElMessage.success('项目创建成功')
    createVisible.value = false
    await loadProjects()
  } finally {
    creating.value = false
  }
}

async function addTask() {
  if (!taskForm.title.trim()) return
  try {
    await projectApi.createTask(selected.value.id, { title: taskForm.title.trim() })
    taskForm.title = ''
    tasks.value = (await projectApi.tasks(selected.value.id)) || []
    ElMessage.success('任务已添加')
  } catch {}
}

async function addDiscussion() {
  if (!discussionForm.content.trim()) return
  try {
    await projectApi.createDiscussion(selected.value.id, { content: discussionForm.content.trim(), parentId: 0 })
    discussionForm.content = ''
    discussions.value = (await projectApi.discussions(selected.value.id)) || []
    ElMessage.success('已发表')
  } catch {}
}

function formatTime(t) {
  return dayjs(t).format('MM/DD HH:mm')
}

function statusTag(s) {
  if (s === 0) return 'info'
  if (s === 1) return 'warning'
  if (s === 2) return 'success'
  if (s === 3) return 'danger'
  return 'info'
}

function statusLabel(s) {
  return ['草稿', '进行中', '已完成', '已延期'][s] || '未知'
}

function taskStatusTag(s) {
  if (s === 0) return 'info'
  if (s === 1) return 'warning'
  if (s === 2) return 'success'
  return 'info'
}

function taskStatusLabel(s) {
  return ['待开始', '进行中', '已完成'][s] || '未知'
}
</script>

<style scoped>
.kanban-grid {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 20px;
  align-items: start;
}

/* ======== Panel base ======== */
.panel {
  background: var(--bg-card);
  border-radius: 10px;
  box-shadow: var(--shadow-sm);
  padding: 20px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.panel-title {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
}

.title-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--brand-50);
  color: var(--brand-600);
  display: flex;
  align-items: center;
  justify-content: center;
}

.count-badge {
  font-size: 11px;
  font-weight: 600;
  background: var(--ink-100);
  color: var(--ink-500);
  border-radius: 10px;
  padding: 1px 8px;
}

/* ======== Project list ======== */
.project-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.project-card {
  position: relative;
  border: 1px solid var(--border-default);
  border-radius: 10px;
  padding: 14px 16px;
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
  background: var(--bg-card);
}

.project-card:hover {
  box-shadow: var(--shadow-sm);
  border-color: var(--border-strong);
}

.project-card.active {
  background: var(--brand-50);
  border-color: var(--border-default);
}

.project-card.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 12px;
  bottom: 12px;
  width: 3px;
  border-radius: 0 2px 2px 0;
  background: var(--brand-500);
}

.project-card-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.project-card-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--ink-900);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-card-desc {
  font-size: 13px;
  color: var(--ink-500);
  margin-bottom: 10px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.5;
}

.project-card-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.progress-track {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: var(--ink-100);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(90deg, var(--brand-400), var(--brand-600));
  transition: width var(--dur-base) var(--ease-out);
}

.progress-num {
  font-size: 12px;
  font-weight: 700;
  color: var(--ink-800);
  min-width: 34px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.project-card-ft {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--ink-500);
}

.ft-owner {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ft-avatar {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--brand-100);
  color: var(--brand-700);
  font-size: 10px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ft-dot {
  color: var(--ink-300);
}

.ft-date {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--ink-400);
}

/* ======== Detail panel ======== */
.detail-panel {
  min-height: 480px;
}

.detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  background: var(--ink-50);
  border-radius: 10px;
  margin-bottom: 16px;
}

.detail-head-info {
  flex: 1;
  min-width: 0;
}

.detail-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.detail-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--ink-950);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-sub {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 13px;
  color: var(--ink-500);
}

.detail-sub span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.detail-sub .el-icon {
  color: var(--ink-400);
}

.progress-ring {
  position: relative;
  width: 72px;
  height: 72px;
  flex-shrink: 0;
}

.progress-ring :deep(.el-progress-circle__track) {
  stroke: var(--ink-100) !important;
}

.progress-ring-num {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  color: var(--ink-800);
  font-variant-numeric: tabular-nums;
}

/* ======== Tabs ======== */
.detail-tabs :deep(.el-tabs__header) {
  margin-bottom: 16px;
}

.detail-tabs :deep(.el-tabs__nav-wrap::after) {
  height: 1px;
  background: var(--border-subtle);
}

.detail-tabs :deep(.el-tabs__active-bar) {
  height: 2px;
  background: var(--brand-600);
}

.detail-tabs :deep(.el-tabs__item) {
  font-size: 14px;
  color: var(--ink-500);
  transition: color var(--dur-fast) var(--ease-out);
}

.detail-tabs :deep(.el-tabs__item:hover) {
  color: var(--ink-700);
}

.detail-tabs :deep(.el-tabs__item.is-active) {
  color: var(--brand-700);
  font-weight: 600;
}

.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.tab-count {
  font-size: 11px;
  font-weight: 600;
  background: var(--ink-100);
  color: var(--ink-500);
  border-radius: 999px;
  padding: 0 8px;
  line-height: 18px;
}

/* ======== Tasks ======== */
.task-input {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}

.task-input-wrap {
  position: relative;
  flex: 1;
}

.task-input-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--ink-400);
  z-index: 1;
  pointer-events: none;
}

.task-input-wrap :deep(.el-input__wrapper) {
  padding-left: 34px;
  border-radius: 8px;
  background: var(--bg-card);
  box-shadow: 0 0 0 1px var(--border-default) inset;
}

.task-input-wrap :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--brand-400) inset, 0 0 0 3px var(--brand-50) !important;
}

.task-add-btn {
  flex-shrink: 0;
  width: 40px;
  padding: 0;
  border-radius: 8px;
  transition: all var(--dur-fast) var(--ease-out);
}

.task-add-btn .task-add-text {
  max-width: 0;
  overflow: hidden;
  opacity: 0;
  white-space: nowrap;
  transition: all var(--dur-fast) var(--ease-out);
}

.task-add-btn:hover .task-add-text {
  max-width: 60px;
  opacity: 1;
  margin-left: 4px;
}

.task-list {
  display: flex;
  flex-direction: column;
}

.task-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 8px;
  border-bottom: 1px solid var(--border-subtle);
  transition: background var(--dur-fast) var(--ease-out);
  border-radius: 8px;
}

.task-row:hover {
  background: var(--ink-50);
}

.task-row.done {
  opacity: 0.6;
}

.task-check {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1.5px solid var(--ink-300);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #fff;
  transition: all var(--dur-fast) var(--ease-out);
}

.task-check.done {
  background: var(--brand-600);
  border-color: var(--brand-600);
}

.task-main {
  flex: 1;
  min-width: 0;
}

.task-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--ink-800);
  display: block;
}

.task-title.done {
  text-decoration: line-through;
  color: var(--ink-400);
}

.task-desc {
  font-size: 12px;
  color: var(--ink-500);
  display: block;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.task-assignee,
.task-due {
  font-size: 12px;
  color: var(--ink-400);
  display: inline-flex;
  align-items: center;
}

.mini-avatar {
  background: var(--brand-100);
  color: var(--brand-700);
  font-weight: 600;
  font-size: 11px;
}

/* ======== Discussions ======== */
.discuss-input {
  margin-bottom: 16px;
}

.discuss-input-ft {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}

.discuss-hint {
  font-size: 12px;
  color: var(--ink-400);
}

.discuss-list {
  display: flex;
  flex-direction: column;
}

.discuss-item {
  padding: 14px 0;
  border-bottom: 1px solid var(--border-subtle);
}

.discuss-item:last-child {
  border-bottom: none;
}

.discuss-hd {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.discuss-author {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-800);
}

.discuss-time {
  font-size: 12px;
  color: var(--ink-400);
}

.discuss-content {
  font-size: 13.5px;
  color: var(--ink-700);
  line-height: 1.7;
  padding-left: 36px;
}

.discuss-replies {
  margin-top: 10px;
  padding-left: 36px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.discuss-reply {
  display: flex;
  gap: 10px;
  background: var(--ink-50);
  border-radius: 8px;
  padding: 10px 12px;
}

.reply-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--brand-100);
  color: var(--brand-700);
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.reply-body {
  flex: 1;
  min-width: 0;
}

.reply-hd {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
}

.reply-text {
  font-size: 13px;
  color: var(--ink-700);
  line-height: 1.6;
}

/* ======== Empty states ======== */
.empty-state.compact {
  padding: 36px 24px;
}

.empty-icon.small {
  width: 44px;
  height: 44px;
}

.select-hint {
  padding: 80px 0;
}

/* ======== Responsive ======== */
@media (max-width: 900px) {
  .kanban-grid {
    grid-template-columns: 1fr;
  }
  .project-list {
    flex-direction: row;
    overflow-x: auto;
    padding-bottom: 4px;
  }
  .project-card {
    min-width: 260px;
    flex-shrink: 0;
  }
}
</style>
