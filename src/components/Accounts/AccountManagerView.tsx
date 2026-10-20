import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../utils/api';
import { AccountRecord, ProxyRecord } from '../../types';
import { 
  Users, 
  Plus, 
  Trash2, 
  RotateCcw, 
  ShieldCheck, 
  AlertTriangle, 
  Network, 
  Key, 
  Cookie, 
  Lock, 
  CheckCircle2,
  Clock,
  Layers,
  HelpCircle
} from 'lucide-react';

export const AccountManagerView: React.FC = () => {
  const { addToast, t } = useApp();

  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [proxies, setProxies] = useState<ProxyRecord[]>([]);
  const [activeTabSub, setActiveTabSub] = useState<'accounts' | 'proxies'>('accounts');
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [showAddProxyModal, setShowAddProxyModal] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  // Form states for account
  const [accName, setAccName] = useState('');
  const [accProvider, setAccProvider] = useState<'google_flow' | 'veo' | 'grok' | 'gemini_api'>('google_flow');
  const [accAuthType, setAccAuthType] = useState<'cookie_session' | 'bearer_token' | 'api_key'>('cookie_session');
  const [accCredentials, setAccCredentials] = useState('');
  const [accProxyId, setAccProxyId] = useState('');
  const [accNotes, setAccNotes] = useState('');

  // Form states for proxy
  const [proxyHost, setProxyHost] = useState('');
  const [proxyPort, setProxyPort] = useState('8080');
  const [proxyProtocol, setProxyProtocol] = useState<'http' | 'https' | 'socks5'>('http');
  const [proxyUser, setProxyUser] = useState('');
  const [proxyPass, setProxyPass] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [accList, proxyList] = await Promise.all([
        api.getAccounts(),
        api.getProxies()
      ]);
      setAccounts(accList);
      setProxies(proxyList);
    } catch (err) {
      console.warn('Failed to load accounts/proxies:', err);
    }
  };

  const handleTestAccount = async (id: string) => {
    setTestingId(id);
    try {
      const res = await api.testAccount(id);
      if (res.success) {
        addToast('success', res.message);
      } else {
        addToast('warn', res.message);
      }
      await loadData();
    } catch (err: any) {
      addToast('error', err.message);
    } finally {
      setTestingId(null);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    try {
      await api.deleteAccount(id);
      addToast('info', 'Deleted account profile');
      await loadData();
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName.trim() || !accCredentials.trim()) {
      addToast('warn', 'Please provide an account name and credentials / cookie string');
      return;
    }

    try {
      await api.saveAccount({
        name: accName.trim(),
        provider: accProvider,
        auth_type: accAuthType,
        credentials: accCredentials.trim(),
        proxy_id: accProxyId || undefined,
        notes: accNotes
      });
      setShowAddAccountModal(false);
      setAccName('');
      setAccCredentials('');
      setAccNotes('');
      addToast('success', `Saved account profile: ${accName}`);
      await loadData();
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  const handleSaveProxy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proxyHost.trim() || !proxyPort) {
      addToast('warn', 'Please enter proxy host and port');
      return;
    }

    try {
      await api.saveProxy({
        host: proxyHost.trim(),
        port: Number(proxyPort),
        protocol: proxyProtocol,
        username: proxyUser || undefined,
        password: proxyPass || undefined
      });
      setShowAddProxyModal(false);
      setProxyHost('');
      setProxyPort('8080');
      setProxyUser('');
      setProxyPass('');
      addToast('success', `Added proxy ${proxyHost}:${proxyPort}`);
      await loadData();
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  const handleDeleteProxy = async (id: string) => {
    try {
      await api.deleteProxy(id);
      addToast('info', 'Deleted proxy');
      await loadData();
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
            Reverse-Engineered Module · Session & Identity Hub
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">
            {t('nav.accounts')}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Quản lý tài khoản Google Flow/Veo, Grok Imagine, Cookies/Session, Bearer Token và danh sách Proxy luân phiên.
          </p>
        </div>

        {/* Tab switch & Add buttons */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs">
            <button
              onClick={() => setActiveTabSub('accounts')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTabSub === 'accounts'
                  ? 'bg-slate-800 text-cyan-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tài Khoản AI ({accounts.length})
            </button>
            <button
              onClick={() => setActiveTabSub('proxies')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTabSub === 'proxies'
                  ? 'bg-slate-800 text-cyan-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Proxy IP ({proxies.length})
            </button>
          </div>

          {activeTabSub === 'accounts' ? (
            <button
              onClick={() => setShowAddAccountModal(true)}
              className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm Tài Khoản</span>
            </button>
          ) : (
            <button
              onClick={() => setShowAddProxyModal(true)}
              className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm Proxy</span>
            </button>
          )}
        </div>
      </div>

      {/* Info Callout explaining Tool Gốc vs Clone */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800/80 flex items-start gap-3 text-xs leading-relaxed">
        <HelpCircle className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-slate-300">
          <p className="font-semibold text-slate-200">
            Cơ chế xác thực trong DgtAutoGenerateVideoAI gốc:
          </p>
          <p className="text-slate-400">
            Tool gốc v1.5.4 không sử dụng API trả phí chính thức mà trích xuất <strong>Cookies, Session Token, Bearer Token</strong> từ trình duyệt người dùng để gọi vào các backend nội bộ của Google Flow/Veo và Grok Imagine, kết hợp với xoay vòng Proxy để tránh bị giới hạn tốc độ (Rate Limit). Bạn có thể thêm hồ sơ tài khoản và gán Proxy tương ứng bên dưới.
          </p>
        </div>
      </div>

      {activeTabSub === 'accounts' ? (
        /* Accounts Table */
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800 font-mono text-[11px]">
                <tr>
                  <th className="py-3 px-4">Tên Tài Khoản</th>
                  <th className="py-3 px-4">Dịch Vụ AI</th>
                  <th className="py-3 px-4">Loại Xác Thực</th>
                  <th className="py-3 px-4">Trạng Thái Session</th>
                  <th className="py-3 px-4">Proxy Gán Kèm</th>
                  <th className="py-3 px-4">Kiểm Tra Gần Nhất</th>
                  <th className="py-3 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {accounts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-slate-500">
                      Chưa có tài khoản nào được lưu. Bấm "Thêm Tài Khoản" để nhập Cookie hoặc Bearer Token.
                    </td>
                  </tr>
                ) : (
                  accounts.map((acc) => {
                    let statusBadge = (
                      <span className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Hoạt động</span>
                      </span>
                    );

                    if (acc.status === 'expired' || acc.status === 'relogin_needed') {
                      statusBadge = (
                        <span className="flex items-center gap-1.5 font-mono text-[11px] text-amber-400">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Hết hạn / Cần đăng nhập lại</span>
                        </span>
                      );
                    } else if (acc.status === 'rate_limited') {
                      statusBadge = (
                        <span className="flex items-center gap-1.5 font-mono text-[11px] text-rose-400">
                          <span>Bị giới hạn (Rate Limit)</span>
                        </span>
                      );
                    }

                    const boundProxy = proxies.find((p) => p.id === acc.proxy_id);

                    return (
                      <tr key={acc.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-200">{acc.name}</div>
                          {acc.notes && <div className="text-[10px] text-slate-500">{acc.notes}</div>}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-cyan-300 uppercase">
                          {acc.provider.replace('_', ' ')}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-300">
                            {acc.auth_type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4">{statusBadge}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                          {boundProxy ? `${boundProxy.host}:${boundProxy.port}` : 'Direct IP'}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                          {acc.last_checked_at ? new Date(acc.last_checked_at).toLocaleTimeString() : 'Chưa test'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleTestAccount(acc.id)}
                              disabled={testingId === acc.id}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 font-medium text-[11px] transition-colors flex items-center gap-1"
                              title="Kiểm tra token còn hạn không"
                            >
                              <RotateCcw className={`w-3 h-3 ${testingId === acc.id ? 'animate-spin' : ''}`} />
                              <span>Kiểm tra</span>
                            </button>
                            <button
                              onClick={() => handleDeleteAccount(acc.id)}
                              className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800"
                              title="Xóa tài khoản"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Proxies Table */
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800 font-mono text-[11px]">
                <tr>
                  <th className="py-3 px-4">Giao Thức</th>
                  <th className="py-3 px-4">Địa Chỉ Host : Port</th>
                  <th className="py-3 px-4">Tài Khoản / Mật Khẩu</th>
                  <th className="py-3 px-4">Trạng Thái Kết Nối</th>
                  <th className="py-3 px-4">Độ Trễ</th>
                  <th className="py-3 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {proxies.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-slate-500">
                      Chưa có Proxy nào. Thêm Proxy để hỗ trợ chạy hàng loạt không bị block IP.
                    </td>
                  </tr>
                ) : (
                  proxies.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] uppercase text-cyan-400">
                        {p.protocol}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-200">
                        {p.host}:{p.port}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {p.username ? `${p.username} / ••••••` : 'None'}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-emerald-400">
                        ONLINE
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {p.latency_ms || 80}ms
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteProxy(p.id)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Account Modal */}
      {showAddAccountModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-semibold text-sm text-slate-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>Thêm Hồ Sơ Tài Khoản AI</span>
              </h3>
              <button
                onClick={() => setShowAddAccountModal(false)}
                className="text-slate-400 hover:text-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Tên Tài Khoản / Profile</label>
                <input
                  type="text"
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  placeholder="Ví dụ: Google Flow Account #1 (Veo 3.1)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Nhà Cung Cấp</label>
                  <select
                    value={accProvider}
                    onChange={(e) => setAccProvider(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="google_flow">Google Flow / Veo 3.1</option>
                    <option value="grok">xAI Grok Imagine</option>
                    <option value="gemini_api">Google Gemini Studio API</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Loại Xác Thực</label>
                  <select
                    value={accAuthType}
                    onChange={(e) => setAccAuthType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="cookie_session">Cookie / Web Session</option>
                    <option value="bearer_token">Bearer Token (Header)</option>
                    <option value="api_key">API Key</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">
                  Chuỗi Token / Cookie Xác Thực
                </label>
                <textarea
                  value={accCredentials}
                  onChange={(e) => setAccCredentials(e.target.value)}
                  placeholder="Dán chuỗi Cookie hoặc Bearer Token trích xuất từ trình duyệt..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Proxy Đi Kèm (Tùy chọn)</label>
                <select
                  value={accProxyId}
                  onChange={(e) => setAccProxyId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Không dùng proxy (Direct IP)</option>
                  {proxies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.protocol.toUpperCase()} - {p.host}:{p.port}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddAccountModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded shadow"
                >
                  Lưu Tài Khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Proxy Modal */}
      {showAddProxyModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-semibold text-sm text-slate-100 flex items-center gap-2">
                <Network className="w-4 h-4 text-cyan-400" />
                <span>Thêm Proxy Mới</span>
              </h3>
              <button
                onClick={() => setShowAddProxyModal(false)}
                className="text-slate-400 hover:text-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProxy} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1">
                  <label className="text-slate-300 font-medium">Host / IP</label>
                  <input
                    type="text"
                    value={proxyHost}
                    onChange={(e) => setProxyHost(e.target.value)}
                    placeholder="127.0.0.1 hoặc proxy.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Port</label>
                  <input
                    type="number"
                    value={proxyPort}
                    onChange={(e) => setProxyPort(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Giao Thức</label>
                <select
                  value={proxyProtocol}
                  onChange={(e) => setProxyProtocol(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                >
                  <option value="http">HTTP</option>
                  <option value="https">HTTPS</option>
                  <option value="socks5">SOCKS5</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Username (Tùy chọn)</label>
                  <input
                    type="text"
                    value={proxyUser}
                    onChange={(e) => setProxyUser(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Password (Tùy chọn)</label>
                  <input
                    type="password"
                    value={proxyPass}
                    onChange={(e) => setProxyPass(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddProxyModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded shadow"
                >
                  Lưu Proxy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
