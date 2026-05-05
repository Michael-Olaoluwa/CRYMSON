/**
 * src/hooks/useGamification.js
 * Custom hook for gamification features
 */

import { useState, useEffect, useCallback } from "react";
import { GamificationEngine } from "../utils/gamification";
import { adaptiveNotifications } from "../utils/adaptiveNotifications";

export function useGamification(userId) {
  const [engine, setEngine] = useState(null);
  const [badges, setBadges] = useState([]);
  const [progress, setProgress] = useState(null);
  const [completionStats, setCompletionStats] = useState(null);
  const [nextBadge, setNextBadge] = useState(null);

  // Initialize engine
  useEffect(() => {
    if (userId) {
      const gamEngine = new GamificationEngine(userId);
      setEngine(gamEngine);
      setBadges(gamEngine.getEarnedBadges());
      setProgress(gamEngine.getProgress());
      setCompletionStats(gamEngine.getCompletionStats());
      setNextBadge(gamEngine.getNextBadge());
    }
  }, [userId]);

  // Track new badge
  const notifyNewBadge = useCallback(
    (badge) => {
      setBadges((prev) => [...prev, badge]);
      adaptiveNotifications.notifyAchievement(badge.definition);
    },
    []
  );

  // Track study session
  const trackStudySession = useCallback(
    (startTime) => {
      if (!engine) return;

      const earnedBadges = engine.trackStudySession(startTime);
      if (earnedBadges.length > 0) {
        earnedBadges.forEach(notifyNewBadge);
      }

      setProgress(engine.getProgress());
      setCompletionStats(engine.getCompletionStats());
    },
    [engine, notifyNewBadge]
  );

  // Track streak update
  const updateStreak = useCallback(
    (sessionDate) => {
      if (!engine) return;

      const earnedBadges = engine.updateStreak(sessionDate);
      if (earnedBadges.length > 0) {
        earnedBadges.forEach(notifyNewBadge);
      }

      setProgress(engine.getProgress());
      setCompletionStats(engine.getCompletionStats());
    },
    [engine, notifyNewBadge]
  );

  // Track task completion
  const trackTaskCompletion = useCallback(() => {
    if (!engine) return;

    const earnedBadges = engine.trackTaskCompletion();
    if (earnedBadges.length > 0) {
      earnedBadges.forEach(notifyNewBadge);
    }

    setProgress(engine.getProgress());
    setCompletionStats(engine.getCompletionStats());
  }, [engine, notifyNewBadge]);

  // Track finance entry
  const trackFinanceEntry = useCallback(() => {
    if (!engine) return;

    const earnedBadges = engine.trackFinanceEntry();
    if (earnedBadges.length > 0) {
      earnedBadges.forEach(notifyNewBadge);
    }

    setProgress(engine.getProgress());
    setCompletionStats(engine.getCompletionStats());
  }, [engine, notifyNewBadge]);

  // Check CGPA goal
  const checkCgpaGoal = useCallback(
    (currentCgpa, goalCgpa) => {
      if (!engine) return;

      const badge = engine.checkCgpaGoal(currentCgpa, goalCgpa);
      if (badge) {
        notifyNewBadge(badge);
        setProgress(engine.getProgress());
        setCompletionStats(engine.getCompletionStats());
      }
    },
    [engine, notifyNewBadge]
  );

  return {
    badges,
    progress,
    completionStats,
    nextBadge,
    trackStudySession,
    updateStreak,
    trackTaskCompletion,
    trackFinanceEntry,
    checkCgpaGoal,
  };
}

export default useGamification;
