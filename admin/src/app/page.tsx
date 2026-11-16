'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://tailorbook-backend-4g7r.onrender.com/api';

interface Tenant {
  id: string;
  name: string;
  username: string;
  status: 'active' | 'suspended';
  max_devices: number;
  active_devices: string | number;
  total_devices: string | number;
  created_at: string;
}

interface Device {
  id: string;
  device_identifier: string;
  device_name: string;
  status: 'active' | 'revoked';
  activated_at: string;
  last_seen_at: string;
}

interface AuditLog {
  id: string;
  actor_id: string;
  tenant_name?: string;
  action: string;
  metadata: any;
  created_at: string;
}

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('TailorBook@Admin2026');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'shops' | 'devices' | 'audits'>('shops');

  // Dashboard Data
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Search Filters
  const [shopSearch, setShopSearch] = useState('');
  const [deviceSearch, setDeviceSearch] = useState('');
  const [auditSearch, setAuditSearch] = useState('');

  // New Shop Modal
  const [showCreateShop, setShowCreateShop] = useState(false);
  const [newShopName, setNewShopName] = useState('');
  const [newShopUser, setNewShopUser] = useState('');
  const [newShopPass, setNewShopPass] = useState('');
  const [newShopLimit, setNewShopLimit] = useState(5);
  const [showNewShopPass, setShowNewShopPass] = useState(false);
  const [createError, setCreateError] = useState('');
  const [isCreatingShop, setIsCreatingShop] = useState(false);

  // Auto clear notification banner after 4 seconds
  useEffect(() => {
    if (actionNotice) {
      const t = setTimeout(() => setActionNotice(null), 4000);
      return () => clearTimeout(t);
    }
  }, [actionNotice]);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.message || 'Login failed. Check your admin credentials.');
        return;
      }
      setToken(data.token);
    } catch (err: any) {
      setLoginError(`Cannot reach backend (${API_BASE}): ${err.message}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const loadTenants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/tenants`);
      if (res.ok) {
        const data = await res.json();
        setTenants(data);
        if (data.length > 0 && !selectedTenant) {
          setSelectedTenant(data[0]);
        }
      }
    } catch (err) {
      console.warn('Failed to load tenants:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedTenant]);

  const loadDevices = useCallback(async (tenantId: string) => {
    try {
      const res = await fetch(`${API_BASE}/admin/tenants/${tenantId}/devices`);
      if (res.ok) {
        const data = await res.json();
        setDevices(data);
      }
    } catch (err) {
      console.warn('Failed to load devices:', err);
    }
  }, []);

  const loadAudits = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/audit-logs?limit=100`);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (err) {
      console.warn('Failed to load audit logs:', err);
    }
  }, []);

  useEffect(() => {
    if (token) {
      loadTenants();
      loadAudits();
    }
  }, [token, loadTenants, loadAudits]);

  useEffect(() => {
    if (selectedTenant) {
      loadDevices(selectedTenant.id);
    }
  }, [selectedTenant, loadDevices]);

  // Create Shop
  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setIsCreatingShop(true);
    try {
      const res = await fetch(`${API_BASE}/admin/tenants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newShopName.trim(),
          username: newShopUser.trim().toLowerCase(),
          password: newShopPass.trim(),
          max_devices: newShopLimit,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.message || 'Error creating shop');
        return;
      }
      setShowCreateShop(false);
      setNewShopName('');
      setNewShopUser('');
      setNewShopPass('');
      setActionNotice(`Shop "${data.name}" created successfully!`);
      loadTenants();
      loadAudits();
    } catch (err: any) {
      setCreateError(err.message || 'Network error');
    } finally {
      setIsCreatingShop(false);
    }
  };

  // Update Shop Status / Device Limit
  const handleUpdateTenant = async (id: string, updates: Partial<Tenant>, shopName?: string) => {
    try {
      await fetch(`${API_BASE}/admin/tenants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (updates.status) {
        setActionNotice(`Shop status updated to ${updates.status.toUpperCase()}`);
      } else if (updates.max_devices) {
        setActionNotice(`Device limit updated to ${updates.max_devices} devices`);
      }
      loadTenants();
      loadAudits();
    } catch (err) {
      console.warn('Update failed:', err);
    }
  };

  // Device Approve / Revoke
  const handleDeviceStatus = async (deviceId: string, action: 'approve' | 'revoke') => {
    try {
      await fetch(`${API_BASE}/admin/devices/${deviceId}/${action}`, {
        method: 'PATCH',
      });
      setActionNotice(`Device ${action === 'approve' ? 'approved' : 'revoked'} successfully!`);
      if (selectedTenant) {
        loadDevices(selectedTenant.id);
      }
      loadTenants();
      loadAudits();
    } catch (err) {
      console.warn('Device action failed:', err);
    }
  };

  // Filtered Lists
  const filteredTenants = useMemo(() => {
    if (!shopSearch.trim()) return tenants;
    const q = shopSearch.toLowerCase();
    return tenants.filter(
      (t) => t.name.toLowerCase().includes(q) || (t.username && t.username.toLowerCase().includes(q))
    );
  }, [tenants, shopSearch]);

  const filteredDevices = useMemo(() => {
    if (!deviceSearch.trim()) return devices;
    const q = deviceSearch.toLowerCase();
    return devices.filter(
      (d) =>
        d.device_identifier.toLowerCase().includes(q) ||
        (d.device_name && d.device_name.toLowerCase().includes(q))
    );
  }, [devices, deviceSearch]);

  const filteredAudits = useMemo(() => {
    if (!auditSearch.trim()) return auditLogs;
    const q = auditSearch.toLowerCase();
    return auditLogs.filter(
      (a) =>
        a.action.toLowerCase().includes(q) ||
        a.actor_id.toLowerCase().includes(q) ||
        (a.tenant_name && a.tenant_name.toLowerCase().includes(q))
    );
  }, [auditLogs, auditSearch]);

  // KPI Calculations
  const stats = useMemo(() => {
    const totalShops = tenants.length;
    const activeShops = tenants.filter((t) => t.status === 'active').length;
    const totalActiveDevices = tenants.reduce((acc, t) => acc + (Number(t.active_devices) || 0), 0);
    const totalLimit = tenants.reduce((acc, t) => acc + (Number(t.max_devices) || 0), 0);
    return { totalShops, activeShops, totalActiveDevices, totalLimit };
  }, [tenants]);

  // ----------------------------------------------------
  // LOGIN SCREEN
  // ----------------------------------------------------
  if (!token) {
    return (
      <main style={styles.loginContainer}>
        <div style={styles.loginCard}>
          <div style={styles.loginHeader}>
            <div style={styles.brandIconWrapper}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="6" cy="6" r="3"/>
                <circle cx="6" cy="18" r="3"/>
                <line x1="20" y1="4" x2="8.12" y2="15.88"/>
                <line x1="14.47" y1="14.48" x2="20" y2="20"/>
                <line x1="8.12" y1="8.12" x2="12" y2="12"/>
              </svg>
            </div>
            <h1 style={styles.loginTitle}>TailorBook Admin</h1>
            <p style={styles.loginSubtitle}>Centralized Tenant Management & Device Licensing Portal</p>
          </div>

          <div style={styles.serverPill}>
            <span style={styles.serverPillDot} />
            <span style={styles.serverPillText}>Live Backend: Render Cloud</span>
          </div>

          {loginError && (
            <div style={styles.errorBox}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" style={{ marginRight: 8, flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Administrator Username</label>
              <input
                type="text"
                style={styles.input}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                required
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Password</label>
              <div style={styles.passwordWrapper}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  style={styles.passwordInput}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter administrator password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <button type="submit" style={styles.submitBtn} disabled={isLoggingIn}>
              {isLoggingIn ? 'Verifying Credentials...' : 'Sign In to Management Portal'}
            </button>
          </form>

          <div style={styles.loginFooter}>
            TailorBook SaaS Platform · Powered by NestJS & Supabase
          </div>
        </div>
      </main>
    );
  }

  // ----------------------------------------------------
  // AUTHENTICATED DASHBOARD
  // ----------------------------------------------------
  return (
    <div style={styles.dashboard}>
      {/* Top Navbar */}
      <header style={styles.navbar}>
        <div style={styles.navBrand}>
          <div style={styles.brandIconSmall}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth="2.2">
              <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
              <line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/>
              <line x1="8.12" y1="8.12" x2="12" y2="12"/>
            </svg>
          </div>
          <div>
            <span style={styles.logoText}>TailorBook</span>
            <span style={styles.roleTag}>Super Admin</span>
          </div>
        </div>

        <div style={styles.navCenter}>
          <div style={styles.statusPill}>
            <span style={styles.statusDot} />
            <span style={styles.statusPillLabel}>Backend Online (Render Cloud)</span>
          </div>
        </div>

        <div style={styles.navActions}>
          <div style={styles.adminAvatar}>A</div>
          <span style={styles.adminUserText}>admin</span>
          <button onClick={() => setToken(null)} style={styles.logoutBtn}>
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div style={styles.contentWrap}>
        {/* Toast / Notification Banner */}
        {actionNotice && (
          <div style={styles.actionNotice}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" style={{ marginRight: 8 }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Metric Summary Cards (KPIs) */}
        <div style={styles.metricsGrid}>
          <div style={styles.metricCard}>
            <div style={styles.metricLabel}>Total Registered Shops</div>
            <div style={styles.metricValueRow}>
              <span style={styles.metricNumber}>{stats.totalShops}</span>
              <span style={styles.metricBadgeSuccess}>{stats.activeShops} Active</span>
            </div>
            <div style={styles.metricHint}>Tailoring businesses enrolled</div>
          </div>

          <div style={styles.metricCard}>
            <div style={styles.metricLabel}>Authorized Devices</div>
            <div style={styles.metricValueRow}>
              <span style={styles.metricNumber}>{stats.totalActiveDevices}</span>
              <span style={styles.metricBadgeMuted}>of {stats.totalLimit} slots</span>
            </div>
            <div style={styles.metricHint}>Active mobile installations</div>
          </div>

          <div style={styles.metricCard}>
            <div style={styles.metricLabel}>Security Audits</div>
            <div style={styles.metricValueRow}>
              <span style={styles.metricNumber}>{auditLogs.length}</span>
              <span style={styles.metricBadgeInfo}>Immutable</span>
            </div>
            <div style={styles.metricHint}>Recorded licensing events</div>
          </div>

          <div style={styles.metricCard}>
            <div style={styles.metricLabel}>Offline Architecture</div>
            <div style={styles.metricValueRow}>
              <span style={styles.metricHighlight}>100% Private</span>
            </div>
            <div style={styles.metricHint}>Customer bills stored on device</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={styles.tabContainer}>
          <div style={styles.tabBar}>
            <button
              style={activeTab === 'shops' ? styles.tabActive : styles.tab}
              onClick={() => setActiveTab('shops')}
            >
              Tailoring Shops ({tenants.length})
            </button>
            <button
              style={activeTab === 'devices' ? styles.tabActive : styles.tab}
              onClick={() => setActiveTab('devices')}
            >
              Device Management {selectedTenant ? `(${selectedTenant.name})` : ''}
            </button>
            <button
              style={activeTab === 'audits' ? styles.tabActive : styles.tab}
              onClick={() => setActiveTab('audits')}
            >
              Audit Logs ({auditLogs.length})
            </button>
          </div>
        </div>

        {/* ==================================================== */}
        {/* TAB 1: SHOPS */}
        {/* ==================================================== */}
        {activeTab === 'shops' && (
          <div>
            <div style={styles.toolbarRow}>
              <div style={styles.searchBox}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" style={{ marginRight: 10 }}>
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  placeholder="Filter shops by name or username..."
                  style={styles.searchInput}
                  value={shopSearch}
                  onChange={(e) => setShopSearch(e.target.value)}
                />
                {shopSearch && (
                  <button onClick={() => setShopSearch('')} style={styles.clearSearchBtn}>✕</button>
                )}
              </div>

              <button onClick={() => setShowCreateShop(true)} style={styles.primaryActionBtn}>
                ＋ Register New Shop
              </button>
            </div>

            {/* Create Shop Modal */}
            {showCreateShop && (
              <div style={styles.modalOverlay}>
                <div style={styles.modalCard}>
                  <div style={styles.modalHeaderRow}>
                    <h3 style={styles.modalTitle}>Register New Tailoring Shop</h3>
                    <button onClick={() => setShowCreateShop(false)} style={styles.closeModalBtn}>✕</button>
                  </div>
                  <p style={styles.modalSub}>
                    Create credentials for a shop tailor. They will use this shop username and password to activate their Android mobile app.
                  </p>

                  {createError && <div style={styles.errorBox}>{createError}</div>}

                  <form onSubmit={handleCreateShop} style={styles.form}>
                    <div style={styles.field}>
                      <label style={styles.label}>Shop Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Master Crown Tailors"
                        style={styles.input}
                        value={newShopName}
                        onChange={(e) => setNewShopName(e.target.value)}
                        required
                      />
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>Shop Username (for app activation) *</label>
                      <input
                        type="text"
                        placeholder="e.g. crowntailors"
                        style={styles.input}
                        value={newShopUser}
                        onChange={(e) => setNewShopUser(e.target.value)}
                        required
                      />
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>Shop Password *</label>
                      <div style={styles.passwordWrapper}>
                        <input
                          type={showNewShopPass ? 'text' : 'password'}
                          placeholder="Create strong shop password"
                          style={styles.passwordInput}
                          value={newShopPass}
                          onChange={(e) => setNewShopPass(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewShopPass(!showNewShopPass)}
                          style={styles.eyeBtn}
                        >
                          {showNewShopPass ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>Max Authorized Devices Limit</label>
                      <select
                        style={styles.input}
                        value={newShopLimit}
                        onChange={(e) => setNewShopLimit(parseInt(e.target.value, 10))}
                      >
                        <option value={1}>1 Device (Single Phone)</option>
                        <option value={2}>2 Devices</option>
                        <option value={3}>3 Devices</option>
                        <option value={5}>5 Devices (Standard Shop)</option>
                        <option value={10}>10 Devices (Multi-tailor branch)</option>
                        <option value={20}>20 Devices (High Volume / Multi-Store)</option>
                      </select>
                    </div>

                    <div style={styles.modalActions}>
                      <button
                        type="button"
                        onClick={() => setShowCreateShop(false)}
                        style={styles.cancelBtn}
                      >
                        Cancel
                      </button>
                      <button type="submit" style={styles.submitBtn} disabled={isCreatingShop}>
                        {isCreatingShop ? 'Creating Shop...' : 'Create & Register Shop'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Shops Table */}
            <div style={styles.tableCard}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeadRow}>
                    <th style={styles.th}>Tailoring Shop Name</th>
                    <th style={styles.th}>Username</th>
                    <th style={styles.th}>Account Status</th>
                    <th style={styles.th}>Device Slots</th>
                    <th style={styles.th}>Active Devices</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTenants.map((t) => (
                    <tr key={t.id} style={styles.tableRow}>
                      <td style={styles.td}>
                        <div style={styles.shopNameCell}>
                          <div style={styles.shopAvatar}>🏪</div>
                          <div>
                            <div style={styles.shopTitleText}>{t.name}</div>
                            <div style={styles.shopCreatedText}>Registered {new Date(t.created_at).toLocaleDateString()}</div>
                          </div>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.codeBadge}>@{t.username || '—'}</span>
                      </td>
                      <td style={styles.td}>
                        <span
                          style={
                            t.status === 'active' ? styles.statusBadgeActive : styles.statusBadgeSuspended
                          }
                        >
                          <span style={t.status === 'active' ? styles.dotGreen : styles.dotRed} />
                          {t.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <select
                          style={styles.inlineSelect}
                          value={t.max_devices}
                          onChange={(e) =>
                            handleUpdateTenant(t.id, { max_devices: parseInt(e.target.value, 10) }, t.name)
                          }
                        >
                          <option value={1}>1 Device</option>
                          <option value={2}>2 Devices</option>
                          <option value={3}>3 Devices</option>
                          <option value={5}>5 Devices</option>
                          <option value={10}>10 Devices</option>
                          <option value={20}>20 Devices</option>
                        </select>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.deviceUsageCell}>
                          <span style={styles.deviceUsageText}>
                            {t.active_devices || 0} / {t.max_devices}
                          </span>
                          <div style={styles.usageBarTrack}>
                            <div
                              style={{
                                ...styles.usageBarFill,
                                width: `${Math.min(100, ((Number(t.active_devices) || 0) / t.max_devices) * 100)}%`,
                                backgroundColor:
                                  (Number(t.active_devices) || 0) >= t.max_devices ? '#EF4444' : '#10B981',
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => {
                              setSelectedTenant(t);
                              setActiveTab('devices');
                            }}
                            style={styles.tableBtnSecondary}
                            title="Inspect connected phones"
                          >
                            📱 Devices ({t.total_devices || 0})
                          </button>
                          <button
                            onClick={() =>
                              handleUpdateTenant(
                                t.id,
                                { status: t.status === 'active' ? 'suspended' : 'active' },
                                t.name
                              )
                            }
                            style={t.status === 'active' ? styles.tableBtnDanger : styles.tableBtnSuccess}
                          >
                            {t.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredTenants.length === 0 && (
                    <tr>
                      <td colSpan={6} style={styles.emptyTableState}>
                        {shopSearch ? 'No shops match your search filter.' : 'No shops registered yet. Click "Register New Shop" to get started.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 2: DEVICES */}
        {/* ==================================================== */}
        {activeTab === 'devices' && (
          <div>
            <div style={styles.toolbarRow}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flex: 1 }}>
                <div style={styles.selectLabelGroup}>
                  <label style={styles.inlineLabel}>Select Shop:</label>
                  <select
                    style={styles.shopSelector}
                    value={selectedTenant?.id || ''}
                    onChange={(e) => {
                      const found = tenants.find((t) => t.id === e.target.value);
                      if (found) setSelectedTenant(found);
                    }}
                  >
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (@{t.username})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.searchBoxSmall}>
                  <input
                    type="text"
                    placeholder="Search device ID or model..."
                    style={styles.searchInput}
                    value={deviceSearch}
                    onChange={(e) => setDeviceSearch(e.target.value)}
                  />
                  {deviceSearch && (
                    <button onClick={() => setDeviceSearch('')} style={styles.clearSearchBtn}>✕</button>
                  )}
                </div>
              </div>
            </div>

            <div style={styles.tableCard}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeadRow}>
                    <th style={styles.th}>Device Identifier (Hardware UUID)</th>
                    <th style={styles.th}>Device Model</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>First Activated</th>
                    <th style={styles.th}>Last Seen</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Authorization Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDevices.map((d) => (
                    <tr key={d.id} style={styles.tableRow}>
                      <td style={styles.td}>
                        <code style={styles.uuidText}>{d.device_identifier}</code>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.deviceModelText}>{d.device_name || 'Android Device'}</span>
                      </td>
                      <td style={styles.td}>
                        <span
                          style={
                            d.status === 'active' ? styles.statusBadgeActive : styles.statusBadgeSuspended
                          }
                        >
                          <span style={d.status === 'active' ? styles.dotGreen : styles.dotRed} />
                          {d.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.dateText}>{new Date(d.activated_at).toLocaleDateString()}</span>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.dateText}>{new Date(d.last_seen_at).toLocaleString()}</span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right' }}>
                        {d.status === 'active' ? (
                          <button
                            onClick={() => handleDeviceStatus(d.id, 'revoke')}
                            style={styles.tableBtnDanger}
                          >
                            Revoke Device
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDeviceStatus(d.id, 'approve')}
                            style={styles.tableBtnSuccess}
                          >
                            Re-Approve Device
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredDevices.length === 0 && (
                    <tr>
                      <td colSpan={6} style={styles.emptyTableState}>
                        {selectedTenant
                          ? 'No devices registered for this shop yet. Launch the mobile app and activate it to register a phone.'
                          : 'Select a shop from the dropdown to inspect its devices.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 3: AUDITS */}
        {/* ==================================================== */}
        {activeTab === 'audits' && (
          <div>
            <div style={styles.toolbarRow}>
              <div style={styles.searchBox}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" style={{ marginRight: 10 }}>
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  placeholder="Filter audit events by action, actor, or shop..."
                  style={styles.searchInput}
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                />
                {auditSearch && (
                  <button onClick={() => setAuditSearch('')} style={styles.clearSearchBtn}>✕</button>
                )}
              </div>
            </div>

            <div style={styles.tableCard}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeadRow}>
                    <th style={styles.th}>Timestamp</th>
                    <th style={styles.th}>Actor</th>
                    <th style={styles.th}>Shop</th>
                    <th style={styles.th}>Action</th>
                    <th style={styles.th}>Metadata</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAudits.map((a) => (
                    <tr key={a.id} style={styles.tableRow}>
                      <td style={styles.td}>
                        <span style={styles.dateText}>{new Date(a.created_at).toLocaleString()}</span>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.actorBadge}>{a.actor_id}</span>
                      </td>
                      <td style={styles.td}>
                        <b>{a.tenant_name || '—'}</b>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.actionCodeBadge}>{a.action}</span>
                      </td>
                      <td style={styles.td}>
                        <pre style={styles.metaPre}>
                          {JSON.stringify(a.metadata, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  ))}
                  {filteredAudits.length === 0 && (
                    <tr>
                      <td colSpan={5} style={styles.emptyTableState}>
                        No audit events recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------
// PRODUCTION CSS STYLES
// ----------------------------------------------------
const styles: Record<string, React.CSSProperties> = {
  loginContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    backgroundImage: 'radial-gradient(ellipse at top, #1E293B 0%, #0F172A 100%)',
    padding: '24px',
  },
  loginCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '20px',
    padding: '40px',
    width: '100%',
    maxWidth: '440px',
    boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.08)',
  },
  loginHeader: {
    textAlign: 'center',
    marginBottom: '20px',
  },
  brandIconWrapper: {
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    backgroundColor: '#0F2744',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '14px',
    boxShadow: '0 8px 16px -4px rgba(15, 39, 68, 0.4)',
  },
  loginTitle: {
    fontSize: '24px',
    fontWeight: 800,
    color: '#0F2744',
    letterSpacing: '-0.3px',
    marginBottom: '6px',
  },
  loginSubtitle: {
    fontSize: '13px',
    color: '#64748B',
    lineHeight: 1.5,
  },
  serverPill: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    backgroundColor: '#F1F5F9',
    borderRadius: '20px',
    padding: '6px 12px',
    marginBottom: '20px',
  },
  serverPillDot: {
    width: '8px',
    height: '8px',
    borderRadius: '4px',
    backgroundColor: '#10B981',
  },
  serverPillText: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#334155',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#1E293B',
  },
  input: {
    padding: '11px 14px',
    borderRadius: '10px',
    border: '1.5px solid #CBD5E1',
    fontSize: '14px',
    outline: 'none',
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
    transition: 'border-color 0.15s ease',
  },
  passwordWrapper: {
    display: 'flex',
    alignItems: 'center',
    position: 'relative',
  },
  passwordInput: {
    width: '100%',
    padding: '11px 54px 11px 14px',
    borderRadius: '10px',
    border: '1.5px solid #CBD5E1',
    fontSize: '14px',
    outline: 'none',
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
  },
  eyeBtn: {
    position: 'absolute',
    right: '10px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#64748B',
    fontSize: '12px',
    fontWeight: 600,
    padding: '4px 6px',
  },
  submitBtn: {
    backgroundColor: '#0F2744',
    color: '#FFFFFF',
    fontWeight: 700,
    fontSize: '14px',
    padding: '13px',
    borderRadius: '10px',
    border: 'none',
    marginTop: '6px',
    boxShadow: '0 4px 12px rgba(15, 39, 68, 0.25)',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    color: '#991B1B',
    padding: '10px 14px',
    borderRadius: '10px',
    fontSize: '13px',
    marginBottom: '16px',
    border: '1px solid #FECACA',
  },
  loginFooter: {
    textAlign: 'center',
    fontSize: '11px',
    color: '#94A3B8',
    marginTop: '24px',
  },

  // Dashboard Styles
  dashboard: {
    minHeight: '100vh',
    backgroundColor: '#F8FAFC',
  },
  navbar: {
    backgroundColor: '#0F2744',
    color: '#FFFFFF',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 32px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  navBrand: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  brandIconSmall: {
    width: '34px',
    height: '34px',
    borderRadius: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: '20px',
    fontWeight: 800,
    letterSpacing: '-0.2px',
    marginRight: '8px',
  },
  roleTag: {
    backgroundColor: 'rgba(245, 166, 35, 0.2)',
    color: '#F5A623',
    padding: '2px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  navCenter: {
    display: 'flex',
    alignItems: 'center',
  },
  statusPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: '20px',
    padding: '4px 12px',
  },
  statusDot: {
    width: '7px',
    height: '7px',
    borderRadius: '4px',
    backgroundColor: '#10B981',
  },
  statusPillLabel: {
    fontSize: '12px',
    color: '#6EE7B7',
    fontWeight: 600,
  },
  navActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  adminAvatar: {
    width: '28px',
    height: '28px',
    borderRadius: '14px',
    backgroundColor: '#2B5C8A',
    color: '#FFFFFF',
    fontWeight: 700,
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminUserText: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#CBD5E1',
  },
  logoutBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: '#FFFFFF',
    padding: '6px 14px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 600,
    marginLeft: '6px',
  },
  contentWrap: {
    maxWidth: '1240px',
    margin: '0 auto',
    padding: '28px 24px',
  },
  actionNotice: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    color: '#065F46',
    border: '1px solid #A7F3D0',
    padding: '12px 18px',
    borderRadius: '12px',
    marginBottom: '20px',
    fontSize: '14px',
    fontWeight: 600,
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px',
    marginBottom: '28px',
  },
  metricCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '14px',
    padding: '20px',
    border: '1px solid #E2E8F0',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)',
  },
  metricLabel: {
    fontSize: '12px',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#64748B',
    letterSpacing: '0.5px',
    marginBottom: '8px',
  },
  metricValueRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '10px',
    marginBottom: '4px',
  },
  metricNumber: {
    fontSize: '32px',
    fontWeight: 800,
    color: '#0F2744',
  },
  metricHighlight: {
    fontSize: '24px',
    fontWeight: 800,
    color: '#10B981',
  },
  metricBadgeSuccess: {
    backgroundColor: '#DCFCE7',
    color: '#15803D',
    fontSize: '12px',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: '12px',
  },
  metricBadgeMuted: {
    backgroundColor: '#F1F5F9',
    color: '#64748B',
    fontSize: '12px',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: '12px',
  },
  metricBadgeInfo: {
    backgroundColor: '#E0EEF9',
    color: '#0369A1',
    fontSize: '12px',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: '12px',
  },
  metricHint: {
    fontSize: '12px',
    color: '#94A3B8',
  },
  tabContainer: {
    borderBottom: '1.5px solid #E2E8F0',
    marginBottom: '24px',
  },
  tabBar: {
    display: 'flex',
    gap: '8px',
  },
  tab: {
    backgroundColor: 'transparent',
    border: 'none',
    padding: '10px 18px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#64748B',
    borderRadius: '8px 8px 0 0',
    borderBottom: '2px solid transparent',
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    border: 'none',
    padding: '10px 18px',
    fontSize: '14px',
    fontWeight: 700,
    color: '#0F2744',
    borderRadius: '8px 8px 0 0',
    borderBottom: '2px solid #F5A623',
    boxShadow: '0 -2px 6px rgba(0, 0, 0, 0.02)',
  },
  toolbarRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '18px',
    flexWrap: 'wrap',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #CBD5E1',
    borderRadius: '10px',
    padding: '8px 14px',
    minWidth: '320px',
  },
  searchBoxSmall: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #CBD5E1',
    borderRadius: '10px',
    padding: '8px 14px',
    minWidth: '260px',
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    color: '#1E293B',
    width: '100%',
    backgroundColor: 'transparent',
  },
  clearSearchBtn: {
    background: 'none',
    border: 'none',
    color: '#94A3B8',
    fontSize: '14px',
  },
  primaryActionBtn: {
    backgroundColor: '#F5A623',
    color: '#FFFFFF',
    fontWeight: 700,
    fontSize: '14px',
    padding: '11px 20px',
    borderRadius: '10px',
    border: 'none',
    boxShadow: '0 4px 10px rgba(245, 166, 35, 0.3)',
  },
  selectLabelGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  inlineLabel: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#475569',
  },
  shopSelector: {
    padding: '9px 14px',
    borderRadius: '10px',
    border: '1.5px solid #CBD5E1',
    backgroundColor: '#FFFFFF',
    fontSize: '14px',
    fontWeight: 600,
    color: '#0F2744',
    outline: 'none',
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '14px',
    border: '1px solid #E2E8F0',
    overflow: 'hidden',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '14px',
  },
  tableHeadRow: {
    backgroundColor: '#F8FAFC',
    borderBottom: '1.5px solid #E2E8F0',
  },
  th: {
    padding: '14px 18px',
    color: '#475569',
    fontWeight: 700,
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  tableRow: {
    borderBottom: '1px solid #F1F5F9',
  },
  td: {
    padding: '14px 18px',
    color: '#1E293B',
    verticalAlign: 'middle',
  },
  shopNameCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  shopAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    backgroundColor: '#F1F5F9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
  },
  shopTitleText: {
    fontWeight: 700,
    color: '#0F2744',
  },
  shopCreatedText: {
    fontSize: '12px',
    color: '#94A3B8',
  },
  codeBadge: {
    backgroundColor: '#F1F5F9',
    color: '#2B5C8A',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '13px',
    fontFamily: 'monospace',
    fontWeight: 600,
  },
  statusBadgeActive: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#DCFCE7',
    color: '#15803D',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: 700,
  },
  statusBadgeSuspended: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: 700,
  },
  dotGreen: {
    width: '6px',
    height: '6px',
    borderRadius: '3px',
    backgroundColor: '#16A34A',
  },
  dotRed: {
    width: '6px',
    height: '6px',
    borderRadius: '3px',
    backgroundColor: '#DC2626',
  },
  inlineSelect: {
    padding: '6px 10px',
    borderRadius: '8px',
    border: '1.5px solid #CBD5E1',
    fontSize: '13px',
    fontWeight: 600,
    backgroundColor: '#FFFFFF',
    color: '#0F2744',
    outline: 'none',
  },
  deviceUsageCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    width: '100px',
  },
  deviceUsageText: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#334155',
  },
  usageBarTrack: {
    width: '100%',
    height: '6px',
    backgroundColor: '#E2E8F0',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  usageBarFill: {
    height: '100%',
    borderRadius: '3px',
  },
  tableBtnSecondary: {
    backgroundColor: '#E0EEF9',
    color: '#0369A1',
    border: 'none',
    padding: '7px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 700,
  },
  tableBtnDanger: {
    backgroundColor: '#FEF2F2',
    color: '#DC2626',
    border: '1px solid #FECACA',
    padding: '7px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 700,
  },
  tableBtnSuccess: {
    backgroundColor: '#ECFDF5',
    color: '#059669',
    border: '1px solid #A7F3D0',
    padding: '7px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 700,
  },
  uuidText: {
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#334155',
    backgroundColor: '#F1F5F9',
    padding: '3px 6px',
    borderRadius: '4px',
  },
  deviceModelText: {
    fontWeight: 600,
    color: '#0F2744',
  },
  dateText: {
    fontSize: '13px',
    color: '#64748B',
  },
  actorBadge: {
    backgroundColor: '#EDE9FE',
    color: '#6D28D9',
    padding: '3px 8px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 700,
  },
  actionCodeBadge: {
    backgroundColor: '#FEF3C7',
    color: '#B45309',
    padding: '3px 8px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 700,
    fontFamily: 'monospace',
  },
  metaPre: {
    fontSize: '11px',
    backgroundColor: '#F8FAFC',
    border: '1px solid #E2E8F0',
    padding: '6px 10px',
    borderRadius: '6px',
    color: '#334155',
    maxWidth: '380px',
    maxHeight: '80px',
    overflow: 'auto',
  },
  emptyTableState: {
    textAlign: 'center',
    padding: '44px 20px',
    color: '#64748B',
    fontSize: '14px',
  },

  // Modal Styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '18px',
    padding: '32px',
    width: '100%',
    maxWidth: '500px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
  },
  modalHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: 800,
    color: '#0F2744',
  },
  modalSub: {
    fontSize: '13px',
    color: '#64748B',
    marginBottom: '18px',
    lineHeight: 1.45,
  },
  closeModalBtn: {
    backgroundColor: '#F1F5F9',
    border: 'none',
    width: '30px',
    height: '30px',
    borderRadius: '15px',
    color: '#64748B',
    fontSize: '13px',
    fontWeight: 700,
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '12px',
  },
  cancelBtn: {
    backgroundColor: '#F1F5F9',
    border: 'none',
    color: '#475569',
    padding: '11px 18px',
    borderRadius: '10px',
    fontWeight: 600,
    fontSize: '14px',
  },
};
