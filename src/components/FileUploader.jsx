import { useState, useRef } from "react";
import { DownloadIcon, CheckIcon, TrashIcon } from "../utils/icons";
import { getApiBaseUrl } from "../utils/apiBaseUrl";
import { getAuthToken } from "../utils/authSession";
import styles from "./FileUploader.module.css";

export default function FileUploader({ courseCode, onUploaded }) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);
  const titleRef = useRef(null);
  const typeRef = useRef(null);
  const tagsRef = useRef(null);

  const upload = async (file) => {
    const title = titleRef.current?.value?.trim() || file.name.replace(/\.[^.]+$/, "");
    const type = typeRef.current?.value || "other";
    const tags = tagsRef.current?.value || "";

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("courseCode", courseCode);
      formData.append("title", title);
      formData.append("type", type);
      formData.append("tags", tags);

      const res = await fetch(`${getApiBaseUrl()}/api/courses/${courseCode}/materials`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getAuthToken()}` },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || data.message || "Upload failed");
      }

      const material = await res.json();
      onUploaded?.(material);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
  };

  return (
    <div
      className={`${styles.uploader} ${dragOver ? styles.dragOver : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <div className={styles.inputs}>
        <input ref={titleRef} className={styles.input} placeholder="Title (optional)" />
        <select ref={typeRef} className={styles.select}>
          <option value="lecture-note">Lecture Note</option>
          <option value="slide">Slide</option>
          <option value="past-question">Past Question</option>
          <option value="assignment">Assignment</option>
          <option value="other">Other</option>
        </select>
        <input ref={tagsRef} className={styles.input} placeholder="Tags (comma-separated, optional)" />
      </div>

      <label className={styles.dropZone}>
        <DownloadIcon />
        <span>{uploading ? "Uploading..." : dragOver ? "Drop file here" : "Click or drag to upload"}</span>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.ppt,.pptx,.txt"
          onChange={handleFileSelect}
          hidden
        />
      </label>

      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
