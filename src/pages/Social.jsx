import React, { useCallback, useEffect, useState } from 'react';
import { getAuthToken } from '../utils/authSession';
import styles from './Social.module.css';

const API_BASE = process.env.REACT_APP_API_BASE_URL || `${window.location.protocol}//${window.location.hostname}:5000`;

function getAuthHeaders() {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

const TABS = [
  { id: 'friends', label: 'Friends' },
  { id: 'groups', label: 'Groups' },
  { id: 'leaderboard', label: 'Leaderboard' },
  { id: 'challenges', label: 'Challenges' },
  { id: 'privacy', label: 'Privacy' },
];

function TabBar({ tabs, active, onChange }) {
  return (
    <div className={styles.tabBar}>
      {tabs.map(t => (
        <button
          key={t.id}
          className={`${styles.tab} ${active === t.id ? styles.tabActive : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function FriendsTab({ userId }) {
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const fetchFriends = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/social/friends`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setFriends(data.friends || []);
        setRequests(data.friendRequests || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFriends(); }, [fetchFriends]);

  const searchUsers = async (q) => {
    setSearchQuery(q);
    if (q.trim().length < 2) { setSearchResults([]); return; }
    try {
      const res = await fetch(`${API_BASE}/api/auth/users/search?q=${encodeURIComponent(q)}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.users || []);
      }
    } catch {}
  };

  const sendRequest = async (target) => {
    try {
      const res = await fetch(`${API_BASE}/api/social/friend/request`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ targetCrymsonId: target }),
      });
      const data = await res.json();
      setMsg(data.error || 'Request sent!');
    } catch { setMsg('Failed to send request'); }
  };

  const acceptRequest = async (from) => {
    try {
      const res = await fetch(`${API_BASE}/api/social/friend/accept`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ fromUserId: from }),
      });
      if (res.ok) fetchFriends();
    } catch {}
  };

  const declineRequest = async (from) => {
    try {
      const res = await fetch(`${API_BASE}/api/social/friend/decline`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ fromUserId: from }),
      });
      if (res.ok) fetchFriends();
    } catch {}
  };

  const removeFriend = async (friendId) => {
    try {
      const res = await fetch(`${API_BASE}/api/social/friend/remove`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ friendId }),
      });
      if (res.ok) fetchFriends();
    } catch {}
  };

  return (
    <div>
      {msg && <div className={styles.msg}>{msg}</div>}

      <div className={styles.searchRow}>
        <input
          className={styles.input}
          placeholder="Search users by name or Crymson ID..."
          value={searchQuery}
          onChange={e => searchUsers(e.target.value)}
        />
      </div>

      {searchResults.length > 0 && (
        <div className={styles.searchResults}>
          {searchResults.filter(u => u.crymsonId !== userId).map(u => (
            <div key={u.crymsonId} className={styles.userRow}>
              <div>
                <strong>{u.fullName}</strong>
                <span className={styles.tag}>{u.crymsonId}</span>
              </div>
              <button className={styles.btn} onClick={() => sendRequest(u.crymsonId)}>Add Friend</button>
            </div>
          ))}
        </div>
      )}

      {requests.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Pending Requests</h3>
          {requests.map(r => (
            <div key={r.from} className={styles.userRow}>
              <span>{r.from}</span>
              <div className={styles.rowActions}>
                <button className={styles.btnPrimary} onClick={() => acceptRequest(r.from)}>Accept</button>
                <button className={styles.btnDanger} onClick={() => declineRequest(r.from)}>Decline</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Friends ({friends.length})</h3>
        {loading ? <p className={styles.muted}>Loading...</p> : friends.length === 0 ? (
          <p className={styles.muted}>No friends yet. Search for users above to add them.</p>
        ) : (
          friends.map(f => (
            <div key={f} className={styles.userRow}>
              <span>{f}</span>
              <button className={styles.btnDangerSmall} onClick={() => removeFriend(f)}>Remove</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function GroupsTab({ userId }) {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupStats, setGroupStats] = useState(null);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/social/groups`, { headers: getAuthHeaders() });
      if (res.ok) setGroups(await res.json());
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const createGroup = async () => {
    if (!name.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/social/group/create`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name, description: desc }),
      });
      const data = await res.json();
      if (res.ok) { setName(''); setDesc(''); fetchGroups(); setMsg(`Group created! Invite code: ${data.inviteCode}`); }
      else setMsg(data.error);
    } catch {}
  };

  const joinGroup = async () => {
    if (!inviteCode.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/social/group/join`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ inviteCode }),
      });
      const data = await res.json();
      if (res.ok) { setInviteCode(''); fetchGroups(); setMsg(`Joined ${data.name}!`); }
      else setMsg(data.error);
    } catch {}
  };

  const leaveGroup = async (groupId) => {
    try {
      const res = await fetch(`${API_BASE}/api/social/group/leave`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ groupId }),
      });
      if (res.ok) { setSelectedGroup(null); setGroupStats(null); fetchGroups(); }
    } catch {}
  };

  const viewGroup = async (groupId) => {
    try {
      const res = await fetch(`${API_BASE}/api/social/group/${groupId}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const g = await res.json();
        setSelectedGroup(g);
        const sres = await fetch(`${API_BASE}/api/social/group/${groupId}/stats`, { headers: getAuthHeaders() });
        if (sres.ok) setGroupStats(await sres.json());
        else setGroupStats(null);
      }
    } catch {}
  };

  return (
    <div>
      {msg && <div className={styles.msg}>{msg}</div>}

      <div className={styles.card}>
        <h3 className={styles.sectionTitle}>Create Group</h3>
        <div className={styles.formRow}>
          <input className={styles.input} placeholder="Group name" value={name} onChange={e => setName(e.target.value)} />
          <input className={styles.input} placeholder="Description (optional)" value={desc} onChange={e => setDesc(e.target.value)} />
          <button className={styles.btn} onClick={createGroup}>Create</button>
        </div>
      </div>

      <div className={styles.card}>
        <h3 className={styles.sectionTitle}>Join Group</h3>
        <div className={styles.formRow}>
          <input className={styles.input} placeholder="Enter invite code" value={inviteCode} onChange={e => setInviteCode(e.target.value)} />
          <button className={styles.btn} onClick={joinGroup}>Join</button>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>My Groups ({groups.length})</h3>
        {loading ? <p className={styles.muted}>Loading...</p> : groups.length === 0 ? (
          <p className={styles.muted}>You are not in any group yet. Create or join one!</p>
        ) : (
          <div className={styles.groupGrid}>
            {groups.map(g => (
              <div
                key={g.id}
                className={`${styles.groupCard} ${selectedGroup?.id === g.id ? styles.groupCardActive : ''}`}
                onClick={() => viewGroup(g.id)}
              >
                <strong>{g.name}</strong>
                <span className={styles.muted}>{g.members?.length || 0} members</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedGroup && (
        <div className={styles.card}>
          <div className={styles.groupHeader}>
            <div>
              <h3 className={styles.sectionTitle}>{selectedGroup.name}</h3>
              <p className={styles.muted}>{selectedGroup.description}</p>
              <p className={styles.muted}>Invite Code: <strong>{selectedGroup.inviteCode}</strong></p>
              <p className={styles.muted}>Members: {selectedGroup.members?.join(', ')}</p>
            </div>
            <div className={styles.rowActions}>
              <button className={styles.btnDanger} onClick={() => leaveGroup(selectedGroup.id)}>Leave</button>
            </div>
          </div>

          {groupStats && (
            <div className={styles.statsGrid}>
              {groupStats.map(s => (
                <div key={s.userId} className={styles.statCard}>
                  <strong>{s.userId}</strong>
                  {s.totalHours !== undefined && <span>{s.totalHours}h total</span>}
                  {s.todayHours !== undefined && <span className={styles.muted}>{s.todayHours}h today</span>}
                  {s.taskCompletionRate !== undefined && <span>{s.taskCompletionRate}% tasks</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ChallengesTab({ userId }) {
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [challenges, setChallenges] = useState([]);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('study_hours');
  const [target, setTarget] = useState('');
  const [unit, setUnit] = useState('hours');
  const [endDate, setEndDate] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/api/social/groups`, { headers: getAuthHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then(setGroups)
      .catch(() => {});
  }, []);

  const fetchChallenges = async (groupId) => {
    setSelectedGroupId(groupId);
    if (!groupId) { setChallenges([]); return; }
    try {
      const res = await fetch(`${API_BASE}/api/social/group/${groupId}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const g = await res.json();
        setChallenges(g.challenges || []);
      }
    } catch {}
  };

  const createChallenge = async () => {
    if (!title.trim() || !target || !selectedGroupId) return;
    try {
      const res = await fetch(`${API_BASE}/api/social/group/${selectedGroupId}/challenge`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ title, type, target: Number(target), unit, endDate: endDate || undefined }),
      });
      const data = await res.json();
      if (res.ok) { setTitle(''); setTarget(''); fetchChallenges(selectedGroupId); setMsg('Challenge created!'); }
      else setMsg(data.error);
    } catch {}
  };

  const joinChallenge = async (challengeId) => {
    try {
      const res = await fetch(`${API_BASE}/api/social/group/${selectedGroupId}/challenge/join`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ challengeId }),
      });
      const data = await res.json();
      if (res.ok) { fetchChallenges(selectedGroupId); setMsg('Joined challenge!'); }
      else setMsg(data.error);
    } catch {}
  };

  return (
    <div>
      {msg && <div className={styles.msg}>{msg}</div>}

      <div className={styles.card}>
        <h3 className={styles.sectionTitle}>Select Group</h3>
        <select className={styles.input} value={selectedGroupId} onChange={e => fetchChallenges(e.target.value)}>
          <option value="">-- Select a group --</option>
          {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      {selectedGroupId && (
        <>
          <div className={styles.card}>
            <h3 className={styles.sectionTitle}>Create Challenge</h3>
            <div className={styles.formCol}>
              <input className={styles.input} placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
              <select className={styles.input} value={type} onChange={e => setType(e.target.value)}>
                <option value="study_hours">Study Hours</option>
                <option value="task_completion">Task Completion</option>
                <option value="streak">Streak</option>
              </select>
              <div className={styles.formRow}>
                <input className={styles.input} placeholder="Target" type="number" value={target} onChange={e => setTarget(e.target.value)} />
                <input className={styles.input} placeholder="Unit (e.g. hours)" value={unit} onChange={e => setUnit(e.target.value)} />
              </div>
              <input className={styles.input} placeholder="End date (optional)" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              <button className={styles.btn} onClick={createChallenge}>Create Challenge</button>
            </div>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Challenges ({challenges.length})</h3>
            {challenges.length === 0 ? <p className={styles.muted}>No challenges yet.</p> : (
              challenges.map(c => (
                <div key={c.id} className={styles.card}>
                  <div className={styles.challengeHeader}>
                    <strong>{c.title}</strong>
                    <span className={styles.tag}>{c.type.replace('_', ' ')}</span>
                  </div>
                  <p className={styles.muted}>Target: {c.target} {c.unit}</p>
                  {c.endDate && <p className={styles.muted}>Ends: {new Date(c.endDate).toLocaleDateString()}</p>}
                  <p className={styles.muted}>Participants: {c.participants?.length || 0}</p>
                  {!c.participants?.some(p => p.userId === userId) && (
                    <button className={styles.btn} onClick={() => joinChallenge(c.id)}>Join</button>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

function LeaderboardTab() {
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/social/groups`, { headers: getAuthHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then(setGroups)
      .catch(() => {});
  }, []);

  const fetchStats = async (groupId) => {
    setSelectedGroupId(groupId);
    if (!groupId) { setStats([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/social/group/${groupId}/stats`, { headers: getAuthHeaders() });
      if (res.ok) setStats(await res.json());
    } catch {} finally { setLoading(false); }
  };

  const sortedStats = [...stats].sort((a, b) => (b.totalHours || 0) - (a.totalHours || 0));

  return (
    <div>
      <div className={styles.card}>
        <h3 className={styles.sectionTitle}>Select Group</h3>
        <select className={styles.input} value={selectedGroupId} onChange={e => fetchStats(e.target.value)}>
          <option value="">-- Select a group --</option>
          {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      {loading && <p className={styles.muted}>Loading stats...</p>}

      {sortedStats.length > 0 && (
        <div className={styles.leaderboard}>
          {sortedStats.map((s, i) => (
            <div key={s.userId} className={styles.lbRow}>
              <span className={styles.lbRank}>#{i + 1}</span>
              <span className={styles.lbUser}>{s.userId}</span>
              {s.totalHours !== undefined && <span className={styles.lbStat}>{s.totalHours}h</span>}
              {s.taskCompletionRate !== undefined && <span className={styles.lbStat}>{s.taskCompletionRate}%</span>}
              {s.todayHours !== undefined && <span className={styles.lbStatSmall}>{s.todayHours}h today</span>}
            </div>
          ))}
        </div>
      )}

      {!loading && selectedGroupId && sortedStats.length === 0 && (
        <p className={styles.muted}>No stats available. Members may have privacy enabled.</p>
      )}
    </div>
  );
}

function PrivacyTab() {
  const [privacy, setPrivacy] = useState(null);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/social/privacy`, { headers: getAuthHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(setPrivacy)
      .catch(() => {});
  }, []);

  const toggle = (key) => {
    setPrivacy(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/social/privacy`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(privacy),
      });
      if (res.ok) setMsg('Privacy settings saved!');
      else setMsg('Failed to save');
    } catch { setMsg('Failed to save'); } finally { setSaving(false); }
  };

  if (!privacy) return <p className={styles.muted}>Loading...</p>;

  const fields = [
    { key: 'showStudyHours', label: 'Share study hours' },
    { key: 'showTaskRate', label: 'Share task completion rate' },
    { key: 'showScore', label: 'Share Crymson Score' },
    { key: 'showFinance', label: 'Share finance status' },
    { key: 'showStreak', label: 'Share study streak' },
  ];

  return (
    <div>
      {msg && <div className={styles.msg}>{msg}</div>}
      <div className={styles.card}>
        <h3 className={styles.sectionTitle}>Privacy Controls</h3>
        <p className={styles.muted}>Choose what to share with friends and group members.</p>
        <div className={styles.privacyList}>
          {fields.map(f => (
            <label key={f.key} className={styles.privacyRow}>
              <span>{f.label}</span>
              <input
                type="checkbox"
                checked={privacy[f.key]}
                onChange={() => toggle(f.key)}
              />
            </label>
          ))}
        </div>
        <button className={styles.btn} onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
      </div>
    </div>
  );
}

export default function Social({ activeUserId }) {
  const [tab, setTab] = useState('friends');

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Social</p>
          <h1 className={styles.title}>Study Together</h1>
          <p className={styles.subtitle}>Connect with friends, join study groups, and stay motivated together.</p>
        </div>
      </div>

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      <div className={styles.content}>
        {tab === 'friends' && <FriendsTab userId={activeUserId} />}
        {tab === 'groups' && <GroupsTab userId={activeUserId} />}
        {tab === 'leaderboard' && <LeaderboardTab />}
        {tab === 'challenges' && <ChallengesTab userId={activeUserId} />}
        {tab === 'privacy' && <PrivacyTab />}
      </div>
    </div>
  );
}
