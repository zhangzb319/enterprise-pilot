import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { enterpriseApi } from '../services/apiClient';

export function ProfileView() {
  const { user, refreshMe, notify } = useApp();
  const [realName, setRealName] = useState(user?.realName ?? '');
  const [nickname, setNickname] = useState(user?.nickname ?? '');
  const [position, setPosition] = useState(user?.position ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!realName.trim()) return;
    setSavingProfile(true);
    try {
      await enterpriseApi.updateProfile({
        realName: realName.trim(),
        nickname: nickname.trim() || undefined,
        position: position.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });
      await refreshMe();
      notify('个人资料已更新', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : '更新资料失败', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || newPassword.length < 6) {
      notify('请输入原密码和至少 6 位新密码', 'error');
      return;
    }
    setSavingPwd(true);
    try {
      await enterpriseApi.changePassword({ oldPassword, newPassword });
      setOldPassword('');
      setNewPassword('');
      notify('密码修改成功', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : '修改密码失败', 'error');
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-6 space-y-6">
      <section className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-4">
          <div>
            <h2 className="font-display text-base font-semibold text-zinc-900">个人资料</h2>
            <p className="mt-0.5 text-xs text-zinc-500 font-mono tabular-nums">
              工号 {user?.employeeNo} · 部门 {user?.deptName ?? '-'} · 角色 {user?.roleName ?? '普通员工'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="prof-realname" className="block text-xs font-medium text-zinc-700">真实姓名 *</label>
            <input
              id="prof-realname"
              required
              value={realName}
              onChange={(e) => setRealName(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-zinc-200 px-3 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="prof-nickname" className="block text-xs font-medium text-zinc-700">昵称</label>
            <input
              id="prof-nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-zinc-200 px-3 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="prof-position" className="block text-xs font-medium text-zinc-700">职位</label>
            <input
              id="prof-position"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-zinc-200 px-3 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="prof-phone" className="block text-xs font-medium text-zinc-700">手机号</label>
            <input
              id="prof-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-zinc-200 px-3 font-mono text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="prof-email" className="block text-xs font-medium text-zinc-700">企业邮箱</label>
            <input
              id="prof-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-zinc-200 px-3 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2 flex justify-end pt-1">
            <button
              type="submit"
              disabled={savingProfile}
              className="h-9 rounded-md bg-zinc-900 px-4 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {savingProfile ? '保存中…' : '保存资料'}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-6">
        <h3 className="font-display text-base font-semibold text-zinc-900">安全设置 · 修改密码</h3>
        <form onSubmit={handleChangePassword} className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="pwd-old" className="block text-xs font-medium text-zinc-700">当前密码 *</label>
            <input
              id="pwd-old"
              type="password"
              required
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-zinc-200 px-3 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="pwd-new" className="block text-xs font-medium text-zinc-700">新密码（至少 6 位）*</label>
            <input
              id="pwd-new"
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-zinc-200 px-3 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={savingPwd}
              className="h-9 rounded-md border border-zinc-200 bg-white px-4 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
            >
              {savingPwd ? '更新中…' : '更新密码'}
            </button>
          </div>
        </form>
      </section>

    </div>
  );
}
