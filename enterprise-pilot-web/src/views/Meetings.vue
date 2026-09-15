<template>
  <div class="meetings">
    <!-- ======== Page header ======== -->
    <div class="page-header">
      <div>
        <h2>会议预约</h2>
        <div class="sub">选择会议室与时间，快速发起会议预约</div>
      </div>
      <el-button type="primary" plain :icon="OfficeBuilding" @click="openManage">
        会议室管理
      </el-button>
    </div>

    <div class="meetings-grid">
      <!-- ======== Left: new booking ======== -->
      <div class="panel booking-panel">
        <div class="panel-head">
          <h3 class="panel-title">
            <span class="title-icon"><el-icon><Edit /></el-icon></span>新建预约
          </h3>
        </div>

        <el-alert
          v-if="availableRooms.length === 0"
          type="warning"
          :closable="false"
          show-icon
          class="no-room-alert"
        >
          <template #title>
            暂无可用会议室，请先
            <el-link type="primary" :underline="false" @click="openManage">添加会议室</el-link>
          </template>
        </el-alert>

        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-position="top"
          size="large"
          @submit.prevent
        >
          <el-form-item label="会议室" prop="roomId" class="form-field">
            <el-select
              v-model="form.roomId"
              placeholder="请选择会议室"
              clearable
              style="width: 100%"
              filterable
            >
              <el-option
                v-for="room in availableRooms"
                :key="room.id"
                :label="`${room.roomName} · ${room.capacity}人 · ${room.equipment || '无设备'}`"
                :value="room.id"
              >
                <div class="room-option">
                  <div class="room-option-main">
                    <span class="room-option-name">{{ room.roomName }}</span>
                    <span class="room-option-meta">{{ room.capacity }}人</span>
                  </div>
                  <span class="room-option-equip">{{ room.equipment || '无设备' }}</span>
                </div>
              </el-option>
            </el-select>
          </el-form-item>

          <el-form-item label="会议主题" prop="title" class="form-field">
            <el-input v-model="form.title" placeholder="输入会议主题" clearable maxlength="50" />
            <div class="char-count">{{ form.title.length }}/50</div>
          </el-form-item>

          <div class="time-range">
            <el-form-item label="开始时间" prop="startTime" class="form-field time-item">
              <el-date-picker
                v-model="form.startTime"
                type="datetime"
                placeholder="选择开始时间"
                value-format="YYYY-MM-DD HH:mm:ss"
                :disabled-date="(t) => t.getTime() < Date.now() - 86400000"
                style="width: 100%"
              />
            </el-form-item>
            <span class="time-arrow">
              <el-icon :size="13"><Right /></el-icon>
            </span>
            <el-form-item label="结束时间" prop="endTime" class="form-field time-item">
              <el-date-picker
                v-model="form.endTime"
                type="datetime"
                placeholder="选择结束时间"
                value-format="YYYY-MM-DD HH:mm:ss"
                :disabled-date="(t) => t.getTime() < Date.now() - 86400000"
                style="width: 100%"
              />
            </el-form-item>
          </div>

          <div class="form-summary" v-if="form.roomId && form.startTime && form.endTime">
            <el-icon><InfoFilled /></el-icon>
            <span>
              预约
              <b>{{ selectedRoomName }}</b>，
              {{ formatSummary(form.startTime) }} 至 {{ formatSummary(form.endTime) }}
            </span>
          </div>

          <el-button
            type="primary"
            native-type="submit"
            class="submit-btn"
            :loading="submitting"
            @click="submitBooking"
          >
            <el-icon class="btn-icon"><Calendar /></el-icon>提交预约
          </el-button>
        </el-form>
      </div>

      <!-- ======== Right: my bookings ======== -->
      <div class="panel bookings-panel">
        <div class="panel-head">
          <h3 class="panel-title">
            <span class="title-icon"><el-icon><List /></el-icon></span>我的预约
            <span class="count-badge">{{ myBookings.length }}</span>
          </h3>
          <div class="segmented">
            <button
              v-for="f in filters"
              :key="f.value"
              class="segmented-item"
              :class="{ active: activeFilter === f.value }"
              @click="activeFilter = f.value"
            >{{ f.label }}</button>
          </div>
        </div>

        <div v-if="filteredBookings.length === 0" class="empty-state">
          <div class="empty-icon">
            <el-icon :size="26"><Calendar /></el-icon>
          </div>
          <div class="empty-title">{{ activeFilter === 'all' ? '暂无预约记录' : '该状态下暂无预约' }}</div>
          <div class="empty-desc">点击左侧表单开始预约</div>
        </div>

        <div v-else class="booking-list">
          <div
            v-for="b in filteredBookings"
            :key="b.id"
            class="booking-card"
            :class="`status-${b.status}`"
          >
            <div class="booking-date">
              <span class="date-day">{{ formatDay(b.startTime) }}</span>
              <span class="date-month">{{ formatMonth(b.startTime) }}</span>
            </div>
            <div class="booking-main">
              <div class="booking-hd">
                <span class="booking-title">{{ b.title }}</span>
                <el-tag :type="statusTag(b.status)" size="small" effect="light" round>
                  {{ statusLabel(b.status) }}
                </el-tag>
              </div>
              <div class="booking-detail">
                <div class="detail-item">
                  <el-icon size="13"><OfficeBuilding /></el-icon>
                  <span>{{ b.roomName }}</span>
                </div>
                <div class="detail-item">
                  <el-icon size="13"><Clock /></el-icon>
                  <span>{{ formatTime(b.startTime) }} — {{ formatTime(b.endTime) }}</span>
                </div>
              </div>
            </div>
            <div class="booking-actions">
              <button
                v-if="b.status === 1"
                class="cancel-btn"
                @click="cancelBooking(b.id)"
              >取消预约</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ======== Room management dialog ======== -->
    <el-dialog v-model="manageVisible" title="会议室管理" width="820px" destroy-on-close class="manage-dialog">
      <div class="manage-toolbar">
        <span class="manage-count">
          共 {{ allRooms.length }} 间会议室，
          {{ allRooms.filter(r => r.status === 1).length }} 间可用
        </span>
        <el-button type="primary" :icon="Plus" @click="openRoomForm()">新增会议室</el-button>
      </div>

      <div v-loading="roomsLoading" class="room-card-list">
        <div v-for="room in allRooms" :key="room.id" class="room-card">
          <div class="room-card-info">
            <div class="room-card-hd">
              <span class="room-card-name">{{ room.roomName }}</span>
              <span class="room-card-floor">{{ room.floor || '—' }}</span>
              <el-tag :type="room.status === 1 ? 'success' : 'info'" size="small" effect="light" round>
                {{ room.status === 1 ? '可用' : '已停用' }}
              </el-tag>
            </div>
            <div class="room-card-meta">
              <span class="room-card-capacity">
                <el-icon :size="13"><User /></el-icon>{{ room.capacity }} 人
              </span>
              <span class="room-card-equip">
                <el-icon :size="13"><Monitor /></el-icon>{{ room.equipment || '无设备' }}
              </span>
            </div>
          </div>
          <div class="room-card-actions">
            <el-button size="small" text type="primary" @click="openRoomForm(room)">编辑</el-button>
            <el-button
              v-if="room.status === 1"
              size="small"
              text
              type="danger"
              @click="disableRoom(room)"
            >停用</el-button>
          </div>
        </div>
        <div v-if="allRooms.length === 0" class="table-empty">暂无会议室，点击右上角新增</div>
      </div>
    </el-dialog>

    <!-- ======== Add / edit room dialog ======== -->
    <el-dialog
      v-model="roomFormVisible"
      :title="roomForm.id ? '编辑会议室' : '新增会议室'"
      width="480px"
      destroy-on-close
    >
      <el-form ref="roomFormRef" :model="roomForm" :rules="roomRules" label-position="top">
        <el-form-item label="会议室名称" prop="roomName">
          <el-input v-model="roomForm.roomName" placeholder="如：第一会议室" clearable />
        </el-form-item>
        <el-form-item label="楼层" prop="floor">
          <el-input v-model="roomForm.floor" placeholder="如：3F" clearable />
        </el-form-item>
        <el-form-item label="容纳人数" prop="capacity">
          <el-input-number v-model="roomForm.capacity" :min="1" :max="1000" style="width: 100%" />
        </el-form-item>
        <el-form-item label="设备" prop="equipment">
          <el-input v-model="roomForm.equipment" placeholder="如：投影仪、白板、视频会议" clearable />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="roomFormVisible = false">取消</el-button>
        <el-button type="primary" :loading="roomSaving" @click="saveRoom">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'
