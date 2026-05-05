/**
 * Gamification system for CRYMSON
 * Badges, streaks, achievements, and milestone tracking
 */

export const BADGE_TYPES = {
  STREAK_7: "streak_7",
  STREAK_30: "streak_30",
  STREAK_100: "streak_100",
  CGPA_GOAL: "cgpa_goal",
  TASK_MASTER: "task_master",
  FINANCE_NINJA: "finance_ninja",
  EARLY_BIRD: "early_bird",
  NIGHT_OWL: "night_owl",
  CONSISTENCY: "consistency",
  PERFECT_WEEK: "perfect_week",
};

const BADGE_DEFINITIONS = {
  [BADGE_TYPES.STREAK_7]: {
    title: "On Fire 🔥",
    description: "7-day study streak",
    icon: "🔥",
    rarity: "common",
  },
  [BADGE_TYPES.STREAK_30]: {
    title: "Legend 👑",
    description: "30-day study streak",
    icon: "👑",
    rarity: "rare",
  },
  [BADGE_TYPES.STREAK_100]: {
    title: "Unstoppable ⚡",
    description: "100-day study streak",
    icon: "⚡",
    rarity: "legendary",
  },
  [BADGE_TYPES.CGPA_GOAL]: {
    title: "Scholar 📚",
    description: "Reached CGPA goal",
    icon: "📚",
    rarity: "epic",
  },
  [BADGE_TYPES.TASK_MASTER]: {
    title: "Task Master ✓",
    description: "Completed 50 tasks",
    icon: "✓",
    rarity: "rare",
  },
  [BADGE_TYPES.FINANCE_NINJA]: {
    title: "Finance Ninja 💰",
    description: "Logged 100 finance entries",
    icon: "💰",
    rarity: "rare",
  },
  [BADGE_TYPES.EARLY_BIRD]: {
    title: "Early Bird 🌅",
    description: "Study session before 6 AM",
    icon: "🌅",
    rarity: "uncommon",
  },
  [BADGE_TYPES.NIGHT_OWL]: {
    title: "Night Owl 🌙",
    description: "Study session after 10 PM",
    icon: "🌙",
    rarity: "uncommon",
  },
  [BADGE_TYPES.CONSISTENCY]: {
    title: "Consistent 📈",
    description: "Study every day for a week",
    icon: "📈",
    rarity: "uncommon",
  },
  [BADGE_TYPES.PERFECT_WEEK]: {
    title: "Perfect Week ⭐",
    description: "Complete all tasks in a week",
    icon: "⭐",
    rarity: "rare",
  },
};

export class GamificationEngine {
  constructor(userId) {
    this.userId = userId;
    this.badges = this.loadBadges();
    this.progress = this.loadProgress();
  }

  /**
   * Load earned badges
   */
  loadBadges() {
    const stored = localStorage.getItem(
      `crymson_badges:${this.userId}`
    );
    return stored ? JSON.parse(stored) : [];
  }

  /**
   * Load progress toward badges
   */
  loadProgress() {
    const stored = localStorage.getItem(
      `crymson_badge_progress:${this.userId}`
    );
    return (
      JSON.parse(stored) || {
        tasksCompleted: 0,
        financeEntriesLogged: 0,
        currentStreak: 0,
        bestStreak: 0,
        studySessionsEarlyBird: 0,
        studySessionsNightOwl: 0,
        lastStudyDate: null,
      }
    );
  }

  /**
   * Save badges to localStorage
   */
  saveBadges() {
    localStorage.setItem(
      `crymson_badges:${this.userId}`,
      JSON.stringify(this.badges)
    );
  }

  /**
   * Save progress to localStorage
   */
  saveProgress() {
    localStorage.setItem(
      `crymson_badge_progress:${this.userId}`,
      JSON.stringify(this.progress)
    );
  }

  /**
   * Earn a badge (if not already earned)
   */
  earnBadge(badgeType) {
    if (!this.badges.find((b) => b.type === badgeType)) {
      const badge = {
        type: badgeType,
        definition: BADGE_DEFINITIONS[badgeType],
        earnedAt: new Date().toISOString(),
      };
      this.badges.push(badge);
      this.saveBadges();
      return badge;
    }
    return null; // Already earned
  }

