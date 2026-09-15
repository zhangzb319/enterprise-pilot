<template>
  <div class="kb">
    <!-- ======== Page header ======== -->
    <div class="kb-topbar">
      <h2>知识库</h2>
      <el-segmented v-model="activeTab" :options="tabs" class="kb-tabs" />
    </div>

    <div class="kb-layout">
      <!-- ================================================================
           Left: document list
      ================================================================ -->
      <aside class="kb-card kb-sidebar">
        <div class="kb-sidebar-hd">
          <span class="kb-card-title">知识库文档</span>
          <span class="kb-count">{{ docs.length }}</span>
        </div>

        <el-input
          v-model="docSearch"
          :prefix-icon="Search"
          placeholder="搜索文档..."
          clearable
          class="kb-search"
        />
        <el-select
          v-model="docCategoryFilter"
          placeholder="全部分类"
          clearable
          class="kb-filter"
        >
          <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
        </el-select>

        <div class="kb-doc-list">
          <template v-if="filteredDocs.length">
            <div
              v-for="doc in filteredDocs"
              :key="doc.document_id"
              class="kb-doc"
              :class="{ active: selectedId === doc.document_id }"
              @click="selectDoc(doc)"
            >
              <div class="kb-doc-hd">
                <span class="kb-doc-title">{{ doc.title || doc.document_id }}</span>
                <el-tag
                  v-if="doc.category"
                  size="small"
                  effect="light"
                  :class="tagClass(doc.category)"
                  class="kb-doc-tag"
                >{{ doc.category }}</el-tag>
              </div>
              <div class="kb-doc-meta">
                <span>{{ fmtCreated(doc.created_at) }}</span>
                <span class="kb-doc-dot">·</span>
                <span>{{ doc.chunk_count }} 个分块</span>
                <button class="kb-doc-del" title="删除" @click.stop="deleteDoc(doc)">
                  <el-icon :size="13"><Delete /></el-icon>
                </button>
              </div>
            </div>
          </template>

          <div v-else-if="!loadingDocs" class="kb-side-empty">
            <div class="kb-side-empty-icon">
              <el-icon :size="20"><FolderOpened /></el-icon>
            </div>
            <div class="kb-side-empty-t">暂无文档</div>
            <div class="kb-side-empty-d">点击上方撰写新知识开始入库</div>
          </div>

          <div v-else class="kb-side-loading">
            <span class="kb-loading-dot"></span>
            <span>加载中…</span>
          </div>
        </div>
      </aside>

      <!-- ================================================================
           Center: write / document detail
      ================================================================ -->
      <section class="kb-card kb-center">
        <!-- ======== Document detail mode ======== -->
        <template v-if="selectedDoc">
          <div class="kb-detail-hd">
            <button class="kb-back" @click="backToWrite">
              <el-icon :size="14"><ArrowLeft /></el-icon>
              返回撰写
            </button>
            <button class="kb-detail-del" @click="deleteDoc(selectedDoc)">
              <el-icon :size="13"><Delete /></el-icon>
              删除文档
            </button>
          </div>

          <div v-if="detailLoading" class="kb-detail-loading">
            <span class="kb-loading-dot"></span>
            <span>加载文档内容…</span>
          </div>

          <template v-else>
            <h3 class="kb-detail-title">{{ selectedDoc.title || selectedDoc.document_id }}</h3>
            <div class="kb-detail-meta">
              <el-tag
                v-if="selectedDoc.category"
                size="small"
                effect="light"
                :class="tagClass(selectedDoc.category)"
              >{{ selectedDoc.category }}</el-tag>
              <span class="kb-detail-meta-item">{{ selectedDoc.document_id }}</span>
              <span class="kb-detail-meta-item">{{ fmtCreated(selectedDoc.created_at) }}</span>
              <span class="kb-detail-meta-item">{{ detail?.chunks?.length ?? 0 }} 个分块</span>
            </div>

            <div class="kb-detail-body">
              <div v-for="chunk in detail?.chunks || []" :key="chunk.index" class="kb-chunk">
                <div class="kb-chunk-hd">分块 {{ chunk.index + 1 }}</div>
                <div class="kb-chunk-text">{{ chunk.content }}</div>
              </div>
              <div v-if="!(detail?.chunks?.length)" class="kb-detail-empty">该文档暂无内容分块</div>
            </div>
          </template>
        </template>

        <!-- ======== Manage empty (no selection) ======== -->
        <template v-else-if="activeTab === '检索已入库内容'">
          <div class="kb-center-empty">
            <div class="kb-center-empty-icon">
              <el-icon :size="22"><Document /></el-icon>
            </div>
            <div class="kb-center-empty-t">选择一篇文档</div>
            <div class="kb-center-empty-d">从左侧文档列表中选择一篇，查看入库详情与分块内容</div>
          </div>
        </template>

        <!-- ======== Write mode ======== -->
        <template v-else>
          <el-form
            ref="ingestFormRef"
            :model="ingestForm"
            :rules="ingestRules"
            label-position="top"
            :hide-required-asterisk="true"
            @submit.prevent
          >
            <el-form-item prop="title" class="kb-title-field">
              <div class="kb-title-wrap">
                <span class="kb-title-pencil"><el-icon :size="13"><EditPen /></el-icon></span>
                <el-input
                  v-model="ingestForm.title"
                  class="kb-title-input"
                  placeholder="输入知识标题"
                  maxlength="80"
                />
              </div>
            </el-form-item>

            <el-form-item prop="content" class="kb-content-field">
              <div class="kb-editor" :class="{ focus: editorFocus }">
                <div class="kb-editor-toolbar">
                  <span class="kb-tool"><el-icon :size="14"><EditPen /></el-icon></span>
                  <span class="kb-tool"><el-icon :size="14"><Tickets /></el-icon></span>
                  <span class="kb-tool"><el-icon :size="14"><Grid /></el-icon></span>
                  <span class="kb-tool"><el-icon :size="14"><Link /></el-icon></span>
                  <span class="kb-charcount">已输入 {{ ingestForm.content.length }} 字</span>
                </div>
                <el-input
                  v-model="ingestForm.content"
                  type="textarea"
                  class="kb-content-input"
                  :rows="13"
                  placeholder="在这里撰写正文，系统将自动分块并向量化…"
                  resize="vertical"
                  @focus="editorFocus = true"
                  @blur="editorFocus = false"
                />
              </div>
            </el-form-item>

            <div class="kb-meta">
              <el-form-item label="文档 ID" prop="document_id" class="kb-meta-item">
                <el-input v-model="ingestForm.document_id" placeholder="自动生成" disabled>
                  <template #suffix>
                    <el-icon :size="13" class="kb-lock-icon"><Lock /></el-icon>
                  </template>
                </el-input>
              </el-form-item>
              <el-form-item label="分类" prop="category" class="kb-meta-item">
                <el-select v-model="ingestForm.category" placeholder="选择分类" clearable>
                  <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
                </el-select>
              </el-form-item>
            </div>

            <div class="kb-foot">
              <span class="kb-status">
                <span class="kb-status-dot"></span>
                自动分块 · 向量化
              </span>
              <el-button type="primary" :loading="ingesting" class="kb-submit" @click="ingestDoc">
                <el-icon v-if="!ingesting"><UploadFilled /></el-icon>
                写入知识库
              </el-button>
            </div>
          </el-form>
        </template>
      </section>

      <!-- ================================================================
           Right: ask
      ================================================================ -->
      <section class="kb-card kb-ask">
        <div class="kb-card-title kb-ask-title">知识问答</div>

        <div class="kb-composer">
          <el-input
            v-model="question"
            type="textarea"
            :rows="2"
            placeholder="输入问题，检索已入库的知识…"
            resize="none"
            @keydown.enter.exact.prevent="ask"
          />
          <div class="kb-composer-foot">
            <span class="kb-hint">Enter 发送</span>
            <button class="kb-send" :disabled="asking || !question.trim()" @click="ask">
              <el-icon v-if="!asking" :size="15"><Promotion /></el-icon>
              <span v-else class="kb-send-loading"></span>
            </button>
          </div>
        </div>

        <div v-if="asking" class="kb-asking">
          <span class="kb-loading-dot"></span>
          <span>正在检索知识库…</span>
        </div>

        <template v-else-if="answer">
          <div class="kb-answer">
            <div class="kb-answer-text" v-html="renderRich(answer, { cites: true })"></div>
          </div>

          <div v-if="sources.length" class="kb-sources">
            <div class="kb-sources-hd">参考来源 · {{ sources.length }}</div>
            <div v-for="(s, i) in sources" :key="i" class="kb-source">
              <span class="kb-source-index">{{ i + 1 }}</span>
              <div class="kb-source-body">
                <div class="kb-source-title">{{ s.title }}</div>
                <div class="kb-source-content">{{ s.content }}</div>
              </div>
            </div>
          </div>
        </template>

        <div v-else class="kb-ask-empty">
          <div class="kb-ask-empty-t">检索已入库的知识</div>
          <p class="kb-ask-empty-d">输入问题后，系统会从已入库文档中检索相关内容，并给出带来源的回答。</p>
          <div class="kb-suggestions">
            <div v-for="s in suggestions" :key="s" class="kb-suggestion" @click="askWith(s)">
              <span class="kb-suggestion-text">{{ s }}</span>
              <span class="kb-suggestion-arrow">→</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ragApi } from '@/api'