import { meetingApi } from '@/api'
import { OfficeBuilding, Plus, InfoFilled, Calendar, Edit, List, Clock, Right, User, Monitor } from '@element-plus/icons-vue'

const availableRooms = ref([])
const allRooms = ref([])
const myBookings = ref([])
const submitting = ref(false)
const formRef = ref(null)
const activeFilter = ref('all')

const filters = [
  { label: '全部', value: 'all' },
  { label: '待开始', value: '1' },
  { label: '进行中', value: '2' },
  { label: '已结束', value: '3' }
]

const manageVisible = ref(false)
const roomsLoading = ref(false)
const roomFormVisible = ref(false)
const roomSaving = ref(false)
const roomFormRef = ref(null)

const form = reactive({
  roomId: null,
  title: '',
  startTime: '',
  endTime: ''
})

const rules = {
  roomId: [{ required: true, message: '请选择会议室', trigger: 'change' }],
  title: [{ required: true, message: '请输入会议主题', trigger: 'blur' }],
  startTime: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
  endTime: [{ required: true, message: '请选择结束时间', trigger: 'change' }]
}

const roomForm = reactive({
  id: null,
  roomName: '',
  floor: '',
  capacity: 10,
  equipment: ''
})

const roomRules = {
  roomName: [{ required: true, message: '请输入会议室名称', trigger: 'blur' }],
  capacity: [{ required: true, message: '请输入容纳人数', trigger: 'blur' }]
}

