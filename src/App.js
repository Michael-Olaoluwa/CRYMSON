import React, { useEffect, useState } from 'react';
import Landing from './pages/Landing.jsx';
import CGPATracker from './pages/CGPATracker';
import ToDoPlanner from './pages/ToDoPlanner';
import UserHome from './pages/UserHome';

const APP_STATE_KEY = 'crymson_app_state';
const ALLOWED_PAGES = new Set(['landing', 'home', 'cgpa', 'todo']);

const getInitialAppState = () => {
  try {
    const raw = localStorage.getItem(APP_STATE_KEY);
    if (!raw) {
      return { currentPage: 'landing', activeUserId: '' };
    }

    const parsed = JSON.parse(raw);
    const page = typeof parsed.currentPage === 'string' && ALLOWED_PAGES.has(parsed.currentPage)
      ? parsed.currentPage
      : 'landing';
    const userId = typeof parsed.activeUserId === 'string' ? parsed.activeUserId : '';

    return { currentPage: page, activeUserId: userId };
  } catch (error) {
    return { currentPage: 'landing', activeUserId: '' };
  }
};

function App() {
  const [currentPage, setCurrentPage] = useState(() => getInitialAppState().currentPage);
  const [activeUserId, setActiveUserId] = useState(() => getInitialAppState().activeUserId);

  useEffect(() => {
    localStorage.setItem(
      APP_STATE_KEY,
      JSON.stringify({ currentPage, activeUserId })
    );
  }, [currentPage, activeUserId]);

  const navigateToCGPA = () => {
    setCurrentPage('cgpa');
  };

  const navigateToTodo = () => {
    setCurrentPage('todo');
  };

  const navigateToUserHome = (userId) => {
    setActiveUserId(userId);
    setCurrentPage('home');
  };

  const navigateHome = () => {
    setCurrentPage('landing');
  };

  const handleLogout = () => {
    setActiveUserId('');
    setCurrentPage('landing');
  };

  return (
    <div className="App">
      {currentPage === 'landing' && (
        <Landing
          onNavigateToCGPA={navigateToCGPA}
          onNavigateToTodo={navigateToTodo}
          onLoginSuccess={navigateToUserHome}
        />
      )}

      {currentPage === 'home' && (
        <UserHome
          userId={activeUserId}
          onNavigateToCGPA={navigateToCGPA}
          onNavigateToTodo={navigateToTodo}
          onLogout={handleLogout}
        />
      )}

      {currentPage === 'cgpa' && (
        <CGPATracker onNavigateHome={navigateHome} />
      )}

      {currentPage === 'todo' && (
        <ToDoPlanner onNavigateHome={navigateHome} />
      )}
    </div>
  );
}

export default App;
