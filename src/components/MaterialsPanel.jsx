import { useState, useEffect } from "react";
import { BookIcon, SearchIcon, NoteIcon, DownloadIcon } from "../utils/icons";
import { getApiBaseUrl } from "../utils/apiBaseUrl";
import { getAuthToken } from "../utils/authSession";
import styles from "./MaterialsPanel.module.css";

export default function MaterialsPanel({ courseCode, compact }) {
  const [materials, setMaterials] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("materials");

  useEffect(() => {
    if (!courseCode) return;
    setLoading(true);
    setError("");

    Promise.all([
      fetch(`${getApiBaseUrl()}/api/courses/${courseCode}/materials`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      }).then((r) => r.ok ? r.json() : []),
      fetch(`${getApiBaseUrl()}/api/courses/${courseCode}/notes`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      }).then((r) => r.ok ? r.json() : []),
    ])
      .then(([mats, noteList]) => {
        setMaterials(mats);
        setNotes(noteList);
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, [courseCode]);

  if (loading) {
    return (
      <div className={`${styles.panel} ${compact ? styles.compact : ""}`}>
        <p className={styles.loading}>Loading materials...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${styles.panel} ${compact ? styles.compact : ""}`}>
        <p className={styles.error}>{error}</p>
      </div>
    );
  }

  const fileIcon = (type) => {
    const icons = {
      "lecture-note": <BookIcon />,
      slide: <DownloadIcon />,
      "past-question": <SearchIcon />,
      assignment: <NoteIcon />,
    };
    return icons[type] || <DownloadIcon />;
  };

  if (compact) {
    return (
      <div className={`${styles.panel} ${styles.compact}`}>
        <div className={styles.compactGrid}>
          <div className={styles.compactStat}>
            <BookIcon />
            <span>{materials.length} files</span>
          </div>
          <div className={styles.compactStat}>
            <NoteIcon />
            <span>{notes.length} notes</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === "materials" ? styles.activeTab : ""}`}
          onClick={() => setTab("materials")}
        >
          Materials ({materials.length})
        </button>
        <button
          className={`${styles.tab} ${tab === "notes" ? styles.activeTab : ""}`}
          onClick={() => setTab("notes")}
        >
          Notes ({notes.length})
        </button>
      </div>

      {tab === "materials" && (
        <div className={styles.list}>
          {materials.length === 0 && (
            <p className={styles.empty}>No materials uploaded yet.</p>
          )}
          {materials.map((m) => (
            <a
              key={m._id}
              className={styles.item}
              href={`${getApiBaseUrl()}/api/courses/materials/${m._id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className={styles.itemIcon}>{fileIcon(m.type)}</span>
              <span className={styles.itemBody}>
                <span className={styles.itemTitle}>{m.title}</span>
                <span className={styles.itemMeta}>
                  {m.type} &middot; {m.fileName}
                </span>
              </span>
              <DownloadIcon />
            </a>
          ))}
        </div>
      )}

      {tab === "notes" && (
        <div className={styles.list}>
          {notes.length === 0 && (
            <p className={styles.empty}>No notes yet.</p>
          )}
          {notes.map((n) => (
            <div key={n._id} className={styles.noteItem}>
              <span className={styles.itemTitle}>{n.title}</span>
              <span className={styles.itemMeta}>
                {new Date(n.updatedAt).toLocaleDateString()}
                {n.content && ` · ${n.content.length} chars`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
