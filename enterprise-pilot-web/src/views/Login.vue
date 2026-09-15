<template>
  <div class="login-page">
    <!-- ======== Left brand showcase ======== -->
    <div class="login-brand">
      <div class="brand-grid"></div>

      <div class="brand-inner">
        <div class="brand-mark">
          <svg width="44" height="44" viewBox="0 0 32 32" fill="none">
            <rect x="1" y="1" width="30" height="30" rx="8" fill="#292524" stroke="#44403c" stroke-width="1"/>
            <path d="M9 11.5h14M9 16h9M9 20.5h12" stroke="#2dd4bf" stroke-width="2.2" stroke-linecap="round"/>
            <circle cx="23" cy="20.5" r="2.2" fill="#2dd4bf"/>
          </svg>
        </div>
        <h1>Enterprise Pilot</h1>
        <p class="tagline">企业智能协作平台</p>

        <div class="feature-list">
          <div class="feature-item">
            <span class="feature-icon"><el-icon :size="17"><Calendar /></el-icon></span>
            <div>
              <div class="feature-title">会议室预约</div>
              <div class="feature-desc">一键预约 · 冲突检测 · 资源管理</div>
            </div>
          </div>
          <div class="feature-item">
            <span class="feature-icon"><el-icon :size="17"><FolderOpened /></el-icon></span>
            <div>
              <div class="feature-title">项目协作</div>
              <div class="feature-desc">看板任务 · 团队讨论 · 进度跟踪</div>
            </div>
          </div>
          <div class="feature-item">
            <span class="feature-icon"><el-icon :size="17"><MagicStick /></el-icon></span>
            <div>
              <div class="feature-title">AI 智能助手</div>
              <div class="feature-desc">知识库问答 · 日程查询 · 智能总结</div>
            </div>
          </div>
        </div>
      </div>

      <div class="brand-foot">© 2026 Enterprise Pilot · 企业智能协作平台</div>
    </div>

    <!-- ======== Right form ======== -->
    <div class="login-form-wrap">
      <div class="login-form">
        <div class="card-head">
          <h2>{{ mode === 'login' ? '欢迎回来' : '创建账号' }}</h2>
          <p class="login-sub">{{ mode === 'login' ? '登录以继续使用企业协作平台' : '注册一个账号，开始团队协作' }}</p>
        </div>

        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-position="top"
          size="large"
          @submit.prevent
        >
          <el-form-item label="用户名" prop="username">
            <el-input v-model="form.username" placeholder="请输入用户名" clearable />
          </el-form-item>

          <el-form-item label="密码" prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="请输入密码"
              show-password
              @keyup.enter="submit"
            />
          </el-form-item>

          <template v-if="mode === 'register'">
            <el-form-item label="真实姓名" prop="realName">
              <el-input v-model="form.realName" placeholder="请输入真实姓名" clearable />
            </el-form-item>
            <div class="form-row-2">
              <el-form-item label="手机号" prop="phone">
                <el-input v-model="form.phone" placeholder="选填" clearable />
              </el-form-item>
              <el-form-item label="邮箱" prop="email">
                <el-input v-model="form.email" placeholder="选填" clearable />
              </el-form-item>
            </div>
          </template>

          <el-button
            type="primary"
            class="submit-btn"
            size="large"
            :loading="loading"
            @click="submit"
          >
            {{ mode === 'login' ? '登 录' : '注 册' }}
          </el-button>
        </el-form>

        <div class="switch-line">
          <span>{{ mode === 'login' ? '还没有账号？' : '已有账号？' }}</span>
          <el-link type="primary" :underline="false" @click="switchMode">
            {{ mode === 'login' ? '立即注册' : '去登录' }}
          </el-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Calendar, FolderOpened, MagicStick } from '@element-plus/icons-vue'
import { userApi } from '@/api'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const mode = ref('login')
const loading = ref(false)
const formRef = ref(null)

const form = reactive({
  username: '',
  password: '',
  realName: '',
  phone: '',
  email: ''
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于 6 位', trigger: 'blur' }
  ],
  realName: [{ required: true, message: '请输入真实姓名', trigger: 'blur' }]
}

