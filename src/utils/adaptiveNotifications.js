/**
 * Adaptive Notifications System
 * Smart notification delivery based on:
 * - User activity (quiet times vs active)
 * - Urgency level of the notification
 * - Already notified status
 * - User preferences
 */

export const NOTIFICATION_PRIORITY = {
  LOW: "low", // Study progress, non-urgent reminders
  MEDIUM: "medium", // Upcoming tasks, recurring plans
  HIGH: "high", // Imminent deadlines (< 1 hour)
  CRITICAL: "critical", // Exam starts now, overdue critical items
};

export class AdaptiveNotificationManager {
  constructor() {
    this.notificationLog = new Map(); // Track shown notifications
    this.userActivityMonitor = null;
    this.preferences = this.loadPreferences();
    this.initActivityMonitoring();
  }

  /**
   * Load user notification preferences
   */
  loadPreferences() {
    const stored = localStorage.getItem("crymson_notification_prefs");
    return (
      JSON.parse(stored) || {
        enableNotifications: true,
        quietHours: { start: 22, end: 8 }, // 10 PM to 8 AM
        minTimeBetweenNotifications: 5, // 5 minutes
        priorityThreshold: NOTIFICATION_PRIORITY.MEDIUM, // Only show medium and above by default
      }
    );
  }

  /**
   * Save preferences to localStorage
   */
  savePreferences() {
    localStorage.setItem(
      "crymson_notification_prefs",
      JSON.stringify(this.preferences)
    );
  }

  /**
   * Monitor user activity (clicks, focus, etc.)
   */
  initActivityMonitoring() {
    let lastActivity = Date.now();
    this.isUserActive = true;

    const updateActivity = () => {
      lastActivity = Date.now();
      this.isUserActive = true;
    };

    document.addEventListener("click", updateActivity);
    document.addEventListener("keydown", updateActivity);
    window.addEventListener("focus", updateActivity);

    window.addEventListener("blur", () => {
      this.isUserActive = false;
    });

    // Reset activity flag if no interaction for 5 minutes
    setInterval(() => {
      if (Date.now() - lastActivity > 5 * 60 * 1000) {
        this.isUserActive = false;
      }
    }, 60000);
  }

  /**
   * Check if currently in quiet hours
   */
  isInQuietHours() {
    const now = new Date();
    const hour = now.getHours();
    const { start, end } = this.preferences.quietHours;

    if (start < end) {
      return hour >= start || hour < end;
    } else {
      // Wraps around midnight
      return hour >= start || hour < end;
    }
  }

  /**
   * Check if notification was recently shown
   */
  wasRecentlyNotified(key) {
    if (!this.notificationLog.has(key)) return false;

    const lastShown = this.notificationLog.get(key);
    const elapsed = (Date.now() - lastShown) / 1000 / 60; // Minutes
    return elapsed < this.preferences.minTimeBetweenNotifications;
  }

  /**
   * Mark notification as shown
   */
  markAsShown(key) {
    this.notificationLog.set(key, Date.now());
  }

  /**
   * Decide if notification should be shown based on context
   */
  shouldNotify(priority, isCritical = false) {
    // If notifications disabled globally
    if (!this.preferences.enableNotifications) return false;

    // Critical notifications bypass everything except quiet hours
    if (isCritical) {
      return true; // Allow critical even in quiet hours (user can mute later)
    }

    // Check quiet hours
    if (this.isInQuietHours() && priority !== NOTIFICATION_PRIORITY.CRITICAL) {
      return false;
    }

    // Check priority threshold
    const priorityOrder = [
      NOTIFICATION_PRIORITY.LOW,
      NOTIFICATION_PRIORITY.MEDIUM,
      NOTIFICATION_PRIORITY.HIGH,
      NOTIFICATION_PRIORITY.CRITICAL,
    ];
    const currentPriorityIdx = priorityOrder.indexOf(priority);
    const thresholdIdx = priorityOrder.indexOf(this.preferences.priorityThreshold);

    return currentPriorityIdx >= thresholdIdx;
  }

  /**
   * Show smart notification with context
   */
  async notify(title, options = {}) {
    const {
      body = "",
      priority = NOTIFICATION_PRIORITY.MEDIUM,
      dedupeKey = null,
      isCritical = false,
      tag = "crymson",
    } = options;

    // Check dedup
    if (dedupeKey && this.wasRecentlyNotified(dedupeKey)) {
      return false;
    }

    // Check if should notify based on context
    if (!this.shouldNotify(priority, isCritical)) {
      return false;
    }

    // Mark as shown
    if (dedupeKey) {
      this.markAsShown(dedupeKey);
    }

    // Request permission if needed
    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }

    // Show notification
    if (Notification.permission === "granted") {
      new Notification(title, {
        body,
        tag,
        icon: "/crymson-icon.png",
      });
      return true;
    }

    return false;
  }

  /**
   * Adaptive notification helper for tasks
   */
  notifyTaskDue(task, timeRemaining) {
    let priority = NOTIFICATION_PRIORITY.LOW;
    let title = "Task Reminder";

    // Set priority based on time remaining (minutes)
    if (timeRemaining <= 5) {
      priority = NOTIFICATION_PRIORITY.CRITICAL;
      title = "URGENT: Task Due Now!";
    } else if (timeRemaining <= 30) {
      priority = NOTIFICATION_PRIORITY.HIGH;
      title = "Task Due Soon";
    } else if (timeRemaining <= 60) {
      priority = NOTIFICATION_PRIORITY.MEDIUM;
      title = "Task Coming Up";
    }

    return this.notify(title, {
      body: `${task.title} is due in ${Math.ceil(timeRemaining)} minutes`,
      priority,
      dedupeKey: `task_${task.id}`,
      isCritical: timeRemaining <= 5,
    });
  }

  /**
   * Adaptive notification for study reminders
   */
  notifyStudyOpportunity(activity) {
    // Only show if user is not actively using app
    if (this.isUserActive) return false;

    return this.notify("Keep Learning!", {
      body: activity,
      priority: NOTIFICATION_PRIORITY.LOW,
      dedupeKey: `study_${Date.now()}`,
    });
  }

  /**
   * Adaptive notification for achievements
   */
  notifyAchievement(badge) {
    return this.notify("Achievement Unlocked! 🎉", {
      body: badge.description,
      priority: NOTIFICATION_PRIORITY.HIGH,
      dedupeKey: `achievement_${badge.id}`,
      tag: "crymson-achievement",
    });
  }
}

export const adaptiveNotifications = new AdaptiveNotificationManager();

export default AdaptiveNotificationManager;
