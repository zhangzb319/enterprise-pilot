<template>
  <div class="profile">
    <div class="page-header">
      <div>
        <h2>个人主页</h2>
        <div class="sub">查看与维护你的个人信息</div>
      </div>
    </div>

    <div class="profile-grid">
      <!-- ======== Left: identity card ======== -->
      <div class="panel identity-panel">
        <div class="identity-cover"></div>
        <div class="identity-head">
          <div class="avatar-wrap">
            <div class="avatar-ring big-ring">
              <div class="ring-avatar">
                <img v-if="profile.avatar" :src="profile.avatar" alt="" />
                <template v-else>{{ profileInitials }}</template>
              </div>
            </div>
            <span class="avatar-badge" :class="statusClass">
              {{ statusLabel }}
            </span>
            <button class="avatar-edit" title="编辑头像">
              <el-icon :size="12"><EditPen /></el-icon>
            </button>
          </div>
          <div class="identity-name">{{ profile.realName || profile.username }}</div>
          <div class="identity-position">{{ positionText }}</div>
          <div class="identity-role">
            <el-tag v-if="profile.roleName" :type="roleTag" effect="light" round>{{ profile.roleName }}</el-tag>
          </div>
        </div>

        <div class="identity-list">
          <div class="identity-item">
            <span class="id-label"><el-icon :size="14"><User /></el-icon>登录账号</span>
            <span class="id-value">{{ profile.username || '—' }}</span>
          </div>
          <div class="identity-item">
            <span class="id-label"><el-icon :size="14"><Postcard /></el-icon>工号</span>
            <span class="id-value">{{ profile.employeeNo || '—' }}</span>
          </div>
          <div class="identity-item">
            <span class="id-label"><el-icon :size="14"><OfficeBuilding /></el-icon>所属部门</span>
            <span class="id-value">{{ profile.deptName || '—' }}</span>
          </div>
          <div class="identity-item">
            <span class="id-label"><el-icon :size="14"><Briefcase /></el-icon>岗位</span>
            <span class="id-value">{{ profile.position || '—' }}</span>
          </div>
          <div class="identity-item">
            <span class="id-label"><el-icon :size="14"><Calendar /></el-icon>入职日期</span>
            <span class="id-value">{{ profile.hireDate ? dayjs(profile.hireDate).format('YYYY年MM月DD日') : '—' }}</span>
          </div>
        </div>
      </div>

      <!-- ======== Right: edit + password ======== -->
      <div class="right-col">
        <!-- Edit basic info -->
        <div class="panel">
          <div class="panel-head">
            <h3 class="panel-title">
              <span class="title-icon"><el-icon><EditPen /></el-icon></span>基本资料
            </h3>
          </div>
          <el-form ref="profileFormRef" :model="profileForm" :rules="profileRules" label-position="top" :hide-required-asterisk="true">
            <div class="form-row-2">
              <el-form-item prop="realName">
                <template #label>真实姓名 <span class="req-mark">(必填)</span></template>
                <el-input v-model="profileForm.realName" placeholder="请输入真实姓名" clearable />
              </el-form-item>
              <el-form-item label="昵称" prop="nickname">
                <el-input v-model="profileForm.nickname" placeholder="选填" clearable />
              </el-form-item>
            </div>
            <div class="form-row-2">
              <el-form-item label="性别" prop="gender">
                <el-select v-model="profileForm.gender" placeholder="选择性别" style="width: 100%">
                  <el-option label="保密" :value="0" />
                  <el-option label="男" :value="1" />
                  <el-option label="女" :value="2" />
                </el-select>
              </el-form-item>
              <el-form-item label="岗位" prop="position">
                <el-input v-model="profileForm.position" placeholder="选填" clearable />
              </el-form-item>
            </div>
            <div class="form-row-2">
              <el-form-item label="手机号" prop="phone">
                <el-input v-model="profileForm.phone" placeholder="选填" clearable />
              </el-form-item>
              <el-form-item label="邮箱" prop="email">
                <el-input v-model="profileForm.email" placeholder="选填" clearable />
              </el-form-item>
            </div>
            <div class="form-actions">
              <el-button type="primary" :loading="savingProfile" @click="saveProfile">
                <el-icon v-if="!savingProfile" :size="14"><Check /></el-icon>
                <span>保存修改</span>
              </el-button>
            </div>
          </el-form>
        </div>

        <!-- Change password -->
        <div class="panel pwd-panel">
          <div class="panel-head">
            <h3 class="panel-title">
              <span class="title-icon amber"><el-icon><Lock /></el-icon></span>修改密码
            </h3>
          </div>
          <el-form ref="pwdFormRef" :model="pwdForm" :rules="pwdRules" label-position="top" :hide-required-asterisk="true">
            <el-form-item prop="oldPassword">
              <template #label>原密码 <span class="req-mark">(必填)</span></template>
              <el-input v-model="pwdForm.oldPassword" type="password" placeholder="请输入原密码" show-password clearable />
            </el-form-item>
            <div class="form-row-2">
              <el-form-item prop="newPassword">
                <template #label>新密码 <span class="req-mark">(必填)</span></template>
                <el-input v-model="pwdForm.newPassword" type="password" placeholder="至少 6 位" show-password clearable />
                <div v-if="pwdStrength.score" class="pwd-strength">
                  <div class="pwd-strength-bar">
                    <span
                      v-for="i in 4"
                      :key="i"
                      class="pwd-strength-seg"
                      :class="{ active: i <= pwdStrength.score }"
                      :style="i <= pwdStrength.score ? { background: pwdStrength.color } : {}"
                    ></span>
                  </div>
                  <span class="pwd-strength-label" :style="{ color: pwdStrength.color }">{{ pwdStrength.label }}</span>
                </div>
              </el-form-item>
              <el-form-item prop="confirmPassword">
                <template #label>确认新密码 <span class="req-mark">(必填)</span></template>
                <el-input v-model="pwdForm.confirmPassword" type="password" placeholder="再次输入新密码" show-password clearable />
              </el-form-item>
            </div>
            <div class="form-actions">
              <el-button type="primary" :loading="savingPwd" @click="savePassword">更新密码</el-button>
            </div>
          </el-form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'
