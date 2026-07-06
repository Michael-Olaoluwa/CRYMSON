/**
 * src/components/BadgesPanel.jsx
 * Display earned badges and progress toward next badge
 */

import React from "react";
import styles from "./BadgesPanel.module.css";
import { iconMap, TrophyIcon, RocketIcon } from "../utils/icons";

const BadgeIcon = ({ icon }) => {
  const Icon = iconMap[icon];
  return Icon ? <Icon /> : null;
};

export const BadgesPanel = ({
  badges = [],
  nextBadge = null,
  completionStats = {},
}) => {
  const getProgressText = (nextBadge) => {
    if (!nextBadge) return "All badges earned!";

    switch (nextBadge.icon) {
      case "fire":
        return `${Math.ceil((completionStats.streakProgress || 0) / 10)}% to 7-day streak`;
      case "check":
        return `${Math.ceil((completionStats.tasksProgress || 0) / 50)}% of tasks completed`;
      case "money":
        return `${Math.ceil((completionStats.financeProgress || 0) / 100)}% of finance entries`;
      default:
        return "Keep going!";
    }
  };

  return (
    <div className={styles.container}>
      <h3>Achievements</h3>

      {/* Earned badges grid */}
      {badges.length > 0 && (
        <div className={styles.section}>
          <h4>Earned Badges ({badges.length})</h4>
          <div className={styles.badgesGrid}>
            {badges.map((badge) => (
              <div key={badge.type} className={styles.badge}>
                <div className={styles.badgeIcon}>
                  <BadgeIcon icon={badge.definition.icon} />
                </div>
                <div className={styles.badgeTitle}>
                  {badge.definition.title}
                </div>
                <div className={styles.badgeDesc}>
                  {badge.definition.description}
                </div>
                <div className={styles.badgeRarity}>
                  {badge.definition.rarity}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next badge progress */}
      {nextBadge && (
        <div className={styles.section}>
          <h4>Next Achievement</h4>
          <div className={styles.nextBadge}>
            <div className={styles.nextBadgeIcon}>
              <BadgeIcon icon={nextBadge.icon} />
            </div>
            <div className={styles.nextBadgeContent}>
              <div className={styles.nextBadgeTitle}>
                {nextBadge.title}
              </div>
              <div className={styles.nextBadgeDesc}>
                {nextBadge.description}
              </div>
              <div className={styles.progressText}>
                {getProgressText(nextBadge)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {badges.length === 0 && !nextBadge && (
        <div className={styles.empty}>
          <p><RocketIcon /> Start using Crymson to earn badges!</p>
        </div>
      )}
    </div>
  );
};

export default BadgesPanel;