import {
  Search, Delete, FolderOpened, UploadFilled, Promotion,
  ArrowLeft, Document, EditPen, Tickets, Grid, Link, Lock
} from '@element-plus/icons-vue'
import { renderRich } from '@/utils/markdown'
import dayjs from 'dayjs'

const tabs = ['撰写知识', '检索已入库内容']
const activeTab = ref('撰写知识')

const categories = ref([])
const docs = ref([])
const docSearch = ref('')
const docCategoryFilter = ref('')
const loadingDocs = ref(false)

const selectedId = ref(null)
const detail = ref(null)
const detailLoading = ref(false)

const selectedDoc = computed(() => docs.value.find((d) => d.document_id === selectedId.value) || null)

const filteredDocs = computed(() => {
  let list = docs.value
  if (docCategoryFilter.value) {
    list = list.filter((d) => d.category === docCategoryFilter.value)
  }
  if (docSearch.value) {
    const q = docSearch.value.toLowerCase()
    list = list.filter((d) => d.document_id.toLowerCase().includes(q) || (d.title && d.title.toLowerCase().includes(q)))
  }
  return list
})

const suggestions = [
  '知识库中有哪些会议纪要规范？',
  '员工手册里关于考勤有哪些规定？',
  '如何接入新的文档格式？'
]

