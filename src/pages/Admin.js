import React, { useState, useEffect } from 'react';
import { getApiBaseUrl } from '../utils/apiBaseUrl';
import styles from './Admin.module.css';

const AUTH_API_BASE_URL = getApiBaseUrl();
const AUTH_SESSION_KEY = 'crymson_auth_session';

function getStoredToken() {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    return parsed.accessToken || parsed.token || '';
  } catch {
    return '';
  }
}

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 0, limit: 20 });

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({ fullName: '', email: '', department: '', level: '', password: '', isAdmin: false });
  const [creatingUser, setCreatingUser] = useState(false);

  const [settings, setSettings] = useState({});
  const [health, setHealth] = useState(null);

  const [featureKey, setFeatureKey] = useState('');
  const [featureValue, setFeatureValue] = useState(false);

  const [bulkFilter, setBulkFilter] = useState('');
  const [bulkSubject, setBulkSubject] = useState('');
  const [bulkBody, setBulkBody] = useState('');
  const [bulkRunning, setBulkRunning] = useState(false);

  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsOffset, setLogsOffset] = useState(0);
  const [logsLimit, setLogsLimit] = useState(50);

  useEffect(() => {
    fetchUsers();
    fetchSettings();
    fetchHealth();
  }, [page, search]);

  function getToken() {
    return getStoredToken();
  }

  function handleLogout() {
    try {
      localStorage.removeItem(AUTH_SESSION_KEY);
      localStorage.removeItem('crymson_app_state');
    } catch (e) {
      // ignore
    }
    // reload so App will restore to landing without a session
    window.location.reload();
  }

  async function fetchUsers() {
    setLoading(true);
    setError('');
    try {
      const token = getToken();
      const query = new URLSearchParams({ page, limit: pagination.limit });
      if (search) query.append('search', search);

      const response = await fetch(`${AUTH_API_BASE_URL}/api/admin/users?${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data.users || []);
      setPagination(data.pagination || { total: 0, pages: 0, limit: 20 });
    } catch (err) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  async function fetchSettings() {
    try {
      const token = getToken();
      const res = await fetch(`${AUTH_API_BASE_URL}/api/admin/settings`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to load settings');
      const data = await res.json();
      setSettings(data.settings || {});
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleMaintenance() {
    try {
      const token = getToken();
      const newVal = !Boolean(settings.maintenance);
      const res = await fetch(`${AUTH_API_BASE_URL}/api/admin/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ maintenance: newVal })
      });
      if (!res.ok) throw new Error('Failed to update settings');
      const data = await res.json();
      setSettings(data.settings || {});
    } catch (err) {
      setError(err.message);
    }
  }

  async function fetchHealth() {
    try {
      const res = await fetch(`${AUTH_API_BASE_URL}/api/health`);
      const data = await res.json();
      setHealth(data || null);
    } catch (err) {
      setError('Failed to fetch health');
    }
  }

  async function fetchLogs(offset = 0, limit = logsLimit) {
    setLogsLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${AUTH_API_BASE_URL}/api/admin/logs?limit=${limit}&offset=${offset}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load logs');
      const data = await res.json();
      setLogs(data.logs || []);
      setLogsOffset(offset);
    } catch (err) {
      setError(err.message);
    } finally {
      setLogsLoading(false);
    }
  }

  function downloadLogs() {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crymson-audit-log-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function sendBulkEmail(e) {
    e.preventDefault();
    setBulkRunning(true);
    setError('');
    try {
      const token = getToken();
      const res = await fetch(`${AUTH_API_BASE_URL}/api/admin/bulk/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ filter: bulkFilter, subject: bulkSubject, body: bulkBody })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to queue bulk email');
      }
      const data = await res.json();
      alert(`Queued ${data.queued || 0} emails.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBulkRunning(false);
    }
  }

  async function handleCreateUser(e) {
    e.preventDefault();
    setCreatingUser(true);
    setError('');
    try {
      const token = getToken();
      const res = await fetch(`${AUTH_API_BASE_URL}/api/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(createForm)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to create user');
      }
      const data = await res.json();
      setUsers((prev) => [data.user, ...prev]);
      setCreateForm({ fullName: '', email: '', department: '', level: '', password: '', isAdmin: false });
      setShowCreateForm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreatingUser(false);
    }
  }

  async function handleDelete(crymsonId) {
    if (!window.confirm(`Delete user ${crymsonId}?`)) return;
    try {
      const token = getToken();
      const res = await fetch(`${AUTH_API_BASE_URL}/api/admin/users/${crymsonId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to delete user');
      setUsers((prev) => prev.filter(u => u.crymsonId !== crymsonId));
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleFeatureFlag(key, value) {
    try {
      const token = getToken();
      const res = await fetch(`${AUTH_API_BASE_URL}/api/admin/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ [key]: value })
      });
      if (!res.ok) throw new Error('Failed to update feature flag');
      const data = await res.json();
      setSettings(data.settings || {});
    } catch (err) {
      setError(err.message);
    }
  }

  const featureKeys = Object.keys(settings || {}).filter((k) => String(k).startsWith('feature_'));

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Admin Panel</h1>
        <div>
          <button className={styles.backBtn} onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.controls}>
        <input className={styles.searchInput} placeholder="Search by Crymson ID, name, or email..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <button className={styles.createBtn} onClick={() => setShowCreateForm((s) => !s)}>{showCreateForm ? 'Cancel' : 'Create User'}</button>
      </div>

      {showCreateForm && (
        <form className={styles.createForm} onSubmit={handleCreateUser}>
          <h3>Create New User</h3>
          <div className={styles.formRow}>
            <input required placeholder="Full Name" value={createForm.fullName} onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })} />
            <input required type="email" placeholder="Email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} />
          </div>
          <div className={styles.formRow}>
            <input required placeholder="Department" value={createForm.department} onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })} />
            <input required placeholder="Level" value={createForm.level} onChange={(e) => setCreateForm({ ...createForm, level: e.target.value })} />
          </div>
          <div className={styles.formRow}>
            <input required type="password" placeholder="Password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} />
            <label className={styles.checkboxLabel}><input type="checkbox" checked={createForm.isAdmin} onChange={(e) => setCreateForm({ ...createForm, isAdmin: e.target.checked })} /> Make Admin (ID ends with A)</label>
          </div>
          <button className={styles.submitBtn} type="submit" disabled={creatingUser}>{creatingUser ? 'Creating...' : 'Create User'}</button>
        </form>
      )}

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Crymson ID</th>
              <th>Full Name</th>
              <th>Email</th>
              <th>Department</th>
              <th>Level</th>
              <th>Joined</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.crymsonId}>
                <td className={styles.id}>{user.crymsonId}</td>
                <td>{user.fullName}</td>
                <td>{user.email}</td>
                <td>{user.department}</td>
                <td>{user.level}</td>
                <td>{new Date(user.createdAt).toLocaleString()}</td>
                <td><button className={styles.deleteBtn} onClick={() => handleDelete(user.crymsonId)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.pagination}>
        <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button>
        <span>Page {page} of {pagination.pages || 1} (Total: {pagination.total})</span>
        <button disabled={page >= (pagination.pages || 1)} onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>

      <div className={styles.adminRow}>
        <div className={styles.card}>
          <h3>System Health</h3>
          <div>
            {health ? <pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(health, null, 2)}</pre> : <div>Loading...</div>}
            <button onClick={fetchHealth}>Refresh</button>
          </div>
        </div>

        <div className={styles.card}>
          <h3>Maintenance</h3>
          <div>
            <p>App under maintenance: <strong>{String(Boolean(settings.maintenance))}</strong></p>
            <button onClick={toggleMaintenance}>Toggle Maintenance</button>
          </div>
        </div>

        <div className={styles.card}>
          <h3>Feature Flags</h3>
          <div>
            <ul>
              {featureKeys.length === 0 && <li>No feature flags defined.</li>}
              {featureKeys.map((k) => (
                <li key={k}>
                  <label style={{display:'flex',alignItems:'center',gap:8}}>
                    <input type="checkbox" checked={Boolean(settings[k])} onChange={(e) => toggleFeatureFlag(k, e.target.checked)} />
                    <strong style={{marginLeft:6}}>{k}</strong>
                    <span style={{marginLeft:8,color:'#64748b'}}>{String(settings[k])}</span>
                  </label>
                </li>
              ))}
            </ul>

            <form onSubmit={async (e) => { e.preventDefault(); if (!featureKey) return; await toggleFeatureFlag(featureKey, featureValue); setFeatureKey(''); setFeatureValue(false); }}>
              <div style={{display:'flex',gap:8,marginTop:8}}>
                <input placeholder="feature_key (prefix with feature_)" value={featureKey} onChange={(e)=>setFeatureKey(e.target.value)} />
                <select value={featureValue ? 'true' : 'false'} onChange={(e)=>setFeatureValue(e.target.value === 'true')}>
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
                <button type="submit" className={styles.createBtn}>Add</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className={styles.adminRow} style={{marginTop:16}}>
        <div className={styles.card} style={{gridColumn:'span 2'}}>
          <h3>Bulk Email</h3>
          <form onSubmit={sendBulkEmail}>
            <div className={styles.formRow}>
              <input placeholder="Filter (email, department, Crymson ID)" value={bulkFilter} onChange={(e)=>setBulkFilter(e.target.value)} />
              <input placeholder="Subject" value={bulkSubject} onChange={(e)=>setBulkSubject(e.target.value)} />
            </div>
            <div>
              <textarea placeholder="Message body" value={bulkBody} onChange={(e)=>setBulkBody(e.target.value)} style={{width:'100%',minHeight:120}} />
            </div>
            <div style={{marginTop:8}}>
              <button className={styles.createBtn} type="submit" disabled={bulkRunning}>{bulkRunning ? 'Queueing...' : 'Send Bulk Email'}</button>
            </div>
          </form>
        </div>

        <div className={styles.card}>
          <h3>Audit Logs</h3>
          <div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <button onClick={()=>fetchLogs(0, logsLimit)} disabled={logsLoading}>{logsLoading ? 'Loading...' : 'Load Logs'}</button>
              <button onClick={()=>fetchLogs(Math.max(0, logsOffset - logsLimit), logsLimit)} disabled={logsLoading || logsOffset <= 0}>Prev</button>
              <button onClick={()=>fetchLogs(logsOffset + logsLimit, logsLimit)} disabled={logsLoading || logs.length < logsLimit}>Next</button>
              <button onClick={downloadLogs} disabled={logs.length===0}>Download</button>
            </div>

            <div className={styles.logs} style={{marginTop:8}}>
              {logs.length === 0 ? <div>No logs loaded.</div> : (
                <ol>
                  {logs.map((entry, idx) => (
                    <li key={idx}><strong>{entry.timestamp}</strong> — {entry.userId} {entry.action} {entry.resource} ({entry.status})</li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
