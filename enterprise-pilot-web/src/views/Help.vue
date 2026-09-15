<template>
  <div class="help-center">
    <!-- 搜索区 -->
    <div class="help-header">
      <div class="help-title">
        <h1>帮助中心</h1>
        <p>查找常见问题和使用指南</p>
      </div>
      <div class="help-search">
        <div class="search-input-wrap">
          <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="m21 21-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            class="search-input"
            placeholder="搜索问题…（如：如何修改密码？如何创建项目？）"
            @input="handleSearch"
          />
        </div>
      </div>
    </div>

    <!-- 分类卡片区 -->
    <div class="help-categories" v-show="!searchQuery">
      <div
        v-for="cat in categories"
        :key="cat.id"
        class="category-card"
        @click="scrollToSection(cat.id)"
      >
        <div class="category-icon">
          <component :is="cat.icon" :size="28" :stroke-width="1.6" />
        </div>
        <div class="category-info">
          <h3>{{ cat.name }}</h3>
          <p>{{ cat.description }}</p>
        </div>
      </div>
    </div>

    <!-- 搜索结果区 -->
    <div v-if="searchQuery && filteredResults.length === 0" class="help-empty">
      <span>未找到相关内容，请尝试其他关键词</span>
    </div>
    <div v-if="searchQuery && filteredResults.length > 0" class="help-search-results">
      <div class="search-results-title">找到 {{ filteredResults.length }} 个结果</div>
      <div
        v-for="item in filteredResults"
        :key="item.id"
        class="search-result-item"
        @click="toggleFaq(item)"
      >
        <span>{{ item.question }}</span>
      </div>
    </div>

    <!-- FAQ 内容区 -->
    <div class="help-content" v-show="!searchQuery">
      <section v-for="cat in categories" :key="cat.id" :id="cat.id" class="faq-section">
        <h2 class="faq-section-title">{{ cat.name }}</h2>
        <div class="faq-list">
          <div
            v-for="faq in cat.faqs"
            :key="faq.id"
            class="faq-item"
            :class="{ expanded: expandedFaqs.has(faq.id) }"
          >
            <button class="faq-question" @click="toggleFaq(faq)">
              <span class="faq-text">{{ faq.question }}</span>
              <svg class="faq-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <div class="faq-answer" v-show="expandedFaqs.has(faq.id)">
              <div v-html="faq.answer"></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  LayoutGrid, Calendar, FolderKanban, BookOpen, UserRound, AlertCircle, HelpCircle, Sparkles
} from 'lucide-vue-next'

const searchQuery = ref('')
const expandedFaqs = ref(new Set())