const ingestFormRef = ref(null)
const editorFocus = ref(false)
const ingestForm = reactive({
  document_id: '',
  title: '',
  category: '',
  content: ''
})
const ingestRules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入正文内容', trigger: 'blur' }]
}

const ingesting = ref(false)
const question = ref('')
const asking = ref(false)
const answer = ref('')
const sources = ref([])

const TAG_CLASS = {
  制度: 'tag-brand',
  手册: 'tag-success',
  FAQ: 'tag-warning',
  技术文档: 'tag-info'
}
function tagClass(category) {
  return TAG_CLASS[category] || 'tag-neutral'
}

function fmtCreated(t) {
  return t ? dayjs(t).format('YYYY-MM-DD HH:mm') : '—'
}

async function loadDocs() {
  loadingDocs.value = true
  try {
    docs.value = await ragApi.list() || []
  } catch { /* ignore */ } finally {
    loadingDocs.value = false
  }
}

async function loadCategories() {
  try {
    categories.value = await ragApi.categories() || []
  } catch { /* ignore */ }
}

async function selectDoc(doc) {
  selectedId.value = doc.document_id
  activeTab.value = '检索已入库内容'
  detail.value = null
  detailLoading.value = true
  try {
    detail.value = await ragApi.get(doc.document_id)
  } catch {
    ElMessage.error('文档详情加载失败')
  } finally {
    detailLoading.value = false
  }
}

