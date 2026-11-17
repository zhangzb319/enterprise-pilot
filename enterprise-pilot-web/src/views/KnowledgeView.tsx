import React, { useEffect, useState } from 'react';
import { BookOpen, FilePlus, Search, Send, Trash2, X } from 'lucide-react';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { useApp } from '../context/AppContext';
import { formatShortDateTime } from '../lib/workspace';
import { enterpriseApi } from '../services/apiClient';
import type { AskResponse, DocumentDetail, DocumentItem } from '../types/domain';

export function KnowledgeView() {
  const { selectedDocumentId, notify } = useApp();
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [activeDoc, setActiveDoc] = useState<DocumentDetail | null>(null);
  const [tab, setTab] = useState<'chunks' | 'ask'>('chunks');
  const [loading, setLoading] = useState(true);

  // RAG Ask state
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [askResult, setAskResult] = useState<AskResponse | null>(null);
  const [askError, setAskError] = useState<string | null>(null);

  // Ingest Modal
  const [showIngest, setShowIngest] = useState(false);
  const [docId, setDocId] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [docCat, setDocCat] = useState('研发规范');
  const [docContent, setDocContent] = useState('');

  const loadList = async (preferDocId?: string | null) => {
    setLoading(true);
    try {
      const [docList, catList] = await Promise.all([
        enterpriseApi.listDocuments(),
        enterpriseApi.listCategories(),
      ]);
      setDocs(docList);
      setCategories(catList);
      const targetId = preferDocId && docList.some((d) => d.document_id === preferDocId) ? preferDocId : docList[0]?.document_id;
      if (targetId) {
        const detail = await enterpriseApi.getDocument(targetId);
        setActiveDoc(detail);
      } else {
        setActiveDoc(null);
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : '加载知识库失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadList(selectedDocumentId);
  }, [selectedDocumentId]);

  const selectDocument = async (id: string) => {
    try {
      setActiveDoc(await enterpriseApi.getDocument(id));
      setTab('chunks');
    } catch (err) {
      notify(err instanceof Error ? err.message : '加载文档详情失败', 'error');
    }
  };

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim() || !docContent.trim()) return;
    const finalId = docId.trim() || `doc-${Date.now()}`;
    try {
      const res = await enterpriseApi.ingestDocument({
        document_id: finalId,
        title: docTitle.trim(),
        category: docCat.trim() || null,
        content: docContent.trim(),
      });
      setShowIngest(false);
      setDocId('');
      setDocTitle('');
      setDocContent('');
      notify(`入库成功，已切分为 ${res.chunk_count} 个向量分块`, 'success');
      await loadList(res.document_id);
    } catch (err) {
      notify(err instanceof Error ? err.message : '文档入库失败', 'error');
    }
  };

  const handleDeleteDoc = async (id: string) => {
    try {
      await enterpriseApi.deleteDocument(id);
      notify('已删除知识库文档', 'info');
      await loadList();
    } catch (err) {
      notify(err instanceof Error ? err.message : '删除失败', 'error');
    }
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setAsking(true);
    setAskError(null);
    try {
      const res = await enterpriseApi.askRag(question.trim(), 4);
      setAskResult(res);
    } catch (err) {
      setAskError(err instanceof Error ? err.message : '知识库检索失败');
    } finally {
      setAsking(false);
    }
  };

  const filteredDocs = docs.filter((d) => {
    if (selectedCategory !== 'all' && d.category !== selectedCategory) return false;
    if (query.trim()) {
      return `${d.title} ${d.category ?? ''} ${d.document_id}`.toLowerCase().includes(query.trim().toLowerCase());
    }
    return true;
  });

  return (
    <div className="mx-auto flex h-full max-w-[1280px] flex-col md:flex-row">
      {/* Left Docs Sidebar */}
      <aside className="w-full md:w-[320px] shrink-0 border-b md:border-b-0 md:border-r border-slate-200/90 bg-white flex flex-col">
        <div className="border-b border-slate-200/90 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-slate-900">文档库 ({docs.length})</h2>
            <button
              type="button"
              onClick={() => setShowIngest(true)}
              className="inline-flex h-8 items-center gap-1 rounded-lg bg-blue-600 px-2.5 text-xs font-medium text-white shadow-xs hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <FilePlus className="h-3.5 w-3.5" />
              文档入库
            </button>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索文档标题或编号…"
              aria-label="搜索知识库文档"
              className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50/80 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                selectedCategory === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              全部
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  selectedCategory === cat ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {loading ? (
            <div className="p-4 space-y-2.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-lg bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">暂无匹配文档</div>
          ) : (
            filteredDocs.map((doc) => {
              const selected = activeDoc?.document_id === doc.document_id;
              return (
                <div
                  key={doc.document_id}
                  className={`flex items-start justify-between gap-2 px-4 py-3 transition-colors ${
                    selected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => void selectDocument(doc.document_id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className={`truncate text-[13px] font-semibold ${selected ? 'text-blue-900' : 'text-slate-900'}`}>
                      {doc.title}
                    </p>
                    <p className="mt-0.5 truncate text-[12px] text-slate-500 font-mono tabular-nums">
                      {doc.category ?? '未分类'} · {doc.chunk_count} 个分块
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteDoc(doc.document_id)}
                    aria-label={`删除文档 ${doc.title}`}
                    className="mt-0.5 rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* Right Content Area */}
      <section className="flex-1 min-w-0 flex flex-col bg-[#F7F8FA]">
        <div className="flex items-center justify-between border-b border-slate-200/90 bg-white px-6 py-3">
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/80 p-0.5">
            <button
              type="button"
              onClick={() => setTab('chunks')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                tab === 'chunks' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              文档切片详情
            </button>
            <button
              type="button"
              onClick={() => setTab('ask')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                tab === 'ask' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              RAG 精准问答
            </button>
          </div>
          {activeDoc && tab === 'chunks' && (
            <span className="hidden sm:inline font-mono text-[11px] text-slate-400 tabular-nums">
              ID: {activeDoc.document_id}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'chunks' ? (
            !activeDoc ? (
              <div className="rounded-xl border border-slate-200/90 bg-white p-8 text-center text-xs text-slate-500">
                请选择左侧文档查看切片内容，或点击「文档入库」上传文本
              </div>
            ) : (
              <div className="max-w-3xl space-y-4">
                <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                  <h3 className="font-display text-base font-semibold text-slate-900">{activeDoc.title}</h3>
                  <p className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
                    分类：{activeDoc.category ?? '未分类'} · 共 {activeDoc.chunks.length} 个切片 · 创建于{' '}
                    {activeDoc.created_at ? formatShortDateTime(activeDoc.created_at) : '-'}
                  </p>
                </div>

                <div className="space-y-3">
                  {activeDoc.chunks.map((chunk) => (
                    <div
                      key={chunk.index}
                      className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.02)]"
                    >
                      <div className="mb-1.5 flex items-center justify-between text-[11px] font-mono text-slate-400 tabular-nums">
                        <span className="font-medium text-blue-600">Chunk #{chunk.index + 1}</span>
                        <span>{chunk.content.length} chars</span>
                      </div>
                      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-700">{chunk.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )
          ) : (
            <div className="max-w-3xl space-y-5">
              <form
                onSubmit={handleAsk}
                className="rounded-xl border border-slate-200/90 bg-white p-4 space-y-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
              >
                <label htmlFor="rag-ask-input" className="block text-xs font-semibold text-slate-900">
                  向知识库提问（直连 Python /api/v1/rag/ask）
                </label>
                <div className="flex gap-2">
                  <input
                    id="rag-ask-input"
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="例如：差旅一线城市住宿标准是多少？"
                    className="h-9 flex-1 rounded-lg border border-slate-200 bg-slate-50/80 px-3 text-sm focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={asking || !question.trim()}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-medium text-white shadow-xs hover:bg-blue-700 disabled:opacity-40 whitespace-nowrap transition-colors"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {asking ? '检索中…' : '检索并回答'}
                  </button>
                </div>
              </form>

              {askError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
                  <p className="font-semibold">检索异常</p>
                  <p className="mt-1">{askError}</p>
                </div>
              )}

              {askResult && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                    <MarkdownRenderer content={askResult.answer} />
                  </div>

                  {askResult.sources.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-slate-500">召回来源切片（{askResult.sources.length}）</p>
                      <div className="space-y-2">
                        {askResult.sources.map((src, i) => (
                          <button
                            key={`${src.document_id}-${i}`}
                            type="button"
                            onClick={() => void selectDocument(src.document_id)}
                            className="block w-full rounded-xl border border-slate-200/90 bg-white p-4 text-left hover:border-blue-300 transition-colors"
                          >
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700">
                              <BookOpen className="h-3.5 w-3.5" />
                              <span>{src.title}</span>
                            </div>
                            <p className="mt-1.5 text-[12px] leading-relaxed text-slate-600">{src.content}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Ingest Modal */}
      {showIngest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px]">
          <div role="dialog" aria-label="知识库文档入库" className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-semibold text-slate-900">上传文档至知识库（800 字自动分块）</h3>
              <button type="button" onClick={() => setShowIngest(false)} aria-label="关闭弹窗" className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleIngest} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="rag-doc-title" className="block text-xs font-medium text-slate-700">文档标题 *</label>
                  <input
                    id="rag-doc-title"
                    required
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    placeholder="如：2026 年假制度"
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="rag-doc-cat" className="block text-xs font-medium text-slate-700">分类</label>
                  <input
                    id="rag-doc-cat"
                    value={docCat}
                    onChange={(e) => setDocCat(e.target.value)}
                    placeholder="如：人事制度"
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="rag-doc-id" className="block text-xs font-medium text-slate-700">文档 ID（选填，留空自动生成）</label>
                <input
                  id="rag-doc-id"
                  value={docId}
                  onChange={(e) => setDocId(e.target.value)}
                  placeholder="如：doc-leave-2026"
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 font-mono text-xs focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="rag-doc-content" className="block text-xs font-medium text-slate-700">正文内容 *</label>
                <textarea
                  id="rag-doc-content"
                  required
                  rows={6}
                  value={docContent}
                  onChange={(e) => setDocContent(e.target.value)}
                  placeholder="粘贴制度全文或研发规范 Markdown/纯文本…"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowIngest(false)} className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  取消
                </button>
                <button type="submit" className="h-9 rounded-lg bg-blue-600 px-4 text-xs font-medium text-white hover:bg-blue-700">
                  向量化入库
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
