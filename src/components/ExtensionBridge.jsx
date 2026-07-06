import { useEffect, useState } from "react";
import { getAuthToken } from "../utils/authSession";
import { DownloadIcon, CheckIcon } from "../utils/icons";
import styles from "./ExtensionBridge.module.css";

const EXTENSION_LINK = "chrome://extensions/";

export default function ExtensionBridge() {
  const [extensionDetected, setExtensionDetected] = useState(null);
  const [tokenSent, setTokenSent] = useState(false);

  useEffect(() => {
    const checkInterval = setInterval(() => {
      const marker = document.getElementById("crymson-root");
      if (marker) {
        setExtensionDetected(true);
        clearInterval(checkInterval);
        clearTimeout(timeout);
      }
    }, 500);

    const timeout = setTimeout(() => {
      clearInterval(checkInterval);
      setExtensionDetected(false);
    }, 5000);

    const handleMessage = (event) => {
      if (event.data?.type === "CRYMSON_EXTENSION_READY") {
        setExtensionDetected(true);
        clearInterval(checkInterval);
        clearTimeout(timeout);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      clearInterval(checkInterval);
      clearTimeout(timeout);
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  useEffect(() => {
    if (extensionDetected && !tokenSent) {
      const token = getAuthToken();
      if (token) {
        window.postMessage({ type: "CRYMSON_AUTH_TOKEN", token }, "*");
        setTokenSent(true);
      }
    }
  }, [extensionDetected, tokenSent]);

  if (extensionDetected === null) return null;

  if (!extensionDetected) {
    return (
      <div className={styles.banner}>
        <div className={styles.bannerBody}>
          <span className={styles.bannerIcon}><DownloadIcon /></span>
          <span className={styles.bannerText}>
            Install the <strong>Crymson Task Detector</strong> extension to detect
            tasks on any page you visit.
          </span>
        </div>
        <a
          className={styles.installBtn}
          href="/extension.zip"
          download
        >
          Install Extension
        </a>
      </div>
    );
  }

  return (
    <div className={`${styles.banner} ${styles.connected}`}>
      <div className={styles.bannerBody}>
        <span className={styles.bannerIcon}><CheckIcon /></span>
        <span className={styles.bannerText}>
          <strong>Extension connected.</strong> Visit any page and click the{" "}
          <strong className={styles.plusHint}>+</strong> icon beside detected tasks.
        </span>
      </div>
    </div>
  );
}
