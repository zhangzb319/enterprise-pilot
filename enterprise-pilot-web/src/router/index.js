import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/Login.vue'),
    meta: { title: '登录', public: true }
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '概览' }
      },
      {
        path: 'meetings',
        name: 'meetings',
        component: () => import('@/views/Meetings.vue'),
        meta: { title: '会议预约' }
      },
      {
        path: 'projects',
        name: 'projects',
        component: () => import('@/views/Projects.vue'),
        meta: { title: '项目看板' }
      },
      {
        path: 'messages',
        name: 'messages',
        component: () => import('@/views/Messages.vue'),
        meta: { title: '站内消息' }
      },
      {
        path: 'directory',
        name: 'directory',
        component: () => import('@/views/Directory.vue'),
        meta: { title: '通讯录' }
      },
      {
        path: 'knowledge',
        name: 'knowledge',
        component: () => import('@/views/Knowledge.vue'),
        meta: { title: '知识库' }
      },
      {
        path: 'agent',
        name: 'agent',
        component: () => import('@/views/Agent.vue'),
        meta: { title: 'AI 助手' }
      },
      {
        path: 'help',
        name: 'help',
        component: () => import('@/views/Help.vue'),
        meta: { title: '帮助中心' }
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('@/views/Profile.vue'),
        meta: { title: '个人主页' }
      }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  const userStore = useUserStore()
  if (!to.meta.public && !userStore.token) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  if (to.path === '/login' && userStore.token) {
    return { path: '/dashboard' }
  }
  document.title = to.meta.title ? `${to.meta.title} · Enterprise Pilot` : 'Enterprise Pilot'
})

export default router
