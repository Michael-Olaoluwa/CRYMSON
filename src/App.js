import React, { useEffect, useState } from 'react';
import WelcomeScreen from './screens/WelcomeScreen.jsx';
import GradeTrackerScreen from './screens/GradeTrackerScreen';
import TaskPlannerScreen from './screens/TaskPlannerScreen';
import HomeScreen from './screens/HomeScreen';
import MyGradeTrackerScreen from './screens/MyGradeTrackerScreen';
import TimeTrackerScreen from './screens/TimeTrackerScreen';
import FinanceTrackerScreen from './screens/FinanceTrackerScreen';
import { TimerProvider } from './context/TimerContext';
import { getApiBaseUrl } from './utils/apiBaseUrl';

const AUTH_API_BASE_URL = getApiBaseUrl();
const APP_STATE_KEY = 'crymson_app_state';
const AUTH_SESSION_KEY = 'crymson_auth_session';
const ALLOWED_PAGES = new Set(['landing', 'home', 'cgpa', 'user-cgpa', 'todo', 'time', 'finance']);

const getSavedAppState = () => {
  try {
    const raw = localStorage.getItem(APP_STATE_KEY);
    if (!raw) {
      return { currentPage: 'landing', activeUserId: '', activeUserName: '' };
    }

    const parsed = JSON.parse(raw);
    const page = typeof parsed.currentPage === 'string' && ALLOWED_PAGES.has(parsed.currentPage)
      ? parsed.currentPage
      : 'landing';
    const userId = typeof parsed.activeUserId === 'string' ? parsed.activeUserId : '';
    const userName = typeof parsed.activeUserName === 'string' ? parsed.activeUserName : '';

    return { currentPage: page, activeUserId: userId, activeUserName: userName };
  } catch (error) {
    return { currentPage: 'landing', activeUserId: '', activeUserName: '' };
  }
};

const getStoredToken = () => {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) {
      return '';
    }

    const parsed = JSON.parse(raw);
    return typeof parsed.accessToken === 'string'
      ? parsed.accessToken
      : (typeof parsed.token === 'string' ? parsed.token : '');
  } catch (error) {
    return '';
  }
};

const getStoredRefreshToken = () => {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) {
      return '';
    }

    const parsed = JSON.parse(raw);
    return typeof parsed.refreshToken === 'string' ? parsed.refreshToken : '';
  } catch (error) {
    return '';
  }
};

const storeAuthSession = (session) => {
  if (!session) {
    return;
  }

  const accessToken = typeof session.accessToken === 'string'
    ? session.accessToken
    : (typeof session.token === 'string' ? session.token : '');
  const refreshToken = typeof session.refreshToken === 'string' ? session.refreshToken : '';

  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({
    accessToken,
    refreshToken,
    token: accessToken,
  }));
};

const clearSessionStorage = () => {
  localStorage.removeItem(AUTH_SESSION_KEY);
  localStorage.removeItem(APP_STATE_KEY);
};

