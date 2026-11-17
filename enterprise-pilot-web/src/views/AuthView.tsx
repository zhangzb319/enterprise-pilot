import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Lock, User } from 'lucide-react';
import { BrandMark } from '../components/BrandMark';
import { useApp } from '../context/AppContext';

export function AuthView() {
  const { signIn, signUp } = useApp();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [realName, setRealName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码');
      return;
    }
    setSubmitting(true);
    try {
      await signIn({ username: username.trim(), password });
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || password.length < 6 || !realName.trim()) {
      setError('请完整填写用户名、至少 6 位密码及真实姓名');
      return;
    }
    setSubmitting(true);
    try {
      await signUp({
        username: username.trim(),
        password,
        realName: realName.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });
      setTab('login');
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-between bg-[#F7F8FA] bg-grid-subtle px-4 py-6 md:py-10">
      <header className="mx-auto flex w-full max-w-[1080px] items-center justify-between">
        <div className="flex items-center gap-2.5">
          <BrandMark className="h-7 w-7" />
          <span className="font-display text-base font-bold tracking-tight text-slate-900">Enterprise Pilot</span>
        </div>
      </header>

      <main className="mx-auto my-6 w-full max-w-[1080px]">
        <div className="grid grid-cols-1 lg:grid-cols-12 lg:min-h-[580px] items-stretch overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.07)]">
          {/* Left Architectural Editorial Column */}
          <div className="relative hidden lg:flex lg:col-span-6 flex-col justify-end overflow-hidden bg-slate-900">
            {!imgFailed ? (
              <img
                src="/src/assets/images/auth_workspace_hero_1794906210224.jpg"
                alt="Enterprise Pilot 现代协作空间"
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-blue-950" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-transparent" />
            <div className="relative z-10 p-9 text-white space-y-4">
              <div className="space-y-1.5">
                <p className="font-mono text-[11px] uppercase tracking-wider text-blue-300">
                  Unified Collaboration Cockpit
                </p>
                <h2 className="font-display text-2xl font-semibold leading-snug text-balance">
                  把项目推进、会议纪要与企业知识连接在同一条工作流里
                </h2>
              </div>
              <ul className="space-y-2.5 text-[13px] text-slate-200">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-400" />
                  <span>项目任务与递归讨论树 · 成员级鉴权对齐</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-400" />
                  <span>会议室冲突校验 · 会后 ASR 转写与 AI 纪要</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-400" />
                  <span>全局 Copilot（⌘K）· 6 工具并行调度与知识溯源</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right Sign-in / Register Form */}
          <div className="lg:col-span-6 p-7 sm:p-10 lg:p-12 flex flex-col justify-center">
            <div className="mx-auto w-full max-w-[380px]">
              <div className="space-y-1.5">
                <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900">
                  {tab === 'login' ? '登录企业协同工作台' : '注册新员工账号'}
                </h1>
                <p className="text-[13px] leading-relaxed text-slate-500">
                  请使用企业账号登录，请求将通过开发代理连接本地 Java / Python / Node 服务。
                </p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setTab('login');
                    setError(null);
                  }}
                  className={`rounded-md py-1.5 text-xs font-medium transition-colors ${
                    tab === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  账号登录
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab('register');
                    setError(null);
                  }}
                  className={`rounded-md py-1.5 text-xs font-medium transition-colors ${
                    tab === 'register' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  员工注册
                </button>
              </div>

              {error && (
                <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {error}
                </div>
              )}

              {tab === 'login' ? (
                <form onSubmit={handleLoginSubmit} className="mt-6 space-y-4">
                  <div>
                    <label htmlFor="login-username" className="block text-xs font-medium text-slate-700">
                      用户名
                    </label>
                    <div className="relative mt-1.5">
                      <User className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <input
                        id="login-username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="wangwei 或 admin"
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="login-password" className="block text-xs font-medium text-slate-700">
                      密码
                    </label>
                    <div className="relative mt-1.5">
                      <Lock className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <input
                        id="login-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="请输入密码"
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-blue-600 transition-colors disabled:opacity-50"
                  >
                    <span>{submitting ? '正在登录…' : '进入工作台'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegisterSubmit} className="mt-6 space-y-3.5">
                  <div>
                    <label htmlFor="reg-username" className="block text-xs font-medium text-slate-700">
                      用户名 *
                    </label>
                    <input
                      id="reg-username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="登录账号，如 zhangsan"
                      className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="reg-realname" className="block text-xs font-medium text-slate-700">
                      真实姓名 *
                    </label>
                    <input
                      id="reg-realname"
                      type="text"
                      value={realName}
                      onChange={(e) => setRealName(e.target.value)}
                      placeholder="如：张三"
                      className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="reg-password" className="block text-xs font-medium text-slate-700">
                      密码（至少 6 位）*
                    </label>
                    <input
                      id="reg-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="不少于 6 位字符"
                      className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="reg-phone" className="block text-xs font-medium text-slate-700">
                        手机号
                      </label>
                      <input
                        id="reg-phone"
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="选填"
                        className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="reg-email" className="block text-xs font-medium text-slate-700">
                        企业邮箱
                      </label>
                      <input
                        id="reg-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="选填"
                        className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-blue-600 transition-colors disabled:opacity-50"
                  >
                    {submitting ? '正在提交…' : '完成注册'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="mx-auto flex w-full max-w-[1080px] items-center justify-between text-xs text-slate-400">
        <span>Enterprise Pilot Workspace</span>
      </footer>
    </div>
  );
}