function switchMode() {
  mode.value = mode.value === 'login' ? 'register' : 'login'
  formRef.value?.clearValidate()
}

async function submit() {
  await formRef.value.validate()
  loading.value = true
  try {
    if (mode.value === 'login') {
      await userStore.login({ username: form.username, password: form.password })
      ElMessage.success('登录成功')
      router.push(route.query.redirect || '/dashboard')
    } else {
      await userApi.register({
        username: form.username,
        password: form.password,
        realName: form.realName,
        phone: form.phone || undefined,
        email: form.email || undefined
      })
      ElMessage.success('注册成功，正在登录')
      await userStore.login({ username: form.username, password: form.password })
      router.push('/dashboard')
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  display: flex;
  min-height: 100vh;
  background: var(--bg-page);
}

/* ======== Left brand panel — deep charcoal, restrained ======== */
.login-brand {
  flex: 1;
  background: var(--ink-950);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 56px 48px;
  position: relative;
  overflow: hidden;
}

.brand-grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse at 50% 42%, black 15%, transparent 72%);
}

.brand-inner {
  position: relative;
  z-index: 1;
  max-width: 420px;
  color: #fff;
}

.brand-mark {
  margin-bottom: 34px;
  animation: float-in 0.5s var(--ease-out) both;
}

.brand-inner h1 {
  font-size: 30px;
  font-weight: 700;
  margin: 0 0 10px;
  letter-spacing: -0.02em;
  color: #fff;
  animation: float-in 0.5s var(--ease-out) 0.05s both;
}

.tagline {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.55);
  margin: 0 0 46px;
  animation: float-in 0.5s var(--ease-out) 0.1s both;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 22px;
  animation: float-in 0.5s var(--ease-out) 0.15s both;
}

.feature-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.feature-icon {
  width: 20px;
  height: 20px;
  color: var(--brand-400);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}

.feature-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.92);
  margin-bottom: 3px;
}

.feature-desc {
  font-size: 12.5px;
  color: rgba(255, 255, 255, 0.45);
}

.brand-foot {
  position: absolute;
  bottom: 28px;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.32);
  z-index: 1;
}

@keyframes float-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ======== Right form — cardless, typography-driven ======== */
.login-form-wrap {
  width: 520px;
  min-width: 520px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  background: var(--bg-page);
}

.login-form {
  width: 100%;
  max-width: 400px;
}

.card-head {
  margin-bottom: 32px;
}

.login-form h2 {
  font-size: 26px;
  font-weight: 700;
  margin: 0 0 8px;
  letter-spacing: -0.02em;
  color: var(--ink-950);
}

.login-sub {
  color: var(--ink-500);
  font-size: 13.5px;
  margin: 0;
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

/* ---- Form controls ---- */
.login-form :deep(.el-form-item) {
  margin-bottom: 20px;
}

.login-form :deep(.el-form-item__label) {
  font-size: 13px;
  font-weight: 500;
  color: var(--ink-700);
  padding-bottom: 8px;
  line-height: 1.2;
}

.login-form :deep(.el-input__wrapper) {
  height: 44px;
  padding: 1px 14px;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 0 0 1px var(--border-default) inset;
  transition: box-shadow var(--dur-base) var(--ease-out);
}

.login-form :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px var(--ink-400) inset;
}

.login-form :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--brand-500) inset, 0 0 0 3px var(--brand-50) !important;
}

.login-form :deep(.el-input__inner) {
  font-size: 14px;
  color: var(--ink-900);
}

.login-form :deep(.el-input__inner::placeholder) {
  color: var(--ink-300);
}

.submit-btn {
  width: 100%;
  height: 44px;
  margin-top: 6px;
  font-size: 14.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  border-radius: 8px;
}

.switch-line {
  margin-top: 24px;
  text-align: center;
  font-size: 13px;
  color: var(--ink-500);
}

.switch-line .el-link {
  font-weight: 600;
}

@media (max-width: 900px) {
  .login-brand {
    display: none;
  }
  .login-form-wrap {
    width: 100%;
    min-width: 0;
    padding: 24px;
  }
}
</style>