function backToWrite() {
  selectedId.value = null
  detail.value = null
  activeTab.value = '撰写知识'
}

async function deleteDoc(doc) {
  try {
    await ElMessageBox.confirm(`确定删除文档「${doc.title || doc.document_id}」？删除后不可恢复。`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  try {
    await ragApi.remove(doc.document_id)
    ElMessage.success('已删除')
    if (selectedId.value === doc.document_id) {
      selectedId.value = null
      detail.value = null
    }
    await loadDocs()
  } catch (e) {
    ElMessage.error(e.message || '删除失败')
  }
}

async function ingestDoc() {
  try {
    await ingestFormRef.value.validate()
  } catch {
    return
  }
  ingesting.value = true
  const documentId = `doc-${Date.now()}`
  try {
    const data = await ragApi.ingest({
      document_id: documentId,
      title: ingestForm.title,
      content: ingestForm.content,
      category: ingestForm.category || undefined
    })
    ElMessage.success(`入库成功，共 ${data?.chunk_count ?? 0} 个分块`)
    ingestFormRef.value.resetFields()
    await Promise.all([loadDocs(), loadCategories()])
  } catch (e) {
    ElMessage.error(e.message || '入库失败')
  } finally {
    ingesting.value = false
  }
}

async function ask() {
  if (!question.value.trim() || asking.value) return
  asking.value = true
  answer.value = ''
  sources.value = []
  try {
    const data = await ragApi.ask({ question: question.value.trim(), top_k: 4 })
    answer.value = data?.answer || '（无回答）'
    sources.value = data?.sources || []
  } catch (e) {
    ElMessage.error(e.message || '请求失败')
  } finally {
    asking.value = false
  }
}

function askWith(s) {
  question.value = s
  ask()
}

function handleKeydown(e) {
  if (e.ctrlKey && e.key === 'Enter' && activeTab.value === '撰写知识' && !selectedDoc.value) {
    ingestDoc()
  }
}

onMounted(() => {
  loadDocs()
  loadCategories()
  window.addEventListener('keydown', handleKeydown)
})
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
/* ======== Page ======== */
.kb {
  min-height: 100%;
  background: linear-gradient(135deg, rgba(20, 184, 166, 0.03), transparent 42%);
}

.kb-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.kb-topbar h2 {
  font-size: 20px;
  font-weight: 650;
  letter-spacing: -0.02em;
  color: var(--ink-950);
}

.kb-tabs :deep(.el-segmented) {
  --el-segmented-bg-color: var(--ink-100);
  --el-segmented-item-selected-bg-color: var(--brand-600);
  --el-segmented-item-selected-color: #fff;
  --el-segmented-item-selected-font-weight: 600;
  --el-border-radius-base: 999px;
  border: 1px solid var(--border-default);
  padding: 3px;
}

/* ======== Layout: 240 | flex | 380 ======== */
.kb-layout {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr) 380px;
  gap: 18px;
  align-items: start;
}

.kb-card {
  background: var(--bg-card);
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: box-shadow var(--dur-base) var(--ease-out);
}

.kb-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.kb-card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-800);
}

/* ======== Left: document list ======== */
.kb-sidebar {
  padding: 16px 14px;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 190px);
}

.kb-sidebar-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.kb-count {
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  background: var(--brand-500);
  border-radius: 999px;
  padding: 1px 8px;
}

.kb-search {
  margin-bottom: 8px;
}

.kb-search :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--border-default) inset;
  transition: box-shadow var(--dur-base) var(--ease-out);
}

.kb-search :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--brand-400) inset, 0 0 0 4px var(--brand-50);
}

