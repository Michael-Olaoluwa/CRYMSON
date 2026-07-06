import React, { useState } from 'react';
import styles from './AppLayout.module.css';

const Icons = {
  home: '🏠',
  userCgpa: '🎓',
  todo: '✅',
  time: '⏱️',
  finance: '💰',
  admin: '⚙️',
  logout: '🚪',
};

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: Icons.home },
  { id: 'user-cgpa', label: 'CGPA', icon: Icons.userCgpa },
  { id: 'todo', label: 'Tasks', icon: Icons.todo },
  { id: 'time', label: 'Time', icon: Icons.time },
  { id: 'finance', label: 'Finance', icon: Icons.finance },
  { id: 'admin', label: 'Admin', icon: Icons.admin, adminOnly: true },
];

function AppLayout({ activePage, onNavigate, onLogout, userId, userName, isAdmin = false, darkMode, onToggleDark, children }) {
  const displayName = userName || userId || 'User';
  const [showBadge, setShowBadge] = useState(true);

  const visibleNav = NAV_ITEMS.filter(item => !item.adminOnly || isAdmin);

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.profile}>
          <div className={styles.avatar}>{displayName.charAt(0).toUpperCase()}</div>
          <div className={styles.profileInfo}>
            <span className={styles.profileName}>{displayName}</span>
            <span className={styles.profileRole}>{isAdmin ? 'Admin' : 'Student'}</span>
          </div>
        </div>
        <nav className={styles.nav}>
          {visibleNav.map(item => (
            <button
              key={item.id}
              className={`${styles.navItem} ${activePage === item.id ? styles.navItemActive : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className={styles.themeRow}>
          <span className={styles.themeLabel}>Dark Mode</span>
          <button
            className={styles.toggle}
            role="switch"
            aria-checked={darkMode}
            onClick={onToggleDark}
          >
            <span className={styles.toggleKnob} />
          </button>
        </div>
        <button className={styles.logoutBtn} onClick={onLogout}>
          <span className={styles.navIcon}>{Icons.logout}</span>
          <span className={styles.navLabel}>Log Out</span>
        </button>
      </aside>

      {showBadge && <div className={styles.badge} onClick={() => setShowBadge(false)}>Pro</div>}

      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}

export default AppLayout;