const filteredBookings = computed(() => {
  if (activeFilter.value === 'all') return myBookings.value
  return myBookings.value.filter((b) => String(b.status) === activeFilter.value)
})

const selectedRoomName = computed(() => {
  const room = availableRooms.value.find((r) => r.id === form.roomId)
  return room?.roomName || ''
})

onMounted(loadData)

async function loadData() {
  try {
    const [roomList, bookings] = await Promise.all([meetingApi.rooms(), meetingApi.myBookings()])
    availableRooms.value = roomList || []
    myBookings.value = bookings || []
  } catch {}
}

async function loadAllRooms() {
  roomsLoading.value = true
  try {
    allRooms.value = (await meetingApi.allRooms()) || []
  } finally {
    roomsLoading.value = false
  }
}

async function openManage() {
  manageVisible.value = true
  await loadAllRooms()
}

function openRoomForm(row) {
  if (row) {
    roomForm.id = row.id
    roomForm.roomName = row.roomName
    roomForm.floor = row.floor || ''
    roomForm.capacity = row.capacity
    roomForm.equipment = row.equipment || ''
  } else {
    roomForm.id = null
    roomForm.roomName = ''
    roomForm.floor = ''
    roomForm.capacity = 10
    roomForm.equipment = ''
  }
  roomFormVisible.value = true
}

async function saveRoom() {
  await roomFormRef.value.validate()
  roomSaving.value = true
  try {
    const payload = {
      roomName: roomForm.roomName,
      floor: roomForm.floor || undefined,
      capacity: roomForm.capacity,
      equipment: roomForm.equipment || undefined
    }
    if (roomForm.id) {
      await meetingApi.updateRoom(roomForm.id, payload)
      ElMessage.success('会议室已更新')
    } else {
      await meetingApi.createRoom(payload)
      ElMessage.success('会议室已添加')
    }
    roomFormVisible.value = false
    await loadAllRooms()
    await loadData()
  } finally {
    roomSaving.value = false
  }
}