const categories = [
  {
    id: 'getting-started',
    name: '新手入门',
    description: '首次使用平台快速上手',
    icon: HelpCircle,
    faqs: [
      {
        id: 1,
        question: '如何登录平台？',
        answer: '在登录页面输入用户名和密码，点击「登录」按钮即可进入系统。新用户需要先注册账号。'
      },
      {
        id: 2,
        question: '如何修改个人信息？',
        answer: '点击左侧底部的「个人主页」，在右侧表单中修改您的姓名、部门、员工编号等信息，点击保存即可生效。'
      },
      {
        id: 3,
        question: '如何修改登录密码？',
        answer: '在个人主页页面向下滚动找到「修改密码」区域，输入旧密码和新密码，点击确认修改即可。密码长度至少 6 位。'
      }
    ]
  },
  {
    id: 'projects',
    name: '项目管理',
    description: '创建项目、添加成员、管理任务',
    icon: FolderKanban,
    faqs: [
      {
        id: 11,
        question: '如何创建新项目？',
        answer: '在首页点击「新建项目」卡片，填写项目名称、描述、起止日期，保存后即可创建。创建者自动成为项目负责人。'
      },
      {
        id: 12,
        question: '如何邀请团队成员加入项目？',
        answer: '进入项目详情，在右侧「项目成员」区域，负责人可以添加其他用户到项目中。添加后成员即可看到项目任务和讨论。'
      },
      {
        id: 13,
        question: '如何添加项目任务？',
        answer: '在项目详情页面下方任务区，输入任务名称点击「+」按钮即可添加。负责人可以更新任务进度和状态。'
      },
      {
        id: 14,
        question: '我看不到项目，怎么办？',
        answer: '项目需要负责人添加您为成员才能看到。请联系项目负责人将您加入项目成员列表。'
      }
    ]
  },
  {
    id: 'meetings',
    name: '会议预约',
    description: '会议室预订和会议纪要',
    icon: Calendar,
    faqs: [
      {
        id: 21,
        question: '如何预订会议室？',
        answer: '左侧导航进入「会议」页面，左侧选择日期和会议室，填写会议主题、起止时间和参会人，提交预订即可。系统会自动检查冲突。'
      },
      {
        id: 22,
        question: '如何查看我预订的会议？',
        answer: '在「会议」页面右侧，「我的预订」标签下列出了您所有未来和历史的会议预订。'
      },
      {
        id: 23,
        question: '可以取消已预订的会议吗？',
        answer: '可以。在我的预订列表中找到要取消的会议，点击「取消」按钮即可。会议室会被释放供其他人预订。'
      },
      {
        id: 24,
        question: '会议纪要生成失败怎么办？',
        answer: '会议纪要需要智谱 API Key 配置正确才能使用。请检查后端配置的 ZHIPU_API_KEY 是否有效，余额是否充足。'
      }
    ]
  },
  {
    id: 'knowledge',
    name: '知识库',
    description: '文档管理和智能问答',
    icon: BookOpen,
    faqs: [
      {
        id: 31,
        question: '如何上传文档到知识库？',
        answer: '左侧导航进入「知识库」，在左侧文档列表点击「新建文档」，输入标题和正文，选择分类，点击保存后会自动进行向量化。向量化完成后即可通过 AI 问答检索内容。'
      },
      {
        id: 32,
        question: '知识库支持哪些格式？',
        answer: '目前支持 Markdown 格式的文本文档。您可以直接在编辑器中编写，也可以将其他文档内容粘贴进来。'
      },
      {
        id: 33,
        question: '向量化需要多久？',
        answer: '一般文档只需要几秒钟。较大的文档可能需要十几秒，请耐心等待。'
      },
      {
        id: 34,
        question: '如何删除已上传的文档？',
        answer: '在左侧文档列表中选择要删除的文档，点击标题下方的删除按钮即可。删除后向量数据也会一并移除。'
      }
    ]
  },
  {
    id: 'ai-assistant',
    name: 'AI 助手',
    description: 'AI 对话和工具使用',
    icon: Sparkles,
    faqs: [
      {
        id: 41,
        question: 'AI 助手可以做什么？',
        answer: '<p>AI 助手支持多种功能：</p><ul><li>回答通用问题</li><li>基于您的知识库文档回答问题</li><li>查询会议安排和项目进度</li><li>查询今日待办任务</li></ul><p>直接在对话框输入问题即可，AI 会自动判断是否需要调用工具获取最新数据。</p>'
      },
      {
        id: 42,
        question: '为什么 AI 回答显示 502 错误？',
        answer: '502 错误通常表示智谱 API 调用失败。最常见原因是 API Key 不正确或账户余额不足。请检查后端配置并充值后重试。'
      },
      {
        id: 43,
        question: '如何清空对话历史？',
        answer: '按下快捷键 Ctrl+Shift+C 即可快速清空对话。也可以点击输入框右下角的清空按钮。'
      },
      {
        id: 44,
        question: '对话历史会保存吗？',
        answer: '对话历史会保存在浏览器本地存储中，刷新页面后会自动恢复。清除浏览器数据会丢失历史。'
      }
    ]
  },
  {
    id: 'account',
    name: '账号与权限',
    description: '账号管理和权限说明',
    icon: UserRound,
    faqs: [
      {
        id: 51,
        question: '什么是角色权限？',
        answer: '<p>系统有三种角色：</p><ul><li><strong>管理员</strong>：可以管理部门、会议室、所有用户</li><li><strong>部门经理</strong>：可以创建项目和会议</li><li><strong>普通员工</strong>：可以加入项目、预订会议室、使用 AI 助手</li></ul>'
      },
      {
        id: 52,
        question: '忘记密码怎么办？',
        answer: '目前系统不支持自助找回密码，请联系管理员重置密码。'
      },
      {
        id: 53,
        question: '为什么有些页面我访问不了？',
        answer: '某些操作（如增删部门、管理会议室）需要管理员权限。如果您确实需要这些权限，请联系管理员为您分配角色。'
      }
    ]
  },
  {
    id: 'troubleshooting',
    name: '常见问题',
    description: '启动和运行故障排查',
    icon: AlertCircle,
    faqs: [
      {
        id: 61,
        question: '启动脚本提示 Redis 找不到',
        answer: 'start.bat 会自动搜索常见路径下的 redis-server.exe。如果您的 Redis 在其他位置，可以设置 REDIS_HOME 环境变量指向 Redis 安装目录。找不到 Redis 不影响启动，只是缓存功能不可用。'
      },
      {
        id: 62,
        question: 'Java 后端启动失败',
        answer: '<p>请检查：</p><ul><li>Java 版本是否 17+</li><li>MySQL 是否启动且可连接</li><li>Redis 是否启动（配置文件中地址是否正确）</li><li>端口 8080 是否被占用</li></ul>'
      },
      {
        id: 63,
        question: '前端页面打不开',
        answer: '检查 Node 版本是否 18+，确认 npm install 已经完成，查看 runtime-logs/web.err.log 查看具体错误。'
      },
      {
        id: 64,
        question: '知识库问答报错',
        answer: '检查 Chroma 向量数据库在 Python 端是否正常启动，智谱 API Key 是否配置正确且余额充足。'
      }
    ]
  }
]

