import { useState, useRef, useEffect } from "react";
import { useTextDetection } from "../hooks/useTextDetection";
import { SearchIcon, CheckIcon, PlusIcon } from "../utils/icons";
import styles from "./TextCaptureWidget.module.css";

export default function TextCaptureWidget() {
  const { detectText, isAnalyzing, pendingDetection } = useTextDetection();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [helpExpanded, setHelpExpanded] = useState(false);
  const panelRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (window.electronAPI) {
      const unsub = window.electronAPI.onShowCaptureDialog(() => {
        setOpen(true);
      });
      return () => unsub?.();
    }
  }, []);

  useEffect(() => {
    if (open && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
        setResult(null);
        setText("");
        setError("");
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const handleDetect = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setError("");
    setResult(null);

    if (window.electronAPI) {
      const data = await window.electronAPI.sendForDetection(trimmed, "electron-capture");
      if (data?.error) setError(data.error);
      else if (data) setResult(data);
    } else {
      const data = await detectText(trimmed, "capture-dialog");
      if (data) setResult(data);
      else setError("Detection failed.");
    }
  };

  const handlePaste = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText) {
        setText(clipText);
        setResult(null);
        setError("");
      }
    } catch {
      setError("Cannot access clipboard. Paste manually.");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleDetect();
    }
    if (e.key === "Escape") {
      setOpen(false);
      setResult(null);
      setText("");
      setError("");
    }
  };

  return (
    <>
      <button
        className={styles.fab}
        onClick={() => setOpen(true)}
        title="Capture text from any app"
      >
        <PlusIcon />
      </button>

      {open && (
        <div className={styles.overlay}>
          <div className={styles.panel} ref={panelRef}>
            <div className={styles.header}>
              <span className={styles.headerTitle}>
                <SearchIcon /> Capture Text
              </span>
              <button
                className={styles.closeBtn}
                onClick={() => {
                  setOpen(false);
                  setResult(null);
                  setText("");
                  setError("");
                }}
              >
                ×
              </button>
            </div>

            <p className={styles.hint}>
              Paste text from any app — emails, messages, course portals — to
              detect tasks and deadlines.
            </p>

            <textarea
              ref={textareaRef}
              className={styles.textarea}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setResult(null);
                setError("");
              }}
              onKeyDown={handleKeyDown}
              placeholder="Paste or type text here..."
              rows={5}
            />

            <div className={styles.actions}>
              <button
                className={styles.pasteBtn}
                onClick={handlePaste}
                title="Paste from clipboard"
              >
                Paste
              </button>
              <button
                className={styles.detectBtn}
                onClick={handleDetect}
                disabled={isAnalyzing || !text.trim()}
              >
                {isAnalyzing ? "Analyzing..." : "Detect"}
              </button>
            </div>

            {error && <p className={styles.error}>{error}</p>}

            {result?.detections?.length > 0 && (
              <div className={styles.results}>
                <div className={styles.resultHeader}>
                  <CheckIcon /> Detected {result.detections.length} item{result.detections.length > 1 ? "s" : ""}
                </div>
                <ul className={styles.list}>
                  {result.detections.map((d, i) => (
                    <li key={i} className={styles.item}>
                      <span className={styles.itemTitle}>{d.title}</span>
                      <span className={styles.itemMeta}>
                        {d.courseTag && <span className={styles.tag}>{d.courseTag}</span>}
                        {d.dueAt && <span>Due {new Date(d.dueAt).toLocaleDateString()}</span>}
                        <span className={styles.confidence}>{Math.round(d.confidence * 100)}%</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className={styles.resultNote}>
                  Check the DetectionPrompt toast or ShareTarget page to add
                  these to your tasks.
                </p>
              </div>
            )}

            {result?.detections?.length === 0 && !isAnalyzing && text.trim() && (
              <p className={styles.noResults}>No tasks detected.</p>
            )}

            <button
              className={styles.helpBtn}
              onClick={() => setHelpExpanded(!helpExpanded)}
            >
              {helpExpanded ? "Hide shortcuts" : "Keyboard shortcuts"}
            </button>

            {helpExpanded && (
              <div className={styles.help}>
                <kbd>Ctrl+Enter</kbd> Detect
                <kbd>Escape</kbd> Close
                <kbd>Ctrl+Shift+D</kbd> Open from anywhere (if enabled)
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