import { userApi } from '@/api'
import { useUserStore } from '@/stores/user'
import { User, Postcard, OfficeBuilding, Briefcase, Calendar, EditPen, Lock, Check } from '@element-plus/icons-vue'

const userStore = useUserStore()
const profile = ref({})

const profileFormRef = ref(null)
const profileForm = reactive({
  realName: '',
  nickname: '',
  gender: 0,
  phone: '',
  email: '',
  position: ''
})

const pwdFormRef = ref(null)
const pwdForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const savingProfile = ref(false)
const savingPwd = ref(false)

const profileRules = {
  realName: [{ required: true, message: '请输入真实姓名', trigger: 'blur' }]
}

const pwdRules = {
  oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '新密码长度不能少于 6 位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== pwdForm.newPassword) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

const statusLabel = computed(() => {
  const s = profile.value.status
  if (s === 0) return '待入职'
  if (s === 1) return '在职'
  if (s === 2) return '离职'
  if (s === 3) return '禁用'
  return '未知'
})

const statusClass = computed(() => {
  const s = profile.value.status
  if (s === 1) return 'on'
  return 'off'
})

const roleTag = computed(() => {
  const r = profile.value.roleName || ''
  if (r.includes('管理员')) return 'danger'
  if (r.includes('经理')) return 'warning'
  return 'primary'
})

const positionText = computed(() => {
  const parts = []
  if (profile.value.position) parts.push(profile.value.position)
  if (profile.value.deptName) parts.push(profile.value.deptName)
  return parts.join(' · ') || '—'
})

const pwdStrength = computed(() => {
  const p = pwdForm.newPassword || ''
  if (!p) return { score: 0, label: '', color: '' }
  let score = 0
  if (p.length >= 6) score = 1
  if (p.length >= 8) score = 2
  if (p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p)) score = 3
  if (p.length >= 10 && /[A-Za-z]/.test(p) && /\d/.test(p) && /[^A-Za-z0-9]/.test(p)) score = 4
  const labels = ['', '弱', '中', '强', '很强']
  const colors = ['', 'var(--danger)', 'var(--warning)', 'var(--brand-600)', 'var(--success)']
  return { score, label: labels[score], color: colors[score] }
})

const profileInitials = computed(() => {
  const name = (profile.value.realName || profile.value.username || '').trim()
  if (!name) return 'U'
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
})

onMounted(loadProfile)

async function loadProfile() {
  try {
    profile.value = (await userApi.profile()) || {}
    profileForm.realName = profile.value.realName || ''
    profileForm.nickname = profile.value.nickname || ''
    profileForm.gender = profile.value.gender ?? 0
    profileForm.phone = profile.value.phone || ''
    profileForm.email = profile.value.email || ''
    profileForm.position = profile.value.position || ''
    userStore.userInfo = profile.value
  } catch {}
}

async function saveProfile() {
  await profileFormRef.value.validate()
  savingProfile.value = true
  try {
    await userApi.updateProfile({
      realName: profileForm.realName,
      nickname: profileForm.nickname || undefined,
      gender: profileForm.gender,
      phone: profileForm.phone || undefined,
      email: profileForm.email || undefined,
      position: profileForm.position || undefined
    })
    ElMessage.success('资料已更新')
    await loadProfile()
  } finally {
    savingProfile.value = false
  }
}

