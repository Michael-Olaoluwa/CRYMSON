import { useState, useEffect, useCallback } from "react";
import {
  SearchIcon,
  CheckIcon,
  SquareIcon,
  CheckSquareIcon,
  GearIcon,
  MoonIcon,
} from "../utils/icons";
import styles from "./PermissionsPanel.module.css";

function useElectronAPI() {
  const [electronAPI, setElectronAPI] = useState(null);

  useEffect(() => {
    if (window.electronAPI) {
      setElectronAPI(window.electronAPI);
    }
  }, []);

  return electronAPI;
}

function PermissionToggle({ icon, label, description, checked, onChange, disabled }) {
  return (
    <label className={`${styles.toggle} ${checked ? styles.active : ""}`}>
      <span className={styles.toggleIcon}>{icon}</span>
      <span className={styles.toggleBody}>
        <span className={styles.toggleLabel}>{label}</span>
        <span className={styles.toggleDesc}>{description}</span>
      </span>
      <span className={styles.checkbox}>
        {checked ? <CheckSquareIcon /> : <SquareIcon />}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className={styles.hiddenInput}
      />
    </label>
  );
}

export default function PermissionsPanel() {
  const electronAPI = useElectronAPI();
  const [permissions, setPermissions] = useState({
    clipboard: false,
    globalHotkey: false,
    captureDialog: true,
  });
  const [isElectron, setIsElectron] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (electronAPI) {
      setIsElectron(true);
      electronAPI.getPermissions().then(setPermissions);

      const unsubPermissions = electronAPI.onPermissionsChanged(setPermissions);
      return () => unsubPermissions?.();
    }
  }, [electronAPI]);

  const togglePermission = useCallback(
    (key) => {
      if (!electronAPI) return;
      const next = !permissions[key];
      electronAPI.setPermission(key, next).then(setPermissions);
    },
    [electronAPI, permissions],
  );

  if (!isElectron) return null;

  if (!expanded) {
    return (
      <button
        className={styles.fab}
        onClick={() => setExpanded(true)}
        title="Detection permissions"
      >
        <GearIcon />
      </button>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>
          <SearchIcon /> Detection Sources
        </span>
        <button className={styles.closeBtn} onClick={() => setExpanded(false)}>
          ×
        </button>
      </div>

      <p className={styles.info}>
        Allow Crymson to monitor these sources for academic tasks. Everything is
        processed locally or sent securely to the detection API.
      </p>

      <PermissionToggle
        icon={<MoonIcon />}
        label="Clipboard Monitor"
        description="Watch copied text for assignments, deadlines, and exam dates"
        checked={permissions.clipboard}
        onChange={() => togglePermission("clipboard")}
      />

      <PermissionToggle
        icon={<SearchIcon />}
        label="Global Hotkey (Ctrl+Shift+D)"
        description="Press Ctrl+Shift+D anytime to paste and detect tasks"
        checked={permissions.globalHotkey}
        onChange={() => togglePermission("globalHotkey")}
      />

      <PermissionToggle
        icon={<GearIcon />}
        label="Capture Dialog"
        description="Show a dialog to paste text from any app"
        checked={permissions.captureDialog}
        onChange={() => togglePermission("captureDialog")}
        disabled
      />

      <div className={styles.footer}>
        <span className={styles.indicator}>
          <span
            className={styles.dot}
            style={{
              background:
                permissions.clipboard || permissions.globalHotkey
                  ? "var(--color-success, #16a34a)"
                  : "var(--color-text-muted, #666)",
            }}
          />
          {permissions.clipboard || permissions.globalHotkey
            ? "Active"
            : "Inactive"}
        </span>
      </div>
    </div>
  );
}