const allFaqs = computed(() => {
  const result = []
  categories.forEach(cat => {
    cat.faqs.forEach(faq => {
      result.push({ ...faq, categoryId: cat.id, categoryName: cat.name })
    })
  })
  return result
})

const filteredResults = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return []
  return allFaqs.value.filter(
    f => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
  )
})

function handleSearch() {
  // search handled by computed
}

function toggleFaq(faq) {
  const newSet = new Set(expandedFaqs.value)
  if (newSet.has(faq.id)) {
    newSet.delete(faq.id)
  } else {
    newSet.add(faq.id)
  }
  expandedFaqs.value = newSet

  if (searchQuery.value) {
    const el = document.getElementById(faq.categoryId)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
      searchQuery.value = ''
    }
  }
}

function scrollToSection(categoryId) {
  const el = document.getElementById(categoryId)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' })
  }
}
</script>

<style scoped>
.help-center {
  min-height: 100%;
  background: var(--bg-page);
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.help-header {
  margin-bottom: 32px;
  text-align: center;
}

.help-title h1 {
  font-size: 32px;
  font-weight: 600;
  color: var(--ink-900);
  margin: 0 0 8px;
}

.help-title p {
  font-size: 15px;
  color: var(--ink-400);
  margin: 0;
}

.help-search {
  margin-top: 24px;
  max-width: 640px;
  margin-left: auto;
  margin-right: auto;
}

.search-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
  background: white;
  border: 1px solid var(--border-default);
  border-radius: 12px;
  padding: 0 16px;
  height: 52px;
  box-shadow: var(--shadow-sm);
  transition: all 150ms ease;
}

.search-input-wrap:focus-within {
  border-color: var(--brand-400);
  box-shadow: 0 0 0 3px var(--brand-50);
}

.search-icon {
  color: var(--ink-400);
  margin-right: 12px;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 15px;
  color: var(--ink-900);
}

.search-input::placeholder {
  color: var(--ink-400);
}

.help-categories {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.category-card {
  background: white;
  border: 1px solid var(--border-default);
  border-radius: 12px;
  padding: 24px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  cursor: pointer;
  transition: all 180ms ease;
  box-shadow: var(--shadow-sm);
}

.category-card:hover {
  border-color: var(--brand-300);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.category-icon {
  width: 52px;
  height: 52px;
  border-radius: 10px;
  background: var(--brand-50);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--brand-600);
  flex-shrink: 0;
}

.category-info h3 {
  font-size: 17px;
  font-weight: 600;
  color: var(--ink-900);
  margin: 0 0 6px;
}

.category-info p {
  font-size: 14px;
  color: var(--ink-400);
  margin: 0;
  line-height: 1.5;
}

.help-empty {
  text-align: center;
  padding: 60px 20px;
  color: var(--ink-400);
  font-size: 15px;
  background: white;
  border-radius: 12px;
  border: 1px dashed var(--border-default);
}

.help-search-results {
  margin-bottom: 32px;
}

.search-results-title {
  font-size: 14px;
  color: var(--ink-400);
  margin-bottom: 12px;
}

.search-result-item {
  background: white;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 14px 16px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 150ms ease;
  color: var(--ink-900);
  font-size: 14px;
}

.search-result-item:hover {
  border-color: var(--brand-300);
  background: var(--brand-50);
}

.help-content {
  transition: opacity 200ms ease;
}

.faq-section {
  margin-bottom: 32px;
}

.faq-section-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--ink-900);
  margin: 0 0 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-subtle);
}

.faq-list {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--border-default);
  box-shadow: var(--shadow-sm);
}

.faq-item {
  border-bottom: 1px solid var(--border-subtle);
}

.faq-item:last-child {
  border-bottom: none;
}

.faq-question {
  width: 100%;
  text-align: left;
  padding: 18px 20px;
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  transition: background 150ms ease;
}

.faq-question:hover {
  background: var(--ink-50);
}

.faq-text {
  font-size: 15px;
  font-weight: 500;
  color: var(--ink-900);
  text-align: left;
  line-height: 1.5;
}

.faq-chevron {
  color: var(--ink-400);
  flex-shrink: 0;
  transition: transform 200ms ease;
}

.faq-item.expanded .faq-chevron {
  transform: rotate(180deg);
}

.faq-answer {
  padding: 0 20px 18px;
  color: var(--ink-600);
  font-size: 14px;
  line-height: 1.7;
}

.faq-answer p {
  margin: 0 0 12px;
}

.faq-answer p:last-child {
  margin-bottom: 0;
}

.faq-answer ul {
  margin: 8px 0;
  padding-left: 20px;
}

.faq-answer li {
  margin-bottom: 6px;
}

@media (max-width: 768px) {
  .help-center {
    padding: 16px;
  }

  .help-categories {
    grid-template-columns: 1fr;
  }
}
</style>
