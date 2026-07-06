import { useState } from "react";
import { useTextDetection } from "../hooks/useTextDetection";
import { getAuthToken } from "../utils/authSession";
import { CheckIcon, SearchIcon, RefreshIcon, CheckSquareIcon, SquareIcon, ThumbsUpIcon, ThumbsDownIcon } from "../utils/icons";
import styles from "./DetectionPrompt.module.css";

const confidenceColor = (c) => {
  if (c >= 0.8) return "var(--color-success, #16a34a)";
  if (c >= 0.5) return "var(--color-warning, #f59e0b)";
  return "var(--color-danger, #dc2626)";
};

export default function DetectionPrompt() {
  const { pendingDetection, isAnalyzing, acceptDetection, dismissDetection, submitFeedback } =
    useTextDetection();
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (!pendingDetection && !isAnalyzing) return null;

  const { detections } = pendingDetection || {};

  const toggleItem = (index) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleAccept = async () => {
    if (!detections) return;
    setAccepting(true);
    const toAccept =
      selectedItems.size > 0
        ? detections.filter((_, i) => selectedItems.has(i))
        : detections;
    const ok = await acceptDetection(toAccept, getAuthToken());
    if (ok) setAccepted(true);
    setAccepting(false);
  };

  const handleDismiss = () => {
    dismissDetection();
    setSelectedItems(new Set());
    setAccepted(false);
  };

  if (accepted) {
    return (
      <div className={styles.overlay}>
        <div className={styles.toast}>
          <div className={styles.header}>
            <span className={styles.icon}><CheckIcon /></span>
            <span className={styles.title}>Tasks added</span>
          </div>
          <button className={styles.closeBtn} onClick={handleDismiss}>×</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.toast}>
        <div className={styles.header}>
          <span className={styles.icon}>
            {isAnalyzing ? <RefreshIcon className={styles.spinningIcon} /> : <SearchIcon />}
          </span>
          <span className={styles.title}>
            {isAnalyzing ? "Analyzing text..." : "Tasks detected"}
          </span>
          {isAnalyzing && <span className={styles.spinner} />}
        </div>

        {!isAnalyzing && detections?.length > 0 && (
          <>
            <ul className={styles.list}>
              {detections.slice(0, expanded ? detections.length : 3).map((d, i) => {
                const selected = selectedItems.size === 0 || selectedItems.has(i);
                return (
                  <li
                    key={i}
                    className={`${styles.item} ${selected ? styles.selected : ""}`}
                    onClick={() => toggleItem(i)}
                  >
                    <span className={styles.checkbox}>
                      {selected ? <CheckSquareIcon /> : <SquareIcon />}
                    </span>
                    <div className={styles.itemBody}>
                      <span className={styles.itemTitle}>{d.title}</span>
                      <span className={styles.itemMeta}>
                        {d.courseTag && <span>{d.courseTag}</span>}
                        {d.dueAt && (
                          <span>Due: {new Date(d.dueAt).toLocaleDateString()}</span>
                        )}
                      </span>
                    </div>
                    <span
                      className={styles.confidence}
                      style={{ color: confidenceColor(d.confidence) }}
                      title={`Confidence: ${Math.round(d.confidence * 100)}%`}
                    >
                      {Math.round(d.confidence * 100)}%
                    </span>
                  </li>
                );
              })}
            </ul>

            {detections.length > 3 && !expanded && (
              <button className={styles.expandBtn} onClick={() => setExpanded(true)}>
                Show {detections.length - 3} more
              </button>
            )}

            <div className={styles.actions}>
              <button className={styles.acceptBtn} onClick={handleAccept} disabled={accepting}>
                {accepting ? "Adding..." : "Add to tasks"}
              </button>
              <div className={styles.feedback}>
                <button
                  className={styles.feedbackBtn}
                  onClick={() => submitFeedback(detections[0], "up")}
                  title="Good detection"
                >
                  <ThumbsUpIcon />
                </button>
                <button
                  className={styles.feedbackBtn}
                  onClick={() => submitFeedback(detections[0], "down")}
                  title="Bad detection"
                >
                  <ThumbsDownIcon />
                </button>
              </div>
              <button className={styles.dismissBtn} onClick={handleDismiss}>
                Dismiss
              </button>
            </div>
          </>
        )}

        {!isAnalyzing && (!detections || detections.length === 0) && (
          <p className={styles.empty}>No tasks detected in this text.</p>
        )}

        <button className={styles.closeBtn} onClick={handleDismiss}>×</button>
      </div>
    </div>
  );
}