.kb-search :deep(.el-input__inner::placeholder) {
  color: var(--ink-400);
}

.kb-filter {
  width: 100%;
  margin-bottom: 12px;
}

.kb-filter :deep(.el-select__placeholder) {
  color: var(--ink-400);
}

.kb-doc-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 120px;
}

.kb-doc {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
}

.kb-doc:hover {
  background: var(--ink-50);
}

.kb-doc.active {
  background: var(--brand-50);
  border-color: var(--brand-100);
}

.kb-doc-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 5px;
}

.kb-doc-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-900);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.kb-doc-tag {
  flex-shrink: 0;
  border: none;
}

.kb-doc-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--ink-400);
  font-variant-numeric: tabular-nums;
}

.kb-doc-dot {
  color: var(--ink-300);
}

.kb-doc-del {
  margin-left: auto;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: var(--ink-300);
  border-radius: 5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: all var(--dur-fast) var(--ease-out);
}

.kb-doc:hover .kb-doc-del {
  opacity: 1;
}

.kb-doc-del:hover {
  background: var(--danger-bg);
  color: var(--danger);
}

/* ---- Category tag colors (existing tokens only) ---- */
.tag-brand {
  --el-tag-bg-color: var(--brand-50);
  --el-tag-text-color: var(--brand-700);
}
.tag-success {
  --el-tag-bg-color: var(--success-bg);
  --el-tag-text-color: var(--success);
}
.tag-warning {
  --el-tag-bg-color: var(--warning-bg);
  --el-tag-text-color: var(--warning);
}
.tag-info {
  --el-tag-bg-color: var(--info-bg);
  --el-tag-text-color: var(--info);
}
.tag-neutral {
  --el-tag-bg-color: var(--ink-100);
  --el-tag-text-color: var(--ink-600);
}

/* ---- Sidebar empty / loading ---- */
.kb-side-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 36px 12px;
}

.kb-side-empty-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--brand-400), var(--brand-600));
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
  box-shadow: 0 4px 12px rgba(13, 148, 136, 0.2);
}

.kb-side-empty-icon :deep(.el-icon) {
  font-size: 26px !important;
}

.kb-side-empty-t {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-800);
  margin-bottom: 4px;
}

.kb-side-empty-d {
  font-size: 12px;
  color: var(--ink-400);
  line-height: 1.6;
}

.kb-side-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 30px 0;
  font-size: 12px;
  color: var(--ink-400);
}

.kb-loading-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--brand-400);
  animation: kb-pulse 1.2s infinite ease-in-out;
}

@keyframes kb-pulse {
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1); }
}

/* ======== Center ======== */
.kb-center {
  padding: 26px 30px;
  min-height: 560px;
}

/* ---- Write form ---- */
.kb-title-field {
  margin-bottom: 18px;
}

.kb-title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.kb-title-input {
  flex: 1;
}

.kb-title-pencil {
  display: inline-flex;
  align-items: center;
  color: var(--ink-300);
  pointer-events: none;
  transition: opacity var(--dur-fast) var(--ease-out);
}

.kb-title-wrap:has(.el-input__inner:not(:placeholder-shown)) .kb-title-pencil {
  opacity: 0;
}

.kb-title-input :deep(.el-input__wrapper) {
  position: relative;
  background-color: transparent;
  background-image: linear-gradient(to right, var(--brand-300), transparent 78%);
  background-position: bottom;
  background-size: 100% 1px;
  background-repeat: no-repeat;
  box-shadow: none !important;
  border-radius: 0;
  padding: 0 0 10px;
  transition: background-image var(--dur-base) var(--ease-out);
}

.kb-title-input :deep(.el-input__wrapper::after) {
  content: '';
  position: absolute;
  left: 0;
  bottom: -2px;
  width: 0;
  height: 2px;
  border-radius: 2px;
  background: var(--brand-500);
  transition: width var(--dur-base) var(--ease-out);
}

