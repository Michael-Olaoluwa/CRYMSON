/**
 * src/utils/accessibility.js
 * Accessibility helpers and ARIA labels for components
 */

/**
 * Generate ARIA label for progress elements
 */
export function getAriaProgressLabel(value, max, label) {
  const percentage = ((value / max) * 100).toFixed(0);
  return `${label}: ${percentage}% complete`;
}

/**
 * Generate ARIA label for notifications
 */
export function getAriaNotificationLabel(title, body, priority) {
  return `${priority} notification: ${title}. ${body}`;
}

/**
 * Generate ARIA label for badges
 */
export function getAriaBadgeLabel(badge) {
  return `${badge.title}: ${badge.description}. Rarity: ${badge.rarity}`;
}

/**
 * Generate ARIA label for status indicators
 */
export function getAriaStatusLabel(status) {
  const labels = {
    success: "Success",
    warning: "Warning",
    alert: "Alert",
    info: "Information",
  };
  return labels[status] || status;
}

/**
 * Screen reader only class styles
 * Add to className to hide from sighted users but readable by screen readers
 */
export const SCREEN_READER_ONLY_STYLES = {
  srOnly: {
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: "0",
    margin: "-1px",
    overflow: "hidden",
    clip: "rect(0,0,0,0)",
    whiteSpace: "nowrap",
    border: "0",
  },
};

/**
 * Get semantic heading level based on nesting
 */
export function getHeadingLevel(depth = 1) {
  const level = Math.min(Math.max(depth, 1), 6);
  return `h${level}`;
}

/**
 * Create accessible form field with label
 */
export function createAccessibleFormField(id, label, type = "text", required = false) {
  return {
    id,
    label,
    type,
    required,
    ariaLabel: `${label}${required ? ", required" : ""}`,
    ariaRequired: required,
  };
}

/**
 * Format time for accessibility
 */
export function formatAccessibleTime(hours, minutes) {
  const parts = [];
  if (hours > 0) {
    parts.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
  }
  if (minutes > 0) {
    parts.push(`${minutes} ${minutes === 1 ? "minute" : "minutes"}`);
  }
  return parts.join(" and ");
}

/**
 * Format number with thousand separator for accessibility
 */
export function formatAccessibleNumber(num) {
  return new Intl.NumberFormat().format(num);
}

/**
 * Create accessible button with proper ARIA attributes
 */
export function createAccessibleButton(label, action, disabled = false) {
  return {
    label,
    action,
    role: "button",
    tabIndex: 0,
    ariaDisabled: disabled,
    disabled,
  };
}

/**
 * Create accessible list item
 */
export function createAccessibleListItem(content, ariaLabel = null) {
  return {
    role: "listitem",
    content,
    ariaLabel: ariaLabel || content,
  };
}

/**
 * Create accessible modal
 */
export function createAccessibleModal(id, title, content, onClose) {
  return {
    id,
    title,
    content,
    onClose,
    role: "dialog",
    ariaModal: true,
    ariaLabelledBy: `${id}-title`,
    ariaDescribedBy: `${id}-content`,
  };
}

/**
 * Key navigation handler for custom interactive elements
 */
export function handleAccessibleKeydown(e, action) {
  // Space or Enter to activate
  if (e.key === " " || e.key === "Enter") {
    e.preventDefault();
    action();
  }
  // Escape to close/cancel
  if (e.key === "Escape") {
    // Close handler should be passed separately
  }
}

export default {
  getAriaProgressLabel,
  getAriaNotificationLabel,
  getAriaBadgeLabel,
  getAriaStatusLabel,
  SCREEN_READER_ONLY_STYLES,
  getHeadingLevel,
  createAccessibleFormField,
  formatAccessibleTime,
  formatAccessibleNumber,
  createAccessibleButton,
  createAccessibleListItem,
  createAccessibleModal,
  handleAccessibleKeydown,
};
