import React, { useEffect, useState } from 'react';
import WelcomeScreen from './screens/WelcomeScreen.jsx';
import GradeTrackerScreen from './screens/GradeTrackerScreen';
import TaskPlannerScreen from './screens/TaskPlannerScreen';
import HomeScreen from './screens/HomeScreen';
import MyGradeTrackerScreen from './screens/MyGradeTrackerScreen';
import TimeTrackerScreen from './screens/TimeTrackerScreen';
import FinanceTrackerScreen from './screens/FinanceTrackerScreen';
import Admin from './pages/Admin';
import { TimerProvider } from './context/TimerContext';
import { clearAuthSession, getAuthToken, setAuthToken } from './utils/authSession';

const AUTH_API_BASE_URL = process.env.REACT_APP_API_BASE_URL
  || `${window.location.protocol}//${window.location.hostname}:5000`;
const APP_STATE_KEY = 'crymson_app_state';
const ALLOWED_PAGES = new Set(['landing', 'home', 'cgpa', 'user-cgpa', 'todo', 'time', 'finance', 'admin']);

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

const clearSessionStorage = () => {
  localStorage.removeItem(APP_STATE_KEY);
  clearAuthSession();
};

function App() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [activeUserId, setActiveUserId] = useState('');
  const [activeUserName, setActiveUserName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const restoreFromValidSession = async () => {
      const token = getAuthToken();
      const savedState = getSavedAppState();

      if (!token) {
        clearSessionStorage();
        return;
      }

      try {
        const response = await fetch(`${AUTH_API_BASE_URL}/api/auth/session`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        const payload = await response.json().catch(() => ({}));

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
          : (payload?.user?.isAdmin ? 'admin' : 'home');

        if (!restoredUserId) {
          throw new Error('Invalid session user.');
        }

        setActiveUserId(restoredUserId);
        setActiveUserName(restoredUserName);
        setIsAdmin(Boolean(payload?.user?.isAdmin));
        setCurrentPage(Boolean(payload?.user?.isAdmin) && restoredPage === 'home' ? 'admin' : restoredPage);
      } catch (error) {
        if (isCancelled) {
          return;
        }

        clearSessionStorage();
        setActiveUserId('');
        setActiveUserName('');
        setIsAdmin(false);
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

  const navigateToAdmin = () => {
    setCurrentPage('admin');
  };

  const navigateToUserHome = (userId, userName, token, adminFlag = false) => {
    if (typeof token === 'string' && token) {
      setAuthToken(token);
    }

    setActiveUserId(userId);
    setActiveUserName(userName || '');
    setIsAdmin(Boolean(adminFlag));
    setCurrentPage(Boolean(adminFlag) ? 'admin' : 'home');
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
            isAdmin={isAdmin}
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
            onNavigateToAdmin={navigateToAdmin}
            onLogout={handleLogout}
            isAdmin={isAdmin}
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

        {currentPage === 'admin' && (
          <Admin onNavigateHome={() => setCurrentPage('home')} />
        )}
      </div>
    </TimerProvider>
  );
}

export default App;