async function disableRoom(row) {
  try {
    await ElMessageBox.confirm(`确定停用会议室「${row.roomName}」吗？停用后不可预约。`, '停用确认', {
      type: 'warning',
      confirmButtonText: '停用',
      cancelButtonText: '取消',
      confirmButtonClass: 'el-button--danger'
    })
    await meetingApi.disableRoom(row.id)
    ElMessage.success('已停用')
    await loadAllRooms()
    await loadData()
  } catch {}
}

async function submitBooking() {
  await formRef.value.validate()
  submitting.value = true
  try {
    await meetingApi.createBooking({
      roomId: form.roomId,
      title: form.title,
      startTime: form.startTime,
      endTime: form.endTime
    })
    ElMessage.success('预约成功')
    formRef.value.resetFields()
    myBookings.value = (await meetingApi.myBookings()) || []
  } finally {
    submitting.value = false
  }
}

async function cancelBooking(id) {
  try {
    await ElMessageBox.confirm('确定取消该预约吗？', '取消预约', {
      type: 'warning',
      confirmButtonText: '确认取消',
      cancelButtonText: '再想想',
      confirmButtonClass: 'el-button--danger'
    })
    await meetingApi.cancelBooking(id)
    ElMessage.success('已取消')
    myBookings.value = (await meetingApi.myBookings()) || []
  } catch {}
}

function formatTime(t) {
  return dayjs(t).format('MM/DD HH:mm')
}

function formatSummary(t) {
  return dayjs(t).format('MM月DD日 HH:mm')
}

function formatDay(t) {
  return dayjs(t).format('DD')
}

function formatMonth(t) {
  return dayjs(t).format('MM月')
}

function statusTag(s) {
  if (s === 0) return 'info'
  if (s === 1) return 'warning'
  if (s === 2) return 'success'
  if (s === 3) return ''
  return 'info'
}

function statusLabel(s) {
  return ['已取消', '待开始', '进行中', '已结束'][s] || '未知'
}
</script>

<style scoped>
.meetings-grid {
  display: grid;
  grid-template-columns: 420px 1fr;
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
  margin-bottom: 16px;
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
  font-size: 12px;
  font-weight: 600;
  color: var(--brand-600);
  background: var(--brand-50);
  border-radius: 10px;
  padding: 1px 8px;
  margin-left: 4px;
}

/* ======== Segmented filter ======== */
.segmented {
  display: flex;
  gap: 2px;
  padding: 3px;
  background: var(--ink-100);
  border: 1px solid var(--border-default);
  border-radius: 999px;
}

.segmented-item {
  border: none;
  background: transparent;
  font-size: 12px;
  font-weight: 500;
  color: var(--ink-500);
  padding: 4px 12px;
  border-radius: 999px;
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
}

.segmented-item:hover {
  color: var(--ink-700);
}

.segmented-item.active {
  background: var(--brand-600);
  color: #fff;
}

/* ======== Form ======== */
.no-room-alert {
  margin-bottom: 16px;
}

.form-field {
  margin-bottom: 18px;
}

.meetings :deep(.el-form-item__label) {
  font-size: 13px;
  color: var(--ink-500);
  line-height: 1.4;
  padding-bottom: 6px;
}

.meetings :deep(.el-input__wrapper),
.meetings :deep(.el-select__wrapper),
.meetings :deep(.el-date-editor) {
  min-height: 40px;
  border-radius: 8px;
}

.meetings :deep(.el-input__wrapper.is-focus),
.meetings :deep(.el-select__wrapper.is-focus),
.meetings :deep(.el-date-editor.is-active) {
  box-shadow: 0 0 0 1px var(--brand-400) inset, 0 0 0 3px var(--brand-50) !important;
}

.room-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 8px;
}