.kb-title-input :deep(.el-input__inner) {
  font-size: 20px;
  font-weight: 600;
  color: var(--ink-950);
  letter-spacing: -0.015em;
  height: 38px;
  line-height: 38px;
}

.kb-title-input :deep(.el-input__inner::placeholder) {
  color: var(--ink-400);
  font-weight: 500;
}

.kb-title-input :deep(.el-input__wrapper.is-focus) {
  background-image: linear-gradient(to right, var(--brand-500), var(--brand-500));
}

.kb-title-input :deep(.el-input__wrapper.is-focus::after) {
  width: 100%;
}

/* ---- Editor (toolbar + textarea + charcount) ---- */
.kb-content-field {
  margin-bottom: 18px;
}

.kb-editor {
  position: relative;
  width: 100%;
  border: 1px solid var(--border-default);
  border-radius: 10px;
  background: var(--brand-50);
  transition: border-color var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out), background var(--dur-base) var(--ease-out);
}

.kb-editor:hover {
  border-color: var(--border-strong);
}

.kb-editor.focus {
  background: #fff;
  border-color: var(--brand-400);
  box-shadow: 0 0 0 3px var(--brand-50);
}

.kb-editor-toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-subtle);
}

.kb-tool {
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: var(--ink-500);
  cursor: default;
  transition: all var(--dur-fast) var(--ease-out);
}

.kb-tool:hover {
  background: var(--ink-100);
  color: var(--brand-600);
}

.kb-editor.focus .kb-tool {
  color: var(--brand-500);
}

.kb-content-input :deep(.el-textarea__inner) {
  background: transparent;
  border: none;
  box-shadow: none !important;
  padding: 14px 16px 30px;
  font-size: 14px;
  line-height: 1.85;
  color: var(--ink-800);
  min-height: 280px;
}

.kb-content-input :deep(.el-textarea__inner::placeholder) {
  color: var(--ink-400);
  font-size: 14px;
}

.kb-charcount {
  margin-left: 10px;
  font-size: 11px;
  color: var(--ink-400);
  font-variant-numeric: tabular-nums;
  pointer-events: none;
}

/* ---- Meta row ---- */
.kb-meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  background: var(--ink-50);
  border-radius: 10px;
  padding: 14px 16px;
  margin-bottom: 18px;
}

.kb-meta-item {
  margin-bottom: 0;
}

.kb-meta-item :deep(.el-form-item__label) {
  font-size: 11px;
  font-weight: 500;
  color: var(--ink-500);
  padding-bottom: 6px;
  line-height: 1.2;
}

.kb-meta-item :deep(.el-input__wrapper),
.kb-meta-item :deep(.el-select__wrapper) {
  height: 36px;
  background: #fff;
  border-radius: 8px;
}

.kb-meta-item :deep(.el-input__inner::placeholder),
.kb-meta-item :deep(.el-select__placeholder) {
  color: var(--ink-400);
}

.kb-lock-icon {
  color: var(--ink-300);
}

.kb-meta-item :deep(.el-select__caret) {
  color: var(--brand-500);
}

/* ---- Footer ---- */
.kb-foot {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 16px;
  margin-top: 24px;
  padding-top: 18px;
  border-top: 1px solid var(--border-subtle);
}

.kb-status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  color: var(--ink-500);
}

.kb-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--success);
}

.kb-submit {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 200px;
  height: 38px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  letter-spacing: 0.01em;
  background: linear-gradient(135deg, var(--brand-500), var(--brand-700));
  box-shadow: 0 2px 6px rgba(13, 148, 136, 0.25);
  transition: transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out);
}

.kb-submit:hover {
  transform: translateX(-50%) translateY(-1px);
  box-shadow: 0 6px 16px rgba(13, 148, 136, 0.35);
}

.kb-submit .el-icon {
  margin-right: 4px;
}

/* ---- Detail mode ---- */
.kb-detail-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.kb-back {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: none;
  background: transparent;
  color: var(--ink-500);
  font-size: 13px;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 6px;
  transition: all var(--dur-fast) var(--ease-out);
}

