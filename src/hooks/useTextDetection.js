import { createContext, useContext, useState, useCallback, useRef } from "react";
import { getApiBaseUrl } from "../utils/apiBaseUrl";

const DetectionContext = createContext(null);

export function DetectionProvider({ children, apiKey }){
  const [pendingDetection, setPendingDetection] = useState(null);
  const [detectionHistory, setDetectionHistory] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const lastAnalyzedRef = useRef("");

  const detectText = useCallback(async (text, source) => {
    if (!text || typeof text !== "string" || !text.trim()) return null;
    const normalized = text.trim();
    if (normalized === lastAnalyzedRef.current) return null;
    lastAnalyzedRef.current = normalized;

    setIsAnalyzing(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/detect/detect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: normalized, source: source || "manual" }),
      });
      if (!res.ok) throw new Error(`Detection failed: ${res.status}`);
      const data = await res.json();
      if (data.detections?.length > 0) {
        setPendingDetection(data);
      }
      return data;
    } catch (err) {
      console.error("detectText error:", err);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const acceptDetection = useCallback(async (detections, token) => {
    if (!pendingDetection) return false;
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/detect/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          detectionId: pendingDetection.detectionId,
          detections: detections || pendingDetection.detections,
        }),
      });
      if (!res.ok) throw new Error(`Accept failed: ${res.status}`);
      const result = await res.json();
      setDetectionHistory((prev) => [
        ...prev,
        { detectionId: pendingDetection.detectionId, accepted: true, count: result.accepted },
      ]);
      setPendingDetection(null);
      return true;
    } catch (err) {
      console.error("acceptDetection error:", err);
      return false;
    }
  }, [pendingDetection]);

  const dismissDetection = useCallback(() => {
    if (pendingDetection) {
      setDetectionHistory((prev) => [
        ...prev,
        { detectionId: pendingDetection.detectionId, accepted: false },
      ]);
    }
    setPendingDetection(null);
    lastAnalyzedRef.current = "";
  }, [pendingDetection]);

  const submitFeedback = useCallback(async (detection, rating) => {
    try {
      await fetch(`${getApiBaseUrl()}/api/detect/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ detectionId: pendingDetection?.detectionId, detection, rating }),
      });
    } catch (err) {
      console.error("submitFeedback error:", err);
    }
  }, [pendingDetection]);

  return (
    <DetectionContext.Provider
      value={{
        pendingDetection,
        detectionHistory,
        isAnalyzing,
        detectText,
        acceptDetection,
        dismissDetection,
        submitFeedback,
        setPendingDetection,
      }}
    >
      {children}
    </DetectionContext.Provider>
  );
}

export function useTextDetection() {
  const ctx = useContext(DetectionContext);
  if (!ctx) {
    return {
      pendingDetection: null,
      detectionHistory: [],
      isAnalyzing: false,
      detectText: async () => null,
      acceptDetection: async () => false,
      dismissDetection: () => {},
      submitFeedback: async () => {},
      setPendingDetection: () => {},
    };
  }
  return ctx;
}