.room-option-main {
  display: flex;
  align-items: center;
  gap: 8px;
}

.room-option-name {
  font-weight: 500;
}

.room-option-meta {
  font-size: 12px;
  color: var(--ink-400);
}

.room-option-equip {
  font-size: 11.5px;
  color: var(--brand-600);
  background: var(--brand-50);
  border-radius: 4px;
  padding: 1px 6px;
  white-space: nowrap;
}

.char-count {
  text-align: right;
  font-size: 12px;
  color: var(--ink-300);
  margin-top: 4px;
  line-height: 1;
}

.time-range {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.time-arrow {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 2;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  color: var(--ink-400);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  box-shadow: var(--shadow-xs);
}

.form-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--ink-600);
  background: var(--brand-50);
  border: 1px solid var(--brand-100);
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 16px;
}

.form-summary .el-icon {
  color: var(--brand-600);
  flex-shrink: 0;
}

.form-summary b {
  color: var(--brand-700);
}

.submit-btn {
  width: 100%;
  height: 44px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  transition: all var(--dur-fast) var(--ease-out);
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.btn-icon {
  margin-right: 4px;
}

/* ======== Booking list ======== */
.booking-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.booking-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 14px 14px 18px;
  border: 1px solid var(--border-default);
  border-radius: 10px;
  transition: all var(--dur-fast) var(--ease-out);
}

.booking-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 14px;
  bottom: 14px;
  width: 3px;
  border-radius: 2px;
}

.booking-card.status-1::before { background: var(--brand-500); }
.booking-card.status-2::before { background: var(--success); }
.booking-card.status-3::before { background: var(--ink-300); }

.booking-card:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow-sm);
}

.booking-date {
  width: 56px;
  height: 62px;
  border-radius: 10px;
  background: var(--ink-100);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.date-day {
  font-size: 28px;
  font-weight: 700;
  color: var(--ink-800);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.date-month {
  font-size: 12px;
  color: var(--ink-400);
  margin-top: 4px;
}

.booking-main {
  flex: 1;
  min-width: 0;
}

.booking-hd {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.booking-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--ink-900);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.booking-detail {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--ink-500);
}

.detail-item .el-icon {
  color: var(--ink-400);
}

.booking-actions {
  flex-shrink: 0;
}

.cancel-btn {
  border: none;
  background: transparent;
  font-size: 12.5px;
  color: var(--ink-400);
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 6px;
  transition: all var(--dur-fast) var(--ease-out);
}

.cancel-btn:hover {
  color: var(--danger);
  background: var(--danger-bg);
}

/* ======== Empty state ======== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 0;
  text-align: center;
}

.empty-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--ink-100);
  color: var(--ink-400);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.empty-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--ink-800);
  margin-bottom: 6px;
}

.empty-desc {
  font-size: 13px;
  color: var(--ink-400);
}

/* ======== Manage dialog ======== */
.manage-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.manage-count {
  font-size: 13px;
  color: var(--ink-500);
}

.room-card-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 120px;
}

.room-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--border-default);
  border-radius: 10px;
  transition: all var(--dur-fast) var(--ease-out);
}

.room-card:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow-sm);
}

.room-card-info {
  flex: 1;
  min-width: 0;
}

.room-card-hd {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.room-card-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-900);
}

.room-card-floor {
  font-size: 11.5px;
  color: var(--ink-400);
  background: var(--ink-100);
  border-radius: 4px;
  padding: 1px 6px;
}

.room-card-meta {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 12.5px;
  color: var(--ink-500);
}

.room-card-meta span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.room-card-meta .el-icon {
  color: var(--ink-400);
}

.room-card-actions {
  flex-shrink: 0;
}

.table-empty {
  padding: 24px 0;
  color: var(--ink-400);
  font-size: 13px;
  text-align: center;
}

/* ======== Responsive ======== */
@media (max-width: 900px) {
  .meetings-grid {
    grid-template-columns: 1fr;
  }
  .form-row-2 {
    grid-template-columns: 1fr;
  }
}
</style>
