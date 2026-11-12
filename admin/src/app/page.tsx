'use client';

import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

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
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<'shops' | 'devices' | 'audits'>('shops');

  // Dashboard Data
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  // New Shop Form
  const [showCreateShop, setShowCreateShop] = useState(false);
  const [newShopName, setNewShopName] = useState('');
  const [newShopUser, setNewShopUser] = useState('');
  const [newShopPass, setNewShopPass] = useState('');
  const [newShopLimit, setNewShopLimit] = useState(1);
  const [createError, setCreateError] = useState('');

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.message || 'Login failed.');
        return;
      }
      setToken(data.token);
    } catch (err: any) {
      setLoginError(`Cannot reach backend: ${err.message}`);
    }
  };

  const loadTenants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/tenants`);
      if (res.ok) {
        const data = await res.json();
        setTenants(data);
      }
    } catch (err) {
      console.warn('Failed to load tenants:', err);
    } finally {
      setLoading(false);
    }
  }, []);

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
      const res = await fetch(`${API_BASE}/admin/audit-logs?limit=50`);
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
    try {
      const res = await fetch(`${API_BASE}/admin/tenants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newShopName,
          username: newShopUser,
          password: newShopPass,
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
      loadTenants();
      loadAudits();
    } catch (err: any) {
      setCreateError(err.message || 'Network error');
    }
  };

  // Update Shop Status / Device Limit
  const handleUpdateTenant = async (id: string, updates: Partial<Tenant>) => {
    try {
      await fetch(`${API_BASE}/admin/tenants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
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
      if (selectedTenant) {
        loadDevices(selectedTenant.id);
      }
      loadTenants();
      loadAudits();
    } catch (err) {
      console.warn('Device action failed:', err);
    }
  };

  // If not logged in, show clean admin login
  if (!token) {
    return (
      <main style={styles.loginContainer}>
        <div style={styles.loginCard}>
          <div style={styles.brandBadge}>TailorBook Admin</div>
          <h1 style={styles.loginTitle}>Management Portal</h1>
          <p style={styles.loginSubtitle}>Sign in to manage tailoring shops and authorized devices.</p>

          {loginError && <div style={styles.errorBox}>{loginError}</div>}

          <form onSubmit={handleLogin} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Admin Username</label>
              <input
                type="text"
                style={styles.input}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Password</label>
              <input
                type="password"
                style={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" style={styles.submitBtn}>
              Sign In to Admin
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <div style={styles.dashboard}>
      {/* Top Navbar */}
      <header style={styles.navbar}>
        <div style={styles.navBrand}>
          <span style={styles.logoText}>TailorBook</span>
          <span style={styles.roleTag}>Admin Panel</span>
        </div>
        <div style={styles.navActions}>
          <span style={styles.adminUserText}>Logged in as <b>admin</b></span>
          <button onClick={() => setToken(null)} style={styles.logoutBtn}>
            Logout
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div style={styles.contentWrap}>
        {/* Navigation Tabs */}
        <div style={styles.tabBar}>
          <button
            style={activeTab === 'shops' ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab('shops')}
          >
            🏪 Tailoring Shops ({tenants.length})
          </button>
          <button
            style={activeTab === 'devices' ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab('devices')}
          >
            📱 Device Management {selectedTenant ? `(${selectedTenant.name})` : ''}
          </button>
          <button
            style={activeTab === 'audits' ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab('audits')}
          >
            📜 Audit Logs ({auditLogs.length})
          </button>
        </div>

        {/* Tab 1: Shops */}
        {activeTab === 'shops' && (
          <div>
            <div style={styles.sectionHeaderRow}>
              <div>
                <h2 style={styles.sectionTitle}>Registered Tailoring Shops</h2>
                <p style={styles.sectionSub}>Configure shop status and device authorization limits.</p>
              </div>
              <button onClick={() => setShowCreateShop(true)} style={styles.primaryActionBtn}>
                ＋ Add New Shop
              </button>
            </div>

            {/* Create Shop Modal */}
            {showCreateShop && (
              <div style={styles.modalOverlay}>
                <div style={styles.modalCard}>
                  <h3 style={styles.modalTitle}>Register New Tailoring Shop</h3>
                  {createError && <div style={styles.errorBox}>{createError}</div>}
                  <form onSubmit={handleCreateShop} style={styles.form}>
                    <div style={styles.field}>
                      <label style={styles.label}>Shop Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Royal Master Tailors"
                        style={styles.input}
                        value={newShopName}
                        onChange={(e) => setNewShopName(e.target.value)}
                        required
                      />
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>Shop Username (for login/activation)</label>
                      <input
                        type="text"
                        placeholder="e.g. royaltailors"
                        style={styles.input}
                        value={newShopUser}
                        onChange={(e) => setNewShopUser(e.target.value)}
                        required
                      />
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>Initial Password</label>
                      <input
                        type="password"
                        placeholder="Set shop password"
                        style={styles.input}
                        value={newShopPass}
                        onChange={(e) => setNewShopPass(e.target.value)}
                        required
                      />
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>Device Authorization Limit</label>
                      <select
                        style={styles.input}
                        value={newShopLimit}
                        onChange={(e) => setNewShopLimit(parseInt(e.target.value, 10))}
                      >
                        <option value={1}>1 Device (Default Pilot)</option>
                        <option value={2}>2 Devices</option>
                        <option value={3}>3 Devices</option>
                        <option value={5}>5 Devices</option>
                        <option value={10}>10 Devices</option>
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
                      <button type="submit" style={styles.submitBtn}>
                        Create Shop
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
                    <th style={styles.th}>Shop Name</th>
                    <th style={styles.th}>Username</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Device Limit</th>
                    <th style={styles.th}>Active Devices</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((t) => (
                    <tr key={t.id} style={styles.tableRow}>
                      <td style={styles.td}>
                        <b>{t.name}</b>
                      </td>
                      <td style={styles.td}><code>{t.username || '—'}</code></td>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.statusBadge,
                            backgroundColor: t.status === 'active' ? '#DCFCE7' : '#FEE2E2',
                            color: t.status === 'active' ? '#166534' : '#991B1B',
                          }}
                        >
                          {t.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <select
                          style={styles.inlineSelect}
                          value={t.max_devices}
                          onChange={(e) =>
                            handleUpdateTenant(t.id, { max_devices: parseInt(e.target.value, 10) })
                          }
                        >
                          <option value={1}>1 Device</option>
                          <option value={2}>2 Devices</option>
                          <option value={3}>3 Devices</option>
                          <option value={5}>5 Devices</option>
                        </select>
                      </td>
                      <td style={styles.td}>
                        {t.active_devices || 0} / {t.max_devices}
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => {
                              setSelectedTenant(t);
                              setActiveTab('devices');
                            }}
                            style={styles.tableBtnSecondary}
                          >
                            📱 Devices ({t.total_devices || 0})
                          </button>
                          <button
                            onClick={() =>
                              handleUpdateTenant(t.id, {
                                status: t.status === 'active' ? 'suspended' : 'active',
                              })
                            }
                            style={{
                              ...styles.tableBtnDanger,
                              color: t.status === 'active' ? '#DC2626' : '#16A34A',
                            }}
                          >
                            {t.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {tenants.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '30px' }}>
                        No shops registered yet. Click &quot;Add New Shop&quot; to register your first pilot shop.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Devices */}
        {activeTab === 'devices' && (
          <div>
            <div style={styles.sectionHeaderRow}>
              <div>
                <h2 style={styles.sectionTitle}>
                  Devices for: {selectedTenant ? selectedTenant.name : 'Select a shop first'}
                </h2>
                <p style={styles.sectionSub}>Approve new devices or revoke replaced phones.</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <select
                  style={styles.input}
                  value={selectedTenant?.id || ''}
                  onChange={(e) => {
                    const found = tenants.find((t) => t.id === e.target.value);
                    if (found) setSelectedTenant(found);
                  }}
                >
                  <option value="">-- Choose Shop --</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={styles.tableCard}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeadRow}>
                    <th style={styles.th}>Device ID</th>
                    <th style={styles.th}>Device Model</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Activated</th>
                    <th style={styles.th}>Last Seen</th>
                    <th style={styles.th}>Authorization Action</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((d) => (
                    <tr key={d.id} style={styles.tableRow}>
                      <td style={styles.td}><code>{d.device_identifier}</code></td>
                      <td style={styles.td}>{d.device_name || 'Android Device'}</td>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.statusBadge,
                            backgroundColor: d.status === 'active' ? '#DCFCE7' : '#FEE2E2',
                            color: d.status === 'active' ? '#166534' : '#991B1B',
                          }}
                        >
                          {d.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={styles.td}>{new Date(d.activated_at).toLocaleDateString()}</td>
                      <td style={styles.td}>{new Date(d.last_seen_at).toLocaleString()}</td>
                      <td style={styles.td}>
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
                            style={styles.tableBtnSecondary}
                          >
                            Re-Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {devices.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '30px' }}>
                        {selectedTenant
                          ? 'No devices registered for this shop yet.'
                          : 'Select a shop from the dropdown to inspect its devices.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Audits */}
        {activeTab === 'audits' && (
          <div>
            <div style={styles.sectionHeaderRow}>
              <div>
                <h2 style={styles.sectionTitle}>System Audit Logs</h2>
                <p style={styles.sectionSub}>Immutable security logs for tenant and device operations.</p>
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
                  {auditLogs.map((a) => (
                    <tr key={a.id} style={styles.tableRow}>
                      <td style={styles.td}>{new Date(a.created_at).toLocaleString()}</td>
                      <td style={styles.td}><b>{a.actor_id}</b></td>
                      <td style={styles.td}>{a.tenant_name || '—'}</td>
                      <td style={styles.td}>
                        <code>{a.action}</code>
                      </td>
                      <td style={styles.td}>
                        <pre style={styles.metaPre}>
                          {JSON.stringify(a.metadata, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '30px' }}>
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

const styles: Record<string, React.CSSProperties> = {
  loginContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    padding: '20px',
  },
  loginCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    padding: '36px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
  },
  brandBadge: {
    display: 'inline-block',
    backgroundColor: '#EEF2F6',
    color: '#1A3C5E',
    fontWeight: 700,
    fontSize: '12px',
    padding: '4px 10px',
    borderRadius: '12px',
    marginBottom: '12px',
    textTransform: 'uppercase',
  },
  loginTitle: {
    fontSize: '24px',
    fontWeight: 800,
    color: '#1A3C5E',
    marginBottom: '6px',
  },
  loginSubtitle: {
    fontSize: '14px',
    color: '#64748B',
    marginBottom: '24px',
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
    fontWeight: 600,
    color: '#334155',
  },
  input: {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #CBD5E1',
    fontSize: '14px',
    outline: 'none',
  },
  submitBtn: {
    backgroundColor: '#1A3C5E',
    color: '#FFFFFF',
    fontWeight: 700,
    fontSize: '14px',
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    marginTop: '8px',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    color: '#DC2626',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '14px',
    border: '1px solid #FCA5A5',
  },
  dashboard: {
    minHeight: '100vh',
    backgroundColor: '#F8FAFC',
  },
  navbar: {
    backgroundColor: '#1A3C5E',
    color: '#FFFFFF',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 28px',
  },
  navBrand: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoText: {
    fontSize: '20px',
    fontWeight: 800,
    letterSpacing: '0.5px',
  },
  roleTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: '3px 8px',
    borderRadius: '6px',
    fontSize: '12px',
  },
  navActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  adminUserText: {
    fontSize: '13px',
    color: '#CBD5E1',
  },
  logoutBtn: {
    backgroundColor: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    color: '#FFFFFF',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
  },
  contentWrap: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px 20px',
  },
  tabBar: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    borderBottom: '1px solid #E2E8F0',
    paddingBottom: '12px',
  },
  tab: {
    backgroundColor: 'transparent',
    border: 'none',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#64748B',
    borderRadius: '8px',
  },
  tabActive: {
    backgroundColor: '#1A3C5E',
    border: 'none',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 700,
    color: '#FFFFFF',
    borderRadius: '8px',
  },
  sectionHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '18px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#0F172A',
  },
  sectionSub: {
    fontSize: '13px',
    color: '#64748B',
  },
  primaryActionBtn: {
    backgroundColor: '#F5A623',
    color: '#FFFFFF',
    fontWeight: 700,
    fontSize: '14px',
    padding: '10px 18px',
    borderRadius: '8px',
    border: 'none',
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #E2E8F0',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '14px',
  },
  tableHeadRow: {
    backgroundColor: '#F1F5F9',
    borderBottom: '1px solid #E2E8F0',
  },
  th: {
    padding: '12px 16px',
    color: '#475569',
    fontWeight: 600,
    fontSize: '13px',
  },
  tableRow: {
    borderBottom: '1px solid #F1F5F9',
  },
  td: {
    padding: '12px 16px',
    color: '#1E293B',
  },
  statusBadge: {
    padding: '3px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 700,
  },
  inlineSelect: {
    padding: '4px 8px',
    borderRadius: '6px',
    border: '1px solid #CBD5E1',
    fontSize: '13px',
  },
  tableBtnSecondary: {
    backgroundColor: '#F1F5F9',
    color: '#1A3C5E',
    border: '1px solid #CBD5E1',
    padding: '6px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
  },
  tableBtnDanger: {
    backgroundColor: '#FEF2F2',
    color: '#DC2626',
    border: '1px solid #FECACA',
    padding: '6px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
  },
  metaPre: {
    fontSize: '11px',
    backgroundColor: '#F8FAFC',
    padding: '4px 8px',
    borderRadius: '4px',
    color: '#475569',
    maxWidth: '300px',
    overflow: 'auto',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '14px',
    padding: '28px',
    width: '100%',
    maxWidth: '460px',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#1A3C5E',
    marginBottom: '16px',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '12px',
  },
  cancelBtn: {
    backgroundColor: '#F1F5F9',
    border: 'none',
    color: '#475569',
    padding: '10px 16px',
    borderRadius: '8px',
    fontWeight: 600,
  },
};