async function savePassword() {
  await pwdFormRef.value.validate()
  savingPwd.value = true
  try {
    await userApi.changePassword({
      oldPassword: pwdForm.oldPassword,
      newPassword: pwdForm.newPassword
    })
    ElMessage.success('密码已更新，请重新登录')
    pwdForm.oldPassword = ''
    pwdForm.newPassword = ''
    pwdForm.confirmPassword = ''
    userStore.logout()
    window.location.href = '/login'
  } finally {
    savingPwd.value = false
  }
}
</script>

<style scoped>
.profile {
  background: var(--bg-page);
}

.profile-grid {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 20px;
  align-items: start;
}

/* ======== Card base ======== */
.panel {
  background: var(--bg-card);
  border-radius: 10px;
  box-shadow: var(--shadow-sm);
  padding: 20px;
}

/* ======== Identity card ======== */
.identity-panel {
  position: sticky;
  top: 20px;
  overflow: hidden;
}

.identity-cover {
  height: 60px;
  margin: -20px -20px 0;
  border-radius: 10px 10px 0 0;
  background: linear-gradient(135deg, var(--brand-400), var(--brand-700));
}

.identity-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 0 18px;
  margin-bottom: 14px;
}

.avatar-wrap {
  position: relative;
  margin-top: -38px;
  margin-bottom: 14px;
}

.avatar-ring.big-ring {
  width: 76px;
  height: 76px;
  border: 3px solid #fff;
  box-shadow: var(--shadow-sm);
}

.big-ring .ring-avatar {
  font-size: 24px;
}

.avatar-badge {
  position: absolute;
  left: -4px;
  bottom: -2px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  border-radius: 10px;
  padding: 1px 8px;
  border: 2px solid #fff;
}

.avatar-badge.on {
  background: var(--success);
}

.avatar-badge.off {
  background: var(--ink-400);
}

.avatar-edit {
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fff;
  border: 1px solid var(--border-default);
  color: var(--ink-500);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: var(--shadow-xs);
  opacity: 0;
  transition: all var(--dur-fast) var(--ease-out);
}

.avatar-wrap:hover .avatar-edit {
  opacity: 1;
}

.avatar-edit:hover {
  color: var(--brand-600);
  border-color: var(--brand-400);
}

.identity-name {
  font-size: 18px;
  font-weight: 700;
  color: var(--ink-950);
  letter-spacing: -0.01em;
}

.identity-position {
  margin-top: 4px;
  font-size: 13px;
  color: var(--ink-500);
}

.identity-role {
  margin-top: 8px;
}

.identity-list {
  display: flex;
  flex-direction: column;
}

.identity-item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 13px;
  transition: background var(--dur-fast) var(--ease-out);
}

.identity-item:hover {
  background: var(--ink-50);
}

.identity-item:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 0;
  height: 1px;
  background: var(--ink-100);
}

.identity-list::after {
  content: '';
  display: block;
  height: 1px;
  background: var(--ink-100);
  margin-top: 14px;
}

.id-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--ink-500);
}

.id-value {
  font-weight: 600;
  color: var(--ink-800);
  max-width: 60%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ======== Right column ======== */
.right-col {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.panel-head {
  display: flex;
  align-items: center;
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

.title-icon.amber {
  background: var(--warning-bg);
  color: var(--warning);
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;
}

/* ======== Form refinements ======== */
.profile :deep(.el-form-item__label) {
  font-size: 13px;
  color: var(--ink-500);
}

.req-mark {
  font-size: 12px;
  color: var(--ink-400);
  font-weight: 400;
}

.profile :deep(.el-input__wrapper),
.profile :deep(.el-select__wrapper) {
  border-radius: 8px;
  min-height: 38px;
}

.profile :deep(.el-input__wrapper.is-focus),
.profile :deep(.el-select__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--brand-400) inset, 0 0 0 3px var(--brand-50) !important;
}

/* ======== Password panel ======== */
.pwd-panel {
  background: var(--warning-bg);
}

.pwd-strength {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}

.pwd-strength-bar {
  display: flex;
  gap: 4px;
  flex: 1;
  max-width: 160px;
}

.pwd-strength-seg {
  height: 4px;
  flex: 1;
  border-radius: 2px;
  background: var(--ink-100);
  transition: background var(--dur-fast) var(--ease-out);
}

.pwd-strength-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--ink-400);
}

/* ======== Responsive ======== */
@media (max-width: 900px) {
  .profile-grid {
    grid-template-columns: 1fr;
  }
  .identity-panel {
    position: static;
  }
}
</style>
