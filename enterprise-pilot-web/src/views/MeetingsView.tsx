import React, { useEffect, useState } from 'react';
import { ArrowRightCircle, CalendarPlus, Check, CheckCircle2, Copy, FileAudio, FileText, ListTodo, Send, Sparkles, X } from 'lucide-react';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { useApp } from '../context/AppContext';
import { formatShortDateTime, formatTimeOnly, validateAndCheckBookingConflict } from '../lib/workspace';
import { enterpriseApi } from '../services/apiClient';
import type { BookingVO, MeetingRoom, MeetingTodoVO, ProjectVO } from '../types/domain';

function defaultFutureInput(hoursFromNow: number): string {
  const d = new Date(Date.now() + hoursFromNow * 3600 * 1000);
  d.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function RoomTimelineStrip({ bookings, onSelect }: { bookings: BookingVO[]; onSelect: (b: BookingVO) => void }) {
  const startHour = 9;
  const endHour = 19;
  const spanMinutes = (endHour - startHour) * 60;
  const active = bookings.filter((b) => b.status === 1);

  const calcPos = (b: BookingVO) => {
    const s = new Date(b.startTime);
    const e = new Date(b.endTime);
    const sMin = Math.max(0, s.getHours() * 60 + s.getMinutes() - startHour * 60);
    const eMin = Math.min(spanMinutes, e.getHours() * 60 + e.getMinutes() - startHour * 60);
    if (eMin <= sMin) return null;
    return {
      left: `${(sMin / spanMinutes) * 100}%`,
      width: `${Math.max(4, ((eMin - sMin) / spanMinutes) * 100)}%`,
    };
  };

  return (
    <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3.5 space-y-2">
      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 tabular-nums">
        <span>09:00</span>
        <span>11:30</span>
        <span>14:00</span>
        <span>16:30</span>
        <span>19:00</span>
      </div>
      <div className="relative h-7 w-full rounded-md border border-slate-200 bg-white overflow-hidden">
        {active.map((b) => {
          const pos = calcPos(b);
          if (!pos) return null;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => onSelect(b)}
              title={`${b.title} (${formatTimeOnly(b.startTime)}–${formatTimeOnly(b.endTime)})`}
              style={{ left: pos.left, width: pos.width }}
              className="absolute top-0.5 bottom-0.5 rounded bg-blue-50 border border-blue-300 px-1.5 text-left text-[11px] font-medium text-blue-800 truncate hover:bg-blue-100 transition-colors"
            >
              {b.title}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function MeetingsView() {
  const { user, notify, openCopilot } = useApp();
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [roomBookings, setRoomBookings] = useState<BookingVO[]>([]);
  const [myBookings, setMyBookings] = useState<BookingVO[]>([]);
  const [projects, setProjects] = useState<ProjectVO[]>([]);
  const [tab, setTab] = useState<'rooms' | 'my'>('rooms');
  const [loading, setLoading] = useState(true);

  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingRoomId, setBookingRoomId] = useState<number>(1);
  const [bookingTitle, setBookingTitle] = useState('');
  const [startTime, setStartTime] = useState(() => defaultFutureInput(2));
  const [endTime, setEndTime] = useState(() => defaultFutureInput(3));
  const [bookingError, setBookingError] = useState<string | null>(null);

  const [activeBooking, setActiveBooking] = useState<BookingVO | null>(null);
  const [audioUrl, setAudioUrl] = useState('https://internal-cdn.enterprise.local/meetings/arch-review-2026.mp3');
  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState('');
  const [todos, setTodos] = useState<MeetingTodoVO[]>([]);
  const [convertingTodoId, setConvertingTodoId] = useState<number | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [syncProjectId, setSyncProjectId] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [roomList, myList, projList] = await Promise.all([
        enterpriseApi.listAvailableRooms(),
        enterpriseApi.getMyBookings(),
        enterpriseApi.getMyProjects(),
      ]);
      setRooms(roomList);
      setMyBookings(myList);
      setProjects(projList);
      if (projList[0]) setSyncProjectId(String(projList[0].id));
      const firstRoomId = selectedRoomId && roomList.some((r) => r.id === selectedRoomId) ? selectedRoomId : roomList[0]?.id ?? null;
      setSelectedRoomId(firstRoomId);
      if (firstRoomId !== null) {
        setBookingRoomId(firstRoomId);
        setRoomBookings(await enterpriseApi.getRoomBookings(firstRoomId));
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : '加载会议数据失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const handleSelectRoom = async (roomId: number) => {
    setSelectedRoomId(roomId);
    setBookingRoomId(roomId);
    try {
      setRoomBookings(await enterpriseApi.getRoomBookings(roomId));
    } catch (err) {
      notify(err instanceof Error ? err.message : '加载会议室预订失败', 'error');
    }
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError(null);
    if (!bookingTitle.trim()) {
      setBookingError('请填写会议主题');
      return;
    }
    const startIso = startTime.length === 16 ? `${startTime}:00` : startTime;
    const endIso = endTime.length === 16 ? `${endTime}:00` : endTime;

    const currentRoomSchedules = await enterpriseApi.getRoomBookings(bookingRoomId);
    const conflict = validateAndCheckBookingConflict(currentRoomSchedules, bookingRoomId, startIso, endIso);
    if (!conflict.ok) {
      setBookingError(conflict.reason);
      return;
    }

    try {
      await enterpriseApi.createBooking({
        roomId: bookingRoomId,
        title: bookingTitle.trim(),
        startTime: startIso,
        endTime: endIso,
      });
      setShowBookingModal(false);
      setBookingTitle('');
      notify('会议室预订成功', 'success');
      await loadAll();
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : '预订失败');
    }
  };

  const handleCancelBooking = async (booking: BookingVO) => {
    try {
      await enterpriseApi.cancelBooking(booking.id);
      notify('已取消该会议预订', 'info');
      setActiveBooking(null);
      await loadAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : '取消预订失败', 'error');
    }
  };

  const handleTranscribe = async () => {
    if (!audioUrl.trim()) return;
    setTranscribing(true);
    try {
      const res = await enterpriseApi.transcribeMeeting(audioUrl.trim());
      setTranscript(res.transcript);
      notify('音频转写完成', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : '转写失败', 'error');
    } finally {
      setTranscribing(false);
    }
  };

  const handleSummarize = async () => {
    if (!activeBooking || !transcript.trim()) return;
    setSummarizing(true);
    try {
      const res = await enterpriseApi.summarizeMeeting(activeBooking.id, transcript.trim());
      setSummary(res.summary);

      const parsedTodos = (res.action_items ?? []).map((item) => ({
        content: item.content,
        dueDate: item.due_date ?? undefined,
      }));

      // 持久化保存至 Java 数据库
      try {
        const saved = await enterpriseApi.saveMeetingSummary(activeBooking.id, {
          audioUrl: audioUrl.trim(),
          transcriptText: transcript.trim(),
          summaryText: res.summary,
          todos: parsedTodos,
        });
        if (saved?.todos) {
          setTodos(saved.todos);
        }
      } catch {
        // 如果后端保存发生警告，不阻断前端展示
      }

      notify('会议纪要已生成并归档', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : '生成纪要失败', 'error');
    } finally {
      setSummarizing(false);
    }
  };

  const handleConvertTodoToTask = async (todo: MeetingTodoVO) => {
    if (!syncProjectId) {
      notify('请先在下方选择目标关联项目', 'error');
      return;
    }
    setConvertingTodoId(todo.id);
    try {
      await enterpriseApi.convertMeetingTodoToTask(todo.id, Number(syncProjectId), todo.assigneeId ?? undefined);
      setTodos((prev) =>
        prev.map((t) => (t.id === todo.id ? { ...t, status: 1 } : t)),
      );
      notify(`已将待办「${todo.content}」转为项目任务`, 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : '转为任务失败', 'error');
    } finally {
      setConvertingTodoId(null);
    }
  };

  const handleSyncToProject = async () => {
    if (!syncProjectId || !summary.trim() || !activeBooking) return;
    try {
      await enterpriseApi.createDiscussion(Number(syncProjectId), {
        content: `【会议纪要同步 · ${activeBooking.title}】\n\n${summary}`,
        parentId: 0,
      });
      notify('纪要已同步至项目讨论区', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : '同步失败', 'error');
    }
  };

  const handleCopySummary = async () => {
    if (!summary) return;
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const openBookingDetail = async (booking: BookingVO) => {
    setActiveBooking(booking);
    setTranscript('');
    setSummary('');
    setTodos([]);
    setLoadingSummary(true);
    try {
      const saved = await enterpriseApi.getMeetingSummary(booking.id);
      if (saved) {
        if (saved.audioUrl) setAudioUrl(saved.audioUrl);
        if (saved.transcriptText) setTranscript(saved.transcriptText);
        if (saved.summaryText) setSummary(saved.summaryText);
        if (saved.todos) setTodos(saved.todos);
      }
    } catch {
      // 容错: 无纪要时不报错
    } finally {
      setLoadingSummary(false);
    }
  };

  const activeRoom = rooms.find((r) => r.id === selectedRoomId) ?? null;

  return (
    <div className="mx-auto max-w-[1200px] p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-white p-1 w-fit shadow-2xs">
          <button
            type="button"
            onClick={() => setTab('rooms')}
            className={`rounded px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
              tab === 'rooms' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            会议室资源与日程
          </button>
          <button
            type="button"
            onClick={() => setTab('my')}
            className={`rounded px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
              tab === 'my' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            我的预订 ({myBookings.filter((b) => b.status === 1).length})
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            setBookingError(null);
            setShowBookingModal(true);
          }}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-slate-900 px-3.5 text-xs font-medium text-white hover:bg-blue-600 transition-colors whitespace-nowrap w-fit"
        >
          <CalendarPlus className="h-3.5 w-3.5" />
          预订会议室
        </button>
      </div>

      {tab === 'rooms' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="rounded-xl border border-slate-200/90 bg-white divide-y divide-slate-100 shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden">
            <div className="px-4 py-3 text-xs font-semibold text-slate-700 bg-slate-50/70">可用会议室 ({rooms.length})</div>
            {loading ? (
              <div className="p-4 space-y-2.5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 rounded bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : (
              rooms.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => void handleSelectRoom(room.id)}
                  className={`block w-full px-4 py-3.5 text-left transition-colors ${
                    selectedRoomId === room.id ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[13px] font-semibold ${selectedRoomId === room.id ? 'text-blue-700' : 'text-slate-900'}`}>
                      {room.roomName}
                    </span>
                    <span className="font-mono text-[11px] text-slate-500 tabular-nums">{room.capacity} 人</span>
                  </div>
                  <p className="mt-1 text-[12px] text-slate-500">
                    {room.floor ?? '-'} · {room.equipment ?? '标准配置'}
                  </p>
                </button>
              ))
            )}
          </div>

          <div className="lg:col-span-2 rounded-xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden">
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 px-5 py-3.5">
              <div>
                <h3 className="font-display text-sm font-semibold text-slate-900">
                  {activeRoom ? `${activeRoom.roomName} · 占用日程` : '会议室日程'}
                </h3>
                {activeRoom && (
                  <p className="text-[12px] text-slate-500">
                    容纳 {activeRoom.capacity} 人 · {activeRoom.equipment}
                  </p>
                )}
              </div>
              <span className="text-[11px] text-slate-400 whitespace-nowrap shrink-0">点击预订可生成 AI 纪要</span>
            </div>

            {roomBookings.length > 0 && (
              <RoomTimelineStrip bookings={roomBookings} onSelect={openBookingDetail} />
            )}

            {roomBookings.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">该会议室当前暂无预订，全时段空闲</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {roomBookings.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-slate-50/70"
                  >
                    <div className="min-w-0">
                      <p className={`text-[13px] font-medium ${b.status === 0 ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                        {b.title}
                      </p>
                      <p className="mt-0.5 text-[12px] text-slate-500 font-mono tabular-nums">
                        {formatShortDateTime(b.startTime)} – {formatTimeOnly(b.endTime)} · 发起人：{b.organizerName} ·{' '}
                        {b.status === 1 ? '已锁定' : '已取消'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openBookingDetail(b)}
                      className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-blue-300 hover:text-blue-700 whitespace-nowrap shrink-0"
                    >
                      详情与纪要
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-slate-200 bg-slate-50 text-[12px] font-medium text-slate-500">
              <tr>
                <th className="px-5 py-3">会议主题</th>
                <th className="px-5 py-3">会议室</th>
                <th className="px-5 py-3">时段</th>
                <th className="px-5 py-3">状态</th>
                <th className="px-5 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {myBookings.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-3.5 font-medium text-slate-900">{b.title}</td>
                  <td className="px-5 py-3.5 text-slate-600">{b.roomName}</td>
                  <td className="px-5 py-3.5 font-mono text-[12px] text-slate-600 tabular-nums">
                    {formatShortDateTime(b.startTime)} – {formatTimeOnly(b.endTime)}
                  </td>
                  <td className="px-5 py-3.5 text-[12px]">
                    <span className={b.status === 1 ? 'text-emerald-700 font-medium' : 'text-slate-400'}>
                      {b.status === 1 ? '有效' : '已取消'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right whitespace-nowrap space-x-2">
                    <button
                      type="button"
                      onClick={() => openBookingDetail(b)}
                      className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      转写与纪要
                    </button>
                    {b.status === 1 && b.organizerId === user?.id && (
                      <button
                        type="button"
                        onClick={() => void handleCancelBooking(b)}
                        className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                      >
                        取消预订
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
          <div role="dialog" aria-label="预订会议室" className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-semibold text-slate-900">预订会议室</h3>
              <button type="button" onClick={() => setShowBookingModal(false)} aria-label="关闭弹窗" className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            {bookingError && (
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {bookingError}
              </div>
            )}

            <form onSubmit={handleCreateBooking} className="mt-4 space-y-3.5">
              <div>
                <label htmlFor="bk-room" className="block text-xs font-medium text-slate-700">选择会议室 *</label>
                <select
                  id="bk-room"
                  value={bookingRoomId}
                  onChange={(e) => setBookingRoomId(Number(e.target.value))}
                  className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-sm focus:border-blue-600 focus:outline-none"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.roomName}（{r.capacity} 人）
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="bk-title" className="block text-xs font-medium text-slate-700">会议主题 *</label>
                <input
                  id="bk-title"
                  required
                  value={bookingTitle}
                  onChange={(e) => setBookingTitle(e.target.value)}
                  placeholder="如：前端重构周会"
                  className="mt-1 h-9 w-full rounded-md border border-slate-200 px-3 text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="bk-start" className="block text-xs font-medium text-slate-700">开始时间 *</label>
                  <input
                    id="bk-start"
                    type="datetime-local"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="mt-1 h-9 w-full rounded-md border border-slate-200 px-2.5 text-xs font-mono focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="bk-end" className="block text-xs font-medium text-slate-700">结束时间 *</label>
                  <input
                    id="bk-end"
                    type="datetime-local"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="mt-1 h-9 w-full rounded-md border border-slate-200 px-2.5 text-xs font-mono focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowBookingModal(false)} className="h-9 rounded-md border border-slate-200 px-4 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  取消
                </button>
                <button type="submit" className="h-9 rounded-md bg-slate-900 px-4 text-xs font-medium text-white hover:bg-blue-600">
                  确认预订
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeBooking && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30">
          <div role="dialog" aria-label="会议详情与纪要流水线" className="flex h-full w-full max-w-xl flex-col bg-white border-l border-slate-200 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="min-w-0">
                <h3 className="font-display text-sm font-semibold text-slate-900 truncate">{activeBooking.title}</h3>
                <p className="mt-0.5 text-xs text-slate-500 font-mono tabular-nums">
                  {activeBooking.roomName} · {formatShortDateTime(activeBooking.startTime)}–{formatTimeOnly(activeBooking.endTime)}
                </p>
              </div>
              <button type="button" onClick={() => setActiveBooking(null)} aria-label="关闭详情" className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-xs">
                <span className="text-slate-600">
                  发起人：<strong className="text-slate-900">{activeBooking.organizerName}</strong> · 状态：
                  {activeBooking.status === 1 ? '已锁定' : '已取消'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      openCopilot({
                        prompt: `帮我查看会议「${activeBooking.title}」相关的项目任务背景`,
                        context: { view: 'meetings', bookingId: activeBooking.id, bookingTitle: activeBooking.title },
                      })
                    }
                    className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Sparkles className="h-3 w-3 text-blue-600" />
                    问 Copilot
                  </button>
                  {activeBooking.status === 1 && activeBooking.organizerId === user?.id && (
                    <button
                      type="button"
                      onClick={() => void handleCancelBooking(activeBooking)}
                      className="rounded border border-red-200 bg-white px-2.5 py-1 font-medium text-red-700 hover:bg-red-50"
                    >
                      取消预订
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                  <FileAudio className="h-3.5 w-3.5 text-blue-600" />
                  <span>01. 会议录音转写（Python /api/v1/meetings/transcript）</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={audioUrl}
                    onChange={(e) => setAudioUrl(e.target.value)}
                    placeholder="输入会议录音文件 URL…"
                    aria-label="会议录音 URL"
                    className="h-9 flex-1 rounded-md border border-slate-200 px-3 font-mono text-xs text-slate-800 focus:border-blue-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={transcribing || !audioUrl.trim()}
                    onClick={() => void handleTranscribe()}
                    className="h-9 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-40 whitespace-nowrap"
                  >
                    {transcribing ? '转写中…' : '开始转写'}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                    <FileText className="h-3.5 w-3.5 text-blue-600" />
                    <span>02. 会议逐字稿与纪要生成（/api/v1/meetings/summary）</span>
                  </div>
                  <button
                    type="button"
                    disabled={summarizing || !transcript.trim()}
                    onClick={() => void handleSummarize()}
                    className="h-8 rounded-md bg-slate-900 px-3 text-xs font-medium text-white hover:bg-blue-600 disabled:opacity-40 whitespace-nowrap"
                  >
                    {summarizing ? '提炼纪要中…' : '生成结构化纪要'}
                  </button>
                </div>
                <textarea
                  rows={5}
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="点击上方「开始转写」自动填充，或直接粘贴会议逐字稿文本…"
                  className="w-full rounded-md border border-slate-200 bg-slate-50 p-3 text-[13px] leading-relaxed text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-none"
                />
              </div>

              {summary && (
                <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-900">AI 生成纪要结果</span>
                    <button
                      type="button"
                      onClick={() => void handleCopySummary()}
                      className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      {copied ? '已复制' : '复制 Markdown'}
                    </button>
                  </div>

                  <div className="rounded-md border border-slate-200 bg-white p-4">
                    <MarkdownRenderer content={summary} />
                  </div>

                  {todos && todos.length > 0 && (
                    <div className="rounded-md border border-slate-200 bg-white p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                          <ListTodo className="h-4 w-4 text-blue-600" />
                          <span>提取的会议待办事项 ({todos.length})</span>
                        </div>
                        <span className="text-[11px] text-slate-400">可一键转入项目任务</span>
                      </div>

                      <div className="space-y-2">
                        {todos.map((todo) => {
                          const isDone = todo.status === 1;
                          return (
                            <div
                              key={todo.id}
                              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-lg border p-3 text-xs transition-colors ${
                                isDone
                                  ? 'border-emerald-200 bg-emerald-50/50 text-slate-500'
                                  : 'border-slate-200 bg-slate-50/70 text-slate-800'
                              }`}
                            >
                              <div className="flex items-start gap-2 min-w-0">
                                {isDone ? (
                                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600 shrink-0" />
                                ) : (
                                  <div className="mt-1 h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <p className={`font-medium ${isDone ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                                    {todo.content}
                                  </p>
                                  {(todo.assigneeName || todo.dueDate) && (
                                    <p className="mt-0.5 text-[11px] text-slate-500 font-mono">
                                      {todo.assigneeName && `负责人: ${todo.assigneeName} `}
                                      {todo.dueDate && `截止: ${todo.dueDate}`}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="shrink-0 flex items-center gap-2">
                                {isDone ? (
                                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                                    已转为项目任务
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={convertingTodoId === todo.id || !syncProjectId}
                                    onClick={() => void handleConvertTodoToTask(todo)}
                                    className="inline-flex items-center gap-1 rounded bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-600 disabled:opacity-40 transition-colors"
                                  >
                                    <ArrowRightCircle className="h-3 w-3" />
                                    <span>{convertingTodoId === todo.id ? '转入中…' : '转为项目任务'}</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {projects.length > 0 && (
                    <div className="flex items-center gap-2 pt-1">
                      <select
                        aria-label="选择目标同步项目"
                        value={syncProjectId}
                        onChange={(e) => setSyncProjectId(e.target.value)}
                        className="h-8 flex-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-800"
                      >
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            同步至项目讨论：{p.projectName}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => void handleSyncToProject()}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-xs font-medium text-white hover:bg-blue-700 whitespace-nowrap"
                      >
                        <Send className="h-3 w-3" />
                        同步到讨论区
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
