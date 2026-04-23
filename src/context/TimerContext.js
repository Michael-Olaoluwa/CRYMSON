import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const TimerContext = createContext();

const TIMER_STORAGE_KEY = 'crymson_active_timer';

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within TimerProvider');
  }
  return context;
};

export const TimerProvider = ({ children }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sessionStartIso, setSessionStartIso] = useState('');
  const [activeUserId, setActiveUserId] = useState('guest');
  const timerRef = useRef(null);
  const hasHydratedRef = useRef(false);

  // Load timer state from localStorage on mount
  useEffect(() => {
    if (hasHydratedRef.current) return;
    hasHydratedRef.current = true;

    try {
      const stored = localStorage.getItem(TIMER_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.isRunning && data.sessionStartIso) {
          // Calculate elapsed time since the session was started
          const startTime = new Date(data.sessionStartIso).getTime();
          const now = Date.now();
          const elapsedMs = now - startTime;
          const elapsed = Math.floor(elapsedMs / 1000);

          setSessionStartIso(data.sessionStartIso);
          setElapsedSeconds(elapsed);
          setIsRunning(true);
        }
      }
    } catch (error) {
      console.error('Failed to hydrate timer state:', error);
    }
  }, []);

  // Persist timer state to localStorage
  useEffect(() => {
    if (!hasHydratedRef.current) return;

    const timerData = {
      isRunning,
      sessionStartIso,
      elapsedSeconds,
    };

    try {
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timerData));
    } catch (error) {
      console.error('Failed to persist timer state:', error);
    }
  }, [isRunning, sessionStartIso, elapsedSeconds]);

  // Timer interval effect
  useEffect(() => {
    if (!isRunning) {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      return undefined;
    }

    timerRef.current = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [isRunning]);

  const startTimer = useCallback(() => {
    if (isRunning) return;
    const now = new Date().toISOString();
    setSessionStartIso(now);
    setIsRunning(true);
  }, [isRunning]);

  const stopTimer = useCallback(() => {
    setIsRunning(false);
  }, []);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    setElapsedSeconds(0);
    setSessionStartIso('');
    localStorage.removeItem(TIMER_STORAGE_KEY);
  }, []);

  const clearTimerData = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  const value = {
    isRunning,
    elapsedSeconds,
    sessionStartIso,
    activeUserId,
    setActiveUserId,
    startTimer,
    stopTimer,
    resetTimer,
    clearTimerData,
    setElapsedSeconds,
    setSessionStartIso,
  };

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
};