.kb-back:hover {
  background: var(--ink-100);
  color: var(--ink-800);
}

.kb-detail-del {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: none;
  background: transparent;
  color: var(--ink-400);
  font-size: 12.5px;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 6px;
  transition: all var(--dur-fast) var(--ease-out);
}

.kb-detail-del:hover {
  background: var(--danger-bg);
  color: var(--danger);
}

.kb-detail-title {
  font-size: 20px;
  font-weight: 650;
  color: var(--ink-950);
  letter-spacing: -0.015em;
  margin-bottom: 12px;
}

.kb-detail-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 22px;
}

.kb-detail-meta-item {
  font-size: 12px;
  color: var(--ink-400);
  font-variant-numeric: tabular-nums;
}

.kb-detail-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: calc(100vh - 360px);
  overflow-y: auto;
  padding-right: 4px;
}

.kb-chunk {
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  padding: 12px 14px;
  background: var(--ink-50);
}

.kb-chunk-hd {
  font-size: 11px;
  font-weight: 600;
  color: var(--ink-400);
  letter-spacing: 0.04em;
  margin-bottom: 6px;
}

.kb-chunk-text {
  font-size: 13px;
  line-height: 1.75;
  color: var(--ink-700);
  word-break: break-word;
  white-space: pre-wrap;
}

.kb-detail-empty,
.kb-detail-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 0;
  font-size: 13px;
  color: var(--ink-400);
}

/* ---- Center empty (manage, no selection) ---- */
.kb-center-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 420px;
}

.kb-center-empty-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: var(--ink-100);
  color: var(--ink-400);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
}

.kb-center-empty-t {
  font-size: 15px;
  font-weight: 600;
  color: var(--ink-800);
  margin-bottom: 5px;
}

.kb-center-empty-d {
  font-size: 13px;
  color: var(--ink-400);
  max-width: 320px;
  line-height: 1.6;
}

/* ======== Right: ask ======== */
.kb-ask {
  padding: 18px 16px;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 190px);
  overflow-y: auto;
}

.kb-ask-title {
  margin-bottom: 14px;
}

.kb-composer {
  border: 1px solid var(--border-default);
  border-radius: 10px;
  padding: 12px 12px 10px;
  background: #fff;
  margin-bottom: 20px;
  transition: border-color var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out);
  flex-shrink: 0;
}

.kb-composer:focus-within {
  border-color: var(--brand-400);
  box-shadow: 0 0 0 3px var(--brand-50), 0 4px 12px rgba(13, 148, 136, 0.08);
}

.kb-composer :deep(.el-textarea__inner) {
  background: transparent;
  border: none;
  box-shadow: none !important;
  padding: 2px;
  font-size: 13.5px;
  line-height: 1.7;
  color: var(--ink-900);
}

.kb-composer :deep(.el-textarea__inner::placeholder) {
  color: var(--ink-400);
}

.kb-composer-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}

.kb-hint {
  font-size: 11px;
  color: var(--ink-300);
}

.kb-send {
  height: 30px;
  padding: 0 14px;
  border-radius: 8px;
  border: none;
  background: var(--brand-600);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
}

.kb-send:hover:not(:disabled) {
  background: linear-gradient(135deg, var(--brand-500), var(--brand-700));
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(13, 148, 136, 0.3);
}

.kb-send:disabled {
  background: var(--ink-100);
  color: var(--ink-300);
  cursor: not-allowed;
}

.kb-send-loading {
  width: 13px;
  height: 13px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  animation: kb-spin 0.8s linear infinite;
}

@keyframes kb-spin {
  to { transform: rotate(360deg); }
}

/* ---- Asking ---- */
.kb-asking {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 22px 4px;
  font-size: 13px;
  color: var(--ink-500);
}

/* ---- Answer ---- */
.kb-answer {
  padding: 2px 2px 0;
}

