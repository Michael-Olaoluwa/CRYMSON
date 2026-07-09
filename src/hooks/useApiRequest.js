import { useState, useCallback, useRef, useEffect } from "react";

export function useApiRequest() {
  const [state, setState] = useState({ data: null, loading: false, error: null });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const safeSetState = useCallback((updates) => {
    if (mountedRef.current) {
      setState((prev) => ({ ...prev, ...updates }));
    }
  }, []);

  const execute = useCallback(async (requestPromise) => {
    safeSetState({ loading: true, error: null });
    try {
      const response = await requestPromise;
      safeSetState({ data: response.data ?? response, loading: false });
      return response;
    } catch (err) {
      safeSetState({
        error: err.response?.data?.message || err.message || "An error occurred",
        loading: false,
      });
      return null;
    }
  }, [safeSetState]);

  const reset = useCallback(() => {
    safeSetState({ data: null, loading: false, error: null });
  }, [safeSetState]);

  return { ...state, execute, reset };
}

export default useApiRequest;
