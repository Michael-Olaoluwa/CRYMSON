import { useState } from "react";
import { PencilIcon, CheckIcon, TrashIcon } from "../utils/icons";
import { getApiBaseUrl } from "../utils/apiBaseUrl";
import { getAuthToken } from "../utils/authSession";
import styles from "./NoteEditor.module.css";

export default function NoteEditor({ courseCode, note, onSaved, onDeleted }) {
  const [title, setTitle] = useState(note?.title || "");
  const [content, setContent] = useState(note?.content || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState(!!note);

  const isNew = !note;

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const url = isNew
        ? `${getApiBaseUrl()}/api/courses/${courseCode}/notes`
        : `${getApiBaseUrl()}/api/courses/notes/${note._id}`;
      const method = isNew ? "POST" : "PUT";
      const body = isNew
        ? { courseCode, title: title.trim(), content }
        : { title: title.trim(), content };

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Save failed");
      const saved = await res.json();
      onSaved?.(saved);
      if (isNew) {
        setTitle("");
        setContent("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!note?._id) return;
    setDeleting(true);
    try {
      await fetch(`${getApiBaseUrl()}/api/courses/notes/${note._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      onDeleted?.(note._id);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={`${styles.editor} ${expanded ? styles.expanded : ""}`}>
      <div className={styles.header}>
        <input
          className={styles.titleInput}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title"
          onFocus={() => setExpanded(true)}
        />
        <div className={styles.actions}>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={saving || !title.trim()}
            title="Save note"
          >
            {saving ? "Saving..." : <CheckIcon />}
          </button>
          {!isNew && (
            <button
              className={styles.deleteBtn}
              onClick={handleDelete}
              disabled={deleting}
              title="Delete note"
            >
              <TrashIcon />
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <textarea
          className={styles.contentInput}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your notes here..."
          rows={6}
        />
      )}
    </div>
  );
}
