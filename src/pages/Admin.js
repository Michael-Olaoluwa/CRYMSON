import React, { useState, useEffect } from 'react';
import { getApiBaseUrl } from '../utils/apiBaseUrl';
import styles from './Admin.module.css';

const AUTH_API_BASE_URL = getApiBaseUrl();
const AUTH_SESSION_KEY = 'crymson_auth_session';

export default function Admin({ onNavigateHome }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 0, limit: 20 });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    fullName: '',
    email: '',
    department: '',
    level: '',
    password: '',
    isAdmin: false
  });
  const [creatingUser, setCreatingUser] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [page, search]);

  const getToken = () => {
    try {
      const raw = localStorage.getItem(AUTH_SESSION_KEY);
      if (!raw) return '';
      const parsed = JSON.parse(raw);
      return parsed.accessToken || parsed.token || '';
    } catch {
      return '';
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const token = getToken();
      const query = new URLSearchParams({ page, limit: 20 });
      if (search) query.append('search', search);

      const response = await fetch(`${AUTH_API_BASE_URL}/api/admin/users?${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users || []);
      setPagination(data.pagination || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (crymsonId) => {
    if (!window.confirm(`Delete user ${crymsonId}?`)) return;

    try {
      const token = getToken();
      const response = await fetch(`${AUTH_API_BASE_URL}/api/admin/users/${crymsonId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      setUsers(users.filter(u => u.crymsonId !== crymsonId));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreatingUser(true);
    setError('');

    try {
      const token = getToken();
      const response = await fetch(`${AUTH_API_BASE_URL}/api/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(createForm)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to create user');
      }

      const data = await response.json();
      setUsers([data.user, ...users]);
      setCreateForm({
        fullName: '',
        email: '',
        department: '',
        level: '',
        password: '',
        isAdmin: false
      });
      setShowCreateForm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreatingUser(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Admin Panel</h1>
        <button className={styles.backBtn} onClick={onNavigateHome}>
          Back to Home
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.controls}>
        <input
          type="text"
          placeholder="Search by Crymson ID, name, or email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className={styles.searchInput}
        />
        <button
          className={styles.createBtn}
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : 'Create User'}
        </button>
      </div>

      {showCreateForm && (
        <form className={styles.createForm} onSubmit={handleCreateUser}>
          <h3>Create New User</h3>
          <div className={styles.formRow}>
            <input
              type="text"
              placeholder="Full Name"
              value={createForm.fullName}
              onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              required
            />
          </div>
          <div className={styles.formRow}>
            <input
              type="text"
              placeholder="Department"
              value={createForm.department}
              onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Level"
              value={createForm.level}
              onChange={(e) => setCreateForm({ ...createForm, level: e.target.value })}
              required
            />
          </div>
          <div className={styles.formRow}>
            <input
              type="password"
              placeholder="Password (min 6 characters)"
              value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              required
            />
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={createForm.isAdmin}
                onChange={(e) => setCreateForm({ ...createForm, isAdmin: e.target.checked })}
              />
              Make Admin (ID ends with A)
            </label>
          </div>
          <button type="submit" className={styles.submitBtn} disabled={creatingUser}>
            {creatingUser ? 'Creating...' : 'Create User'}
          </button>
        </form>
      )}

      {loading ? (
        <div className={styles.loading}>Loading users...</div>
      ) : users.length === 0 ? (
        <div className={styles.empty}>No users found.</div>
      ) : (
        <>
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
                    <td>{formatDate(user.createdAt)}</td>
                    <td>
                      <button
                        className={styles.deleteBtn}
                        onClick={() => handleDelete(user.crymsonId)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.pagination}>
            <button
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span>
              Page {page} of {pagination.pages || 1} (Total: {pagination.total})
            </span>
            <button
              disabled={page >= (pagination.pages || 1)}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
