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
      </div>

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