  /**
   * Update streak and check for streak badges
   */
  updateStreak(sessionDate) {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const sessionDateStr = new Date(sessionDate).toDateString();

    // Check if session is today or yesterday
    if (sessionDateStr === today) {
      this.progress.lastStudyDate = today;
      // Streak continues
    } else if (sessionDateStr === yesterday && this.progress.lastStudyDate === yesterday) {
      this.progress.currentStreak += 1;
      this.progress.lastStudyDate = today;
    } else if (sessionDateStr !== today && sessionDateStr !== yesterday) {
      // Streak broken
      this.progress.currentStreak = 1;
      this.progress.lastStudyDate = sessionDateStr;
    }

    // Update best streak
    if (this.progress.currentStreak > this.progress.bestStreak) {
      this.progress.bestStreak = this.progress.currentStreak;
    }

    this.saveProgress();

    // Check for streak badges
    const earnedBadges = [];
    if (this.progress.currentStreak === 7) {
      const badge = this.earnBadge(BADGE_TYPES.STREAK_7);
      if (badge) earnedBadges.push(badge);
    }
    if (this.progress.currentStreak === 30) {
      const badge = this.earnBadge(BADGE_TYPES.STREAK_30);
      if (badge) earnedBadges.push(badge);
    }
    if (this.progress.currentStreak === 100) {
      const badge = this.earnBadge(BADGE_TYPES.STREAK_100);
      if (badge) earnedBadges.push(badge);
    }

    return earnedBadges;
  }

  /**
   * Track task completion
   */
  trackTaskCompletion() {
    this.progress.tasksCompleted += 1;
    this.saveProgress();

    const earnedBadges = [];
    if (this.progress.tasksCompleted === 50) {
      const badge = this.earnBadge(BADGE_TYPES.TASK_MASTER);
      if (badge) earnedBadges.push(badge);
    }

    return earnedBadges;
  }

  /**
   * Track finance entry
   */
  trackFinanceEntry() {
    this.progress.financeEntriesLogged += 1;
    this.saveProgress();

    const earnedBadges = [];
    if (this.progress.financeEntriesLogged === 100) {
      const badge = this.earnBadge(BADGE_TYPES.FINANCE_NINJA);
      if (badge) earnedBadges.push(badge);
    }

    return earnedBadges;
  }

  /**
   * Track time-based session
   */
  trackStudySession(startTime) {
    const hour = new Date(startTime).getHours();
    const earnedBadges = [];

    if (hour < 6) {
      this.progress.studySessionsEarlyBird += 1;
      if (this.progress.studySessionsEarlyBird === 1) {
        const badge = this.earnBadge(BADGE_TYPES.EARLY_BIRD);
        if (badge) earnedBadges.push(badge);
      }
    }

    if (hour >= 22 || hour < 6) {
      this.progress.studySessionsNightOwl += 1;
      if (this.progress.studySessionsNightOwl === 1) {
        const badge = this.earnBadge(BADGE_TYPES.NIGHT_OWL);
        if (badge) earnedBadges.push(badge);
      }
    }

    this.saveProgress();
    return earnedBadges;
  }

  /**
   * Check for CGPA goal badge
   */
  checkCgpaGoal(currentCgpa, goalCgpa) {
    if (currentCgpa >= goalCgpa) {
      return this.earnBadge(BADGE_TYPES.CGPA_GOAL);
    }
    return null;
  }

  /**
   * Get all earned badges
   */
  getEarnedBadges() {
    return this.badges;
  }

  /**
   * Get progress toward badges
   */
  getProgress() {
    return this.progress;
  }

  /**
   * Calculate completion percentage for display
   */
  getCompletionStats() {
    return {
      streakProgress: Math.min(
        (this.progress.currentStreak / 30) * 100,
        100
      ),
      tasksProgress: Math.min(
        (this.progress.tasksCompleted / 50) * 100,
        100
      ),
      financeProgress: Math.min(
        (this.progress.financeEntriesLogged / 100) * 100,
        100
      ),
    };
  }

  /**
   * Get next achievable badge
   */
  getNextBadge() {
    const badgeOrder = [
      BADGE_TYPES.EARLY_BIRD,
      BADGE_TYPES.NIGHT_OWL,
      BADGE_TYPES.STREAK_7,
      BADGE_TYPES.TASK_MASTER,
      BADGE_TYPES.FINANCE_NINJA,
      BADGE_TYPES.STREAK_30,
      BADGE_TYPES.CGPA_GOAL,
      BADGE_TYPES.STREAK_100,
    ];

    for (const badgeType of badgeOrder) {
      if (!this.badges.find((b) => b.type === badgeType)) {
        return BADGE_DEFINITIONS[badgeType];
      }
    }

    return null; // All badges earned
  }
}

export default GamificationEngine;
