import { defineStore } from 'pinia'
import { notificationApi } from '@/api'

export const useNotificationStore = defineStore('notification', {
  state: () => ({
    unreadCount: 0,
    records: [],
    total: 0,
    loading: false
  }),
  actions: {
    async fetchUnread() {
      try {
        this.unreadCount = (await notificationApi.unreadCount()) || 0
      } catch {
        this.unreadCount = 0
      }
    },
    async fetchList() {
      this.loading = true
      try {
        const data = await notificationApi.list({ page: 1, size: 20 })
        this.records = data?.records || []
        this.total = data?.total || 0
      } catch {
        this.records = []
        this.total = 0
      } finally {
        this.loading = false
      }
    },
    async markRead(id) {
      await notificationApi.markRead(id)
      const item = this.records.find((n) => n.id === id)
      if (item && !item.isRead) {
        item.isRead = 1
        this.unreadCount = Math.max(0, this.unreadCount - 1)
      }
    },
    async markAllRead() {
      await notificationApi.markAllRead()
      this.records.forEach((n) => (n.isRead = 1))
      this.unreadCount = 0
    },
    async remove(id) {
      await notificationApi.remove(id)
      const item = this.records.find((n) => n.id === id)
      this.records = this.records.filter((n) => n.id !== id)
      this.total = Math.max(0, this.total - 1)
      if (item && !item.isRead) {
        this.unreadCount = Math.max(0, this.unreadCount - 1)
      }
    }
  }
})
