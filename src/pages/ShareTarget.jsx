import { useEffect, useState, useCallback } from "react";
import { useTextDetection } from "../hooks/useTextDetection";
import { getAuthToken } from "../utils/authSession";
import { SearchIcon, CheckSquareIcon, SquareIcon, CheckIcon } from "../utils/icons";
import { getApiBaseUrl } from "../utils/apiBaseUrl";
import TopBar from "../parts/welcome-page/TopBar";
import styles from "./ShareTarget.module.css";

export default function ShareTarget() {
  const { detectText, isAnalyzing } = useTextDetection();

  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paramText = params.get("text");
    if (paramText) {
      setText(paramText);
      handleDetect(paramText);
    }
  }, []);

  const handleDetect = useCallback(async (inputText) => {
    const t = (inputText || text).trim();
    if (!t) return;
    setError("");
    setAccepted(false);
    setSelectedItems(new Set());
    const data = await detectText(t, "share-target");
    if (data) setResult(data);
    else setError("Detection failed. Check your connection and try again.");
  }, [text, detectText]);

  const toggleItem = (index) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleAccept = async () => {
    if (!result?.detections?.length) return;
    setAccepting(true);
    const toAccept =
      selectedItems.size > 0
        ? result.detections.filter((_, i) => selectedItems.has(i))
        : result.detections;
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/detect/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}),
        },
        body: JSON.stringify({ detectionId: result.detectionId, detections: toAccept }),
      });
      if (res.ok) setAccepted(true);
    } catch (err) {
      setError("Failed to add tasks.");
    }
    setAccepting(false);
  };

  return (
    <div className={styles.page}>
      <TopBar />
      <main className={styles.main}>
        <div className={styles.card}>
          <h1 className={styles.heading}>
            <SearchIcon /> Task Detection
          </h1>
          <p className={styles.subtitle}>
            Paste or share text from your course portal, messages, or emails to extract tasks automatically.
          </p>

          <textarea
            className={styles.textarea}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste text here...&#10;&#10;Example: 'Submit CSC 301 assignment by Friday 2pm. It's worth 15% of your grade.'"
            rows={6}
          />

          <button
            className={styles.detectBtn}
            onClick={() => handleDetect()}
            disabled={isAnalyzing || !text.trim()}
          >
            {isAnalyzing ? "Analyzing..." : "Detect Tasks"}
          </button>

          {error && <p className={styles.error}>{error}</p>}

          {result?.detections?.length > 0 && (
            <div className={styles.results}>
              <h2 className={styles.resultHeading}>
                <CheckIcon /> Detected {result.detections.length} item{result.detections.length > 1 ? "s" : ""}
              </h2>
              <ul className={styles.list}>
                {result.detections.map((d, i) => {
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
                          {d.courseTag && <span className={styles.courseTag}>{d.courseTag}</span>}
                          <span className={`${styles.badge} ${styles[d.type]}`}>{d.type}</span>
                          {d.dueAt && <span>Due {new Date(d.dueAt).toLocaleDateString()}</span>}
                        </span>
                        {d.sourceText && <span className={styles.sourceText}>"{d.sourceText}"</span>}
                      </div>
                      <span className={styles.confidence}>{Math.round(d.confidence * 100)}%</span>
                    </li>
                  );
                })}
              </ul>

              <button className={styles.acceptBtn} onClick={handleAccept} disabled={accepting}>
                {accepting ? "Adding..." : accepted ? "Added!" : "Add selected to tasks"}
              </button>
            </div>
          )}

          {result?.detections?.length === 0 && !isAnalyzing && text.trim() && (
            <p className={styles.noResults}>No tasks or deadlines detected in this text.</p>
          )}
        </div>
      </main>
    </div>
  );
}
