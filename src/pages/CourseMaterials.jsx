import { useState, useEffect, useCallback } from "react";
import { BookIcon, NoteIcon, SearchIcon, DownloadIcon, TrashIcon } from "../utils/icons";
import { getApiBaseUrl } from "../utils/apiBaseUrl";
import apiClient from "../utils/apiClient";
import FileUploader from "../components/FileUploader";
import NoteEditor from "../components/NoteEditor";
import MaterialsPanel from "../components/MaterialsPanel";
import styles from "./CourseMaterials.module.css";

const TYPE_LABELS = {
  "lecture-note": "Lecture Note",
  slide: "Slide",
  "past-question": "Past Question",
  assignment: "Assignment",
  other: "Other",
};

export default function CourseMaterials({ courseCode: initialCode, onBack }) {
  const [courseCode, setCourseCode] = useState(initialCode || "");
  const [activeTab, setActiveTab] = useState("materials");
  const [materials, setMaterials] = useState([]);
  const [notes, setNotes] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const code = courseCode.trim().toUpperCase();

  const fetchData = useCallback(async () => {
    if (!code) return;
    setLoading(true);
    setError("");

    try {
      const [matRes, noteRes] = await Promise.allSettled([
        apiClient.get(`/api/courses/${code}/materials`),
        apiClient.get(`/api/courses/${code}/notes`),
      ]);

      if (matRes.status === "fulfilled") setMaterials(matRes.value.data);
      if (noteRes.status === "fulfilled") setNotes(noteRes.value.data);
      if (matRes.status === "rejected" && noteRes.status === "rejected") {
        setError("Failed to load course data");
      }
    } catch {
      setError("Failed to load course data");
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    if (code) fetchData();
  }, [code, fetchData]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const [matRes, noteRes] = await Promise.allSettled([
          apiClient.get(`/api/courses/materials/search?q=${encodeURIComponent(searchQuery)}`),
          apiClient.get(`/api/courses/notes/search?q=${encodeURIComponent(searchQuery)}`),
        ]);

        setSearchResults({
          materials: matRes.status === "fulfilled" ? matRes.value.data : [],
          notes: noteRes.status === "fulfilled" ? noteRes.value.data : [],
        });
      } catch {
        setSearchResults({ materials: [], notes: [] });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this material?")) return;
    try {
      await apiClient.delete(`/api/courses/materials/${id}`);
      setMaterials((prev) => prev.filter((m) => m._id !== id));
    } catch {
      setError("Delete failed");
    }
  };

  const fileIcon = (type) => {
    const map = {
      "lecture-note": <BookIcon />,
      slide: <DownloadIcon />,
      "past-question": <SearchIcon />,
      assignment: <NoteIcon />,
    };
    return map[type] || <DownloadIcon />;
  };

  const sortedMaterials = [...materials].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );
  const sortedNotes = [...notes].sort(
    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
  );

  const pastQuestions = sortedMaterials.filter((m) => m.type === "past-question");
  const allMaterials = sortedMaterials.filter((m) => m.type !== "past-question");

  const showSearch = searchQuery.trim() && searchResults;

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <h2 className={styles.toolbarTitle}>Course Hub</h2>
          {code && (
            <div className={styles.currentCourse}>
              <span className={styles.currentCourseCode}>{code}</span>
              <button className={styles.changeBtn} onClick={() => setCourseCode("")}>
                Change
              </button>
            </div>
          )}
        </div>
        <div className={styles.searchBox}>
          <SearchIcon />
          <input
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search materials & notes..."
          />
        </div>
      </div>

      <div className={styles.main}>
        {!code ? (
          <div className={styles.landing}>
            <h1 className={styles.landingTitle}>
              <BookIcon /> Course Materials
            </h1>
            <p className={styles.landingSub}>
              Enter a course code to view its files, notes, and past questions.
            </p>

            <form
              className={styles.codeForm}
              onSubmit={(e) => {
                e.preventDefault();
                const val = e.target.elements.code?.value?.trim();
                if (val) setCourseCode(val.toUpperCase());
              }}
            >
              <input
                name="code"
                className={styles.codeInput}
                placeholder="e.g. MTH 201"
                autoFocus
              />
              <button className={styles.codeBtn}>Open Course Hub</button>
            </form>

            {searchResults && (
              <div className={styles.searchResults}>
                <h3>
                  Search results for "{searchQuery}"
                </h3>
                {searchResults.materials.length === 0 && searchResults.notes.length === 0 && (
                  <p className={styles.noResults}>No results found.</p>
                )}
                {searchResults.materials.map((m) => (
                  <a
                    key={m._id}
                    className={styles.searchItem}
                    href={`${getApiBaseUrl()}/api/courses/materials/${m._id}`}
                    target="_blank" rel="noopener noreferrer"
                  >
                    <span>{fileIcon(m.type)}</span>
                    <span>
                      <strong>{m.title}</strong>
                      <span className={styles.searchMeta}>
                        {m.courseCode} &middot; {TYPE_LABELS[m.type]}
                      </span>
                    </span>
                  </a>
                ))}
                {searchResults.notes.map((n) => (
                  <div key={n._id} className={styles.searchItem}>
                    <NoteIcon />
                    <span>
                      <strong>{n.title}</strong>
                      <span className={styles.searchMeta}>
                        {n.courseCode} &middot; Note
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <header className={styles.header}>
              <div className={styles.headerTop}>
                <button className={styles.backBtn} onClick={() => { if (onBack) onBack(); else setCourseCode(""); }}>
                  &larr; Back
                </button>
                <h1 className={styles.title}>{code}</h1>
              </div>
              <p className={styles.subtitle}>
                {materials.length} files &middot; {notes.length} notes &middot; {pastQuestions.length} past questions
              </p>
            </header>

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.tabs}>
              {[
                { key: "materials", label: `Materials (${allMaterials.length})` },
                { key: "pastq", label: `Past Questions (${pastQuestions.length})` },
                { key: "notes", label: `Notes (${notes.length})` },
              ].map((t) => (
                <button
                  key={t.key}
                  className={`${styles.tab} ${activeTab === t.key ? styles.activeTab : ""}`}
                  onClick={() => setActiveTab(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {activeTab === "materials" && (
              <div className={styles.section}>
                <FileUploader courseCode={code} onUploaded={(m) => setMaterials((prev) => [...prev, m])} />
                <div className={styles.list}>
                  {allMaterials.map((m) => (
                    <div key={m._id} className={styles.item}>
                      <span className={styles.itemIcon}>{fileIcon(m.type)}</span>
                      <div className={styles.itemBody}>
                        <span className={styles.itemTitle}>{m.title}</span>
                        <span className={styles.itemMeta}>
                          {TYPE_LABELS[m.type]} &middot; {m.fileName} &middot; {(m.fileSize / 1024).toFixed(0)}KB
                        </span>
                      </div>
                      <div className={styles.itemActions}>
                        <a
                          className={styles.downloadBtn}
                          href={`${getApiBaseUrl()}/api/courses/materials/${m._id}`}
                          target="_blank" rel="noopener noreferrer"
                          title="Download"
                        >
                          <DownloadIcon />
                        </a>
                        <button className={styles.delBtn} onClick={() => handleDelete(m._id)} title="Delete">
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  ))}
                  {allMaterials.length === 0 && !loading && (
                    <p className={styles.empty}>Upload your first material above.</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === "pastq" && (
              <div className={styles.section}>
                <FileUploader courseCode={code} onUploaded={(m) => { setMaterials((prev) => [...prev, m]); setActiveTab(m.type === "past-question" ? "pastq" : "materials"); }} />
                <div className={styles.list}>
                  {pastQuestions.map((m) => (
                    <div key={m._id} className={styles.item}>
                      <span className={styles.itemIcon}>{fileIcon(m.type)}</span>
                      <div className={styles.itemBody}>
                        <span className={styles.itemTitle}>{m.title}</span>
                        <span className={styles.itemMeta}>
                          {m.tags?.length ? m.tags.join(", ") : "No tags"} &middot; {(m.fileSize / 1024).toFixed(0)}KB
                        </span>
                      </div>
                      <div className={styles.itemActions}>
                        <a
                          className={styles.downloadBtn}
                          href={`${getApiBaseUrl()}/api/courses/materials/${m._id}`}
                          target="_blank" rel="noopener noreferrer"
                          title="Download"
                        >
                          <DownloadIcon />
                        </a>
                        <button className={styles.delBtn} onClick={() => handleDelete(m._id)} title="Delete">
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  ))}
                  {pastQuestions.length === 0 && !loading && (
                    <p className={styles.empty}>No past questions yet. Upload one tagged as "Past Question".</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === "notes" && (
              <div className={styles.section}>
                <NoteEditor courseCode={code} onSaved={(n) => setNotes((prev) => [n, ...prev])} />
                <div className={styles.list}>
                  {sortedNotes.map((n) => (
                    <NoteEditor
                      key={n._id}
                      courseCode={code}
                      note={n}
                      onSaved={(updated) =>
                        setNotes((prev) => prev.map((x) => (x._id === updated._id ? updated : x)))
                      }
                      onDeleted={(id) => setNotes((prev) => prev.filter((x) => x._id !== id))}
                    />
                  ))}
                  {notes.length === 0 && <p className={styles.empty}>Write your first note above.</p>}
                </div>
              </div>
            )}

            <div className={styles.connections}>
              <h3>Quick Links</h3>
              <div className={styles.connectionGrid}>
                <MaterialsPanel courseCode={code} compact />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