.kb-answer-text {
  font-size: 13.5px;
  line-height: 1.85;
  color: var(--ink-800);
  word-break: break-word;
}

.kb-answer-text :deep(p) {
  margin: 0 0 10px;
}

.kb-answer-text :deep(p:last-child) {
  margin-bottom: 0;
}

.kb-answer-text :deep(strong) {
  font-weight: 600;
  color: var(--ink-950);
}

.kb-answer-text :deep(ul),
.kb-answer-text :deep(ol) {
  margin: 0 0 10px;
  padding-left: 20px;
}

.kb-answer-text :deep(li) {
  margin-bottom: 4px;
}

.kb-answer-text :deep(blockquote) {
  margin: 0 0 10px;
  padding: 2px 0 2px 12px;
  border-left: 2px solid var(--ink-300);
  color: var(--ink-600);
}

.kb-answer-text :deep(code) {
  font-family: var(--font-mono);
  font-size: 12px;
  background: var(--ink-100);
  border-radius: 4px;
  padding: 1px 5px;
  color: var(--ink-800);
}

.kb-answer-text :deep(pre) {
  margin: 0 0 12px;
  background: var(--ink-900);
  color: #e7e5e4;
  border-radius: 8px;
  padding: 12px 14px;
  overflow-x: auto;
}

.kb-answer-text :deep(pre code) {
  background: transparent;
  padding: 0;
  color: inherit;
}

.kb-answer-text :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 0 0 12px;
  font-size: 12.5px;
}

.kb-answer-text :deep(th),
.kb-answer-text :deep(td) {
  border: 1px solid var(--ink-200);
  padding: 5px 9px;
  text-align: left;
}

.kb-answer-text :deep(th) {
  background: var(--ink-50);
  font-weight: 600;
}

.kb-answer-text :deep(.cite) {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--brand-600);
  margin: 0 1px;
  cursor: default;
}

/* ---- Sources ---- */
.kb-sources {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid var(--border-subtle);
}

.kb-sources-hd {
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-500);
  margin-bottom: 10px;
  letter-spacing: 0.02em;
}

.kb-source {
  display: flex;
  gap: 10px;
  padding: 10px;
  border-radius: 8px;
  transition: background var(--dur-fast) var(--ease-out);
}

.kb-source:hover {
  background: var(--ink-50);
}

.kb-source-index {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--brand-500);
  color: #fff;
  font-size: 10.5px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}

.kb-source-body {
  min-width: 0;
}

.kb-source-title {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink-800);
  margin-bottom: 3px;
}

.kb-source-content {
  font-size: 12px;
  color: var(--ink-500);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ---- Ask empty state ---- */
.kb-ask-empty {
  padding: 4px 2px;
}

.kb-ask-empty-t {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-800);
  margin-bottom: 5px;
}

.kb-ask-empty-d {
  font-size: 12.5px;
  color: var(--ink-400);
  line-height: 1.7;
  margin: 0 0 18px;
}

.kb-suggestions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.kb-suggestion {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle);
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
  color: var(--ink-700);
  font-size: 12.5px;
  user-select: none;
}

.kb-suggestion::before {
  content: '';
  position: absolute;
  left: 0;
  top: 10px;
  bottom: 10px;
  width: 2px;
  border-radius: 2px;
  background: var(--brand-400);
}

.kb-suggestion:hover {
  background: var(--brand-50);
  border-color: var(--brand-100);
  color: var(--brand-700);
}

.kb-suggestion-arrow {
  color: var(--ink-300);
  font-size: 13px;
  transition: transform var(--dur-fast) var(--ease-out);
  flex-shrink: 0;
}

.kb-suggestion:hover .kb-suggestion-arrow {
  color: var(--brand-500);
  transform: translateX(2px);
}

/* ======== Responsive ======== */
@media (max-width: 1200px) {
  .kb-layout {
    grid-template-columns: 1fr;
  }
  .kb-sidebar,
  .kb-ask {
    max-height: none;
  }
}
</style>
