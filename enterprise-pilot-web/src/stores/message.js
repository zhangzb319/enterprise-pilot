import { defineStore } from 'pinia'
import { messageApi } from '@/api'

export const useMessageStore = defineStore('message', {
  state: () => ({
    msgUnread: 0
  }),
  actions: {
    async fetchMsgUnread() {
      try {
        this.msgUnread = (await messageApi.unreadCount()) || 0
      } catch {
        this.msgUnread = 0
      }
    }
  }
})