import React, { useCallback, useEffect, useState } from 'react';
import apiClient from '../utils/apiClient';
import styles from './Social.module.css';

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
      const { data } = await apiClient.get('/api/social/friends');
      setFriends(data.friends || []);
      setRequests(data.friendRequests || []);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFriends(); }, [fetchFriends]);

  const searchUsers = async (q) => {
    setSearchQuery(q);
    if (q.trim().length < 2) { setSearchResults([]); return; }
    try {
      const { data } = await apiClient.get(`/api/auth/users/search?q=${encodeURIComponent(q)}`);
      setSearchResults(data.users || []);
    } catch {}
  };

  const sendRequest = async (target) => {
    try {
      await apiClient.post('/api/social/friend/request', { targetCrymsonId: target });
      setMsg('Request sent!');
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to send request');
    }
  };

  const acceptRequest = async (from) => {
    try {
      await apiClient.post('/api/social/friend/accept', { fromUserId: from });
      fetchFriends();
    } catch {}
  };

  const declineRequest = async (from) => {
    try {
      await apiClient.post('/api/social/friend/decline', { fromUserId: from });
      fetchFriends();
    } catch {}
  };

  const removeFriend = async (friendId) => {
    try {
      await apiClient.post('/api/social/friend/remove', { friendId });
      fetchFriends();
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
      const { data } = await apiClient.get('/api/social/groups');
      setGroups(data);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const createGroup = async () => {
    if (!name.trim()) return;
    try {
      const { data } = await apiClient.post('/api/social/group/create', { name, description: desc });
      setName(''); setDesc(''); fetchGroups(); setMsg(`Group created! Invite code: ${data.inviteCode}`);
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to create group');
    }
  };

  const joinGroup = async () => {
    if (!inviteCode.trim()) return;
    try {
      const { data } = await apiClient.post('/api/social/group/join', { inviteCode });
      setInviteCode(''); fetchGroups(); setMsg(`Joined ${data.name}!`);
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to join group');
    }
  };

  const leaveGroup = async (groupId) => {
    try {
      await apiClient.post('/api/social/group/leave', { groupId });
      setSelectedGroup(null); setGroupStats(null); fetchGroups();
    } catch {}
  };

  const viewGroup = async (groupId) => {
    try {
      const { data: g } = await apiClient.get(`/api/social/group/${groupId}`);
      setSelectedGroup(g);
      try {
        const { data: s } = await apiClient.get(`/api/social/group/${groupId}/stats`);
        setGroupStats(s);
      } catch {
        setGroupStats(null);
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
    apiClient.get('/api/social/groups')
      .then(({ data }) => setGroups(data))
      .catch(() => {});
  }, []);

  const fetchChallenges = async (groupId) => {
    setSelectedGroupId(groupId);
    if (!groupId) { setChallenges([]); return; }
    try {
      const { data } = await apiClient.get(`/api/social/group/${groupId}`);
      setChallenges(data.challenges || []);
    } catch {}
  };

  const createChallenge = async () => {
    if (!title.trim() || !target || !selectedGroupId) return;
    try {
      await apiClient.post(`/api/social/group/${selectedGroupId}/challenge`, {
        title, type, target: Number(target), unit, endDate: endDate || undefined,
      });
      setTitle(''); setTarget(''); fetchChallenges(selectedGroupId); setMsg('Challenge created!');
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to create challenge');
    }
  };

  const joinChallenge = async (challengeId) => {
    try {
      await apiClient.post(`/api/social/group/${selectedGroupId}/challenge/join`, { challengeId });
      fetchChallenges(selectedGroupId); setMsg('Joined challenge!');
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to join challenge');
    }
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
    apiClient.get('/api/social/groups')
      .then(({ data }) => setGroups(data))
      .catch(() => {});
  }, []);

  const fetchStats = async (groupId) => {
    setSelectedGroupId(groupId);
    if (!groupId) { setStats([]); return; }
    setLoading(true);
    try {
      const { data } = await apiClient.get(`/api/social/group/${groupId}/stats`);
      setStats(data);
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
    apiClient.get('/api/social/privacy')
      .then(({ data }) => setPrivacy(data))
      .catch(() => {});
  }, []);

  const toggle = (key) => {
    setPrivacy(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const save = async () => {
    setSaving(true);
    try {
      await apiClient.put('/api/social/privacy', privacy);
      setMsg('Privacy settings saved!');
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
