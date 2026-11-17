import { defineStore } from 'pinia'

const STORAGE_KEY = 'enterprise-pilot:agent:conversations'

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    if (Array.isArray(data)) return data
  } catch { /* ignore */ }
  return []
}

function save(conversations) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations))
}

function newConversation(title = '新对话') {
  const now = Date.now()
  return {
    id: `conv-${now}-${Math.floor(Math.random() * 10000)}`,
    title,
    updatedAt: now,
    messages: []
  }
}

export const useAgentChatStore = defineStore('agentChat', {
  state: () => ({
    conversations: load(),
    currentId: null
  }),
  getters: {
    current: (state) => state.conversations.find((c) => c.id === state.currentId) || null,
    messages: (state) => {
      const c = state.current
      return c ? c.messages : []
    }
  },
  actions: {
    loadConversations() {
      this.conversations = load()
      if (!this.currentId || !this.conversations.find((c) => c.id === this.currentId)) {
        this.currentId = this.conversations.length ? this.conversations[0].id : null
      }
    },
    createConversation(title) {
      const conv = newConversation(title)
      this.conversations.unshift(conv)
      save(this.conversations)
      this.currentId = conv.id
      return conv
    },
    switchConversation(id) {
      this.currentId = id
    },
    updateCurrentTitle(title) {
      const conv = this.current
      if (conv) {
        conv.title = title
        conv.updatedAt = Date.now()
        save(this.conversations)
      }
    },
    deleteConversation(id) {
      const index = this.conversations.findIndex((c) => c.id === id)
      if (index < 0) return
      this.conversations.splice(index, 1)
      save(this.conversations)
      if (!this.conversations.length) {
        this.currentId = null
      } else if (this.currentId === id) {
        this.currentId = this.conversations[0].id
      }
    },
    appendMessage(id, message) {
      const conv = this.conversations.find((c) => c.id === id)
      if (!conv) return
      conv.messages.push(message)
      conv.updatedAt = Date.now()
      save(this.conversations)
    },
    replaceMessages(id, messages) {
      const conv = this.conversations.find((c) => c.id === id)
      if (!conv) return
      conv.messages = messages
      conv.updatedAt = Date.now()
      save(this.conversations)
    },
    clearCurrent() {
      const conv = this.current
      if (!conv) return
      conv.messages = []
      conv.updatedAt = Date.now()
      save(this.conversations)
    }
  }
})
