import { defineStore } from 'pinia'
import { userApi } from '@/api'

const TOKEN_KEY = 'enterprise-pilot-token'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem(TOKEN_KEY) || '',
    userInfo: null
  }),
  getters: {
    isLoggedIn: (state) => !!state.token
  },
  actions: {
    async login(payload) {
      const data = await userApi.login(payload)
      this.token = data.token
      localStorage.setItem(TOKEN_KEY, data.token)
      this.userInfo = data
      return data
    },
    async fetchMe() {
      const data = await userApi.me()
      this.userInfo = data
      return data
    },
    async logout() {
      try {
        await userApi.logout()
      } catch {
        // 后端登出失败不阻塞本地清理
      }
      this.token = ''
      this.userInfo = null
      localStorage.removeItem(TOKEN_KEY)
    }
  }
})
