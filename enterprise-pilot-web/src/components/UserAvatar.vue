<template>
  <span class="ua" :style="boxStyle">
    <img v-if="src" :src="src" :alt="name || ''" />
    <span v-else class="ua-text">{{ initials }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'

/**
 * 统一头像:有图用图,无图用姓名首字 + 由姓名哈希决定的柔和底色。
 * 取代原先全站的彩虹 conic-gradient 头像环。
 */
const props = defineProps({
  name: { type: String, default: '' },
  src: { type: String, default: '' },
  size: { type: Number, default: 36 }
})

// 与暖石 + 深青的全局色板同调的低饱和色调
const TONES = [
  { bg: '#e3f1ee', fg: '#0f5f58' },
  { bg: '#e7edf6', fg: '#31527d' },
  { bg: '#f6efe2', fg: '#7a5a22' },
  { bg: '#f7e9ec', fg: '#7d3a4a' },
  { bg: '#eceaf6', fg: '#4c4079' },
  { bg: '#efedeb', fg: '#57534e' }
]

const initials = computed(() => {
  const n = (props.name || '').trim()
  if (!n) return '?'
  const parts = n.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return n.slice(0, 2)
})

const tone = computed(() => {
  const n = props.name || ''
  let h = 0
  for (let i = 0; i < n.length; i += 1) h = (h * 31 + n.charCodeAt(i)) % 1000003
  return TONES[h % TONES.length]
})

const boxStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  background: props.src ? 'var(--ink-100)' : tone.value.bg,
  color: tone.value.fg,
  fontSize: `${Math.max(10, Math.round(props.size * 0.36))}px`
}))
</script>

<style scoped>
.ua {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 50%;
  user-select: none;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.01em;
}

.ua img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
</style>