function App() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [activeUserId, setActiveUserId] = useState('');
  const [activeUserName, setActiveUserName] = useState('');

  useEffect(() => {
    let isCancelled = false;

    const refreshSession = async () => {
      const refreshToken = getStoredRefreshToken();
      if (!refreshToken) {
        return false;
      }

      try {
        const response = await fetch(`${AUTH_API_BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          return false;
        }

        storeAuthSession(payload);
        return true;
      } catch (error) {
        return false;
      }
    };

    const restoreFromValidSession = async () => {
      const token = getStoredToken();
      const savedState = getSavedAppState();

      if (!token) {
        clearSessionStorage();
        return;
      }

      try {
        let response = await fetch(`${AUTH_API_BASE_URL}/api/auth/session`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        let payload = await response.json().catch(() => ({}));

        if (!response.ok && getStoredRefreshToken()) {
          const refreshed = await refreshSession();
          if (refreshed) {
            const renewedToken = getStoredToken();
            response = await fetch(`${AUTH_API_BASE_URL}/api/auth/session`, {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${renewedToken}`
              }
            });
            payload = await response.json().catch(() => ({}));
          }
        }

        if (!response.ok) {
          throw new Error(payload.message || 'Invalid session.');
        }

        if (isCancelled) {
          return;
        }

        const restoredUserId = payload?.user?.crymsonId || savedState.activeUserId;
        const restoredUserName = payload?.user?.fullName || savedState.activeUserName;
        const restoredPage = savedState.currentPage && savedState.currentPage !== 'landing'
          ? savedState.currentPage
          : 'home';

        if (!restoredUserId) {
          throw new Error('Invalid session user.');
        }

        setActiveUserId(restoredUserId);
        setActiveUserName(restoredUserName);
        setCurrentPage(restoredPage);
      } catch (error) {
        if (isCancelled) {
          return;
        }

        clearSessionStorage();
        setActiveUserId('');
        setActiveUserName('');
        setCurrentPage('landing');
      }
    };

    restoreFromValidSession();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(
      APP_STATE_KEY,
      JSON.stringify({ currentPage, activeUserId, activeUserName })
    );
  }, [currentPage, activeUserId, activeUserName]);

  const navigateToCGPA = () => {
    setCurrentPage('cgpa');
  };

  const navigateToUserCGPA = () => {
    setCurrentPage('user-cgpa');
  };

  const navigateToTodo = () => {
    setCurrentPage('todo');
  };

  const navigateToTimeTracker = () => {
    setCurrentPage('time');
  };

  const navigateToFinanceTracker = () => {
    setCurrentPage('finance');
  };

  const navigateToUserHome = (userId, userName, session) => {
    if (session && typeof session === 'object') {
      storeAuthSession(session);
    } else if (typeof session === 'string' && session) {
      storeAuthSession({ accessToken: session, token: session, refreshToken: '' });
    }

    setActiveUserId(userId);
    setActiveUserName(userName || '');
    setCurrentPage('home');
  };

  const navigateHome = () => {
    setCurrentPage('landing');
  };

  const handleLogout = () => {
    clearSessionStorage();
    setActiveUserId('');
    setActiveUserName('');
    setCurrentPage('landing');
  };

  return (
    <TimerProvider>
      <div className="App">
        {currentPage === 'landing' && (
          <WelcomeScreen
            onNavigateToCGPA={navigateToCGPA}
            onNavigateToTodo={navigateToTodo}
            onNavigateToTime={navigateToTimeTracker}
            onNavigateToFinance={navigateToFinanceTracker}
            onLoginSuccess={navigateToUserHome}
          />
        )}

        {currentPage === 'home' && (
          <HomeScreen
            userId={activeUserId}
            userName={activeUserName}
            onNavigateToUserCGPA={navigateToUserCGPA}
            onNavigateToTodo={navigateToTodo}
            onNavigateToTime={navigateToTimeTracker}
            onNavigateToFinance={navigateToFinanceTracker}
            onLogout={handleLogout}
          />
        )}

        {currentPage === 'cgpa' && (
          <GradeTrackerScreen onNavigateHome={navigateHome} />
        )}

        {currentPage === 'user-cgpa' && (
          <MyGradeTrackerScreen activeUserId={activeUserId} onNavigateHome={() => setCurrentPage('home')} />
        )}

        {currentPage === 'todo' && (
          <TaskPlannerScreen activeUserId={activeUserId} onNavigateHome={() => setCurrentPage('home')} />
        )}

        {currentPage === 'time' && (
          <TimeTrackerScreen
            activeUserId={activeUserId}
            onNavigateHome={() => setCurrentPage(activeUserId ? 'home' : 'landing')}
          />
        )}

        {currentPage === 'finance' && (
          <FinanceTrackerScreen
            activeUserId={activeUserId}
            onNavigateHome={() => setCurrentPage(activeUserId ? 'home' : 'landing')}
          />
        )}
      </div>
    </TimerProvider>
  );
}

export default App;
