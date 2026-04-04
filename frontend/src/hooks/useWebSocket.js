import { useEffect, useRef, useCallback } from 'react';

const getBaseUrl = () => {
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
  return apiUrl.replace(/\/+$/, '');
};

const isVercel = () => {
  // Always use polling — WebSockets are not supported on Vercel serverless.
  // Even on custom domains the backend is Vercel, so polling is always correct.
  return true;
};

// ─── Polling fallback for Vercel (no persistent WebSocket support) ───
function usePolling(userId, onMessage) {
  const intervalRef = useRef(null);
  const lastCheckRef = useRef(Date.now());

  useEffect(() => {
    if (!userId) return; // don't poll when logged out

    const poll = async () => {
      try {
        const since = lastCheckRef.current;
        lastCheckRef.current = Date.now();
        const token = localStorage.getItem('token');
        if (!token) return; // logged out — stop polling
        const res = await fetch(
          `${getBaseUrl()}/api/notifications/poll?since=${since}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.status === 401) {
          // Token expired — the Axios interceptor handles this on next API call
          return;
        }
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            data.forEach((msg) => onMessage(msg));
          }
        }
      } catch (e) {
        // Silently ignore poll errors — network blips are expected
      }
    };

    intervalRef.current = setInterval(poll, 8000); // Poll every 8s (server rate-limits to 4s min)
    return () => clearInterval(intervalRef.current);
  }, [userId, onMessage]);

  return { send: () => {} };
}

// ─── Real WebSocket (for local dev) ───
function useWebSocketReal(userId, onMessage) {
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const shouldReconnectRef = useRef(true);

  const getWsUrl = () => {
    const explicitUrl = process.env.REACT_APP_WS_URL;
    if (explicitUrl) return explicitUrl.replace(/\/+$/, '');
    const apiUrl = process.env.REACT_APP_API_URL;
    if (apiUrl) return apiUrl.replace(/^http/i, 'ws').replace(/\/+$/, '');
    return 'ws://localhost:8000';
  };

  const connect = useCallback(() => {
    if (!userId || !shouldReconnectRef.current) return;
    const ws = new WebSocket(`${getWsUrl()}/ws/${userId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (e) {
        console.error('WS parse error', e);
      }
    };

    ws.onclose = () => {
      if (!shouldReconnectRef.current) return;
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => ws.close();
  }, [userId, onMessage]);

  useEffect(() => {
    shouldReconnectRef.current = true;
    connect();
    return () => {
      shouldReconnectRef.current = false;
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [connect]);

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { send };
}

// ─── Auto-select based on environment ───
export function useWebSocket(userId, onMessage) {
  // On Vercel, WebSockets are not supported — use polling instead
  if (isVercel()) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return usePolling(userId, onMessage);
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useWebSocketReal(userId, onMessage);
}
