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
  // ISSUE 1 FIX: belt-and-suspenders id dedup across polls, in addition to
  // the cursor fix below. Capped so a very long session doesn't grow this
  // unboundedly.
  const seenIdsRef = useRef(new Set());

  useEffect(() => {
    if (!userId) return; // don't poll when logged out

    const poll = async () => {
      try {
        const since = lastCheckRef.current;
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
            // ISSUE 1 FIX: the cursor used to be set to Date.now() BEFORE
            // this fetch was even sent, which opened a race window — a
            // notification created while this request was in flight could
            // have a timestamp between the OLD "since" and that early NOW,
            // so it would satisfy `timestamp > since` on THIS poll *and*
            // `timestamp > since` on the NEXT poll too (since next poll's
            // "since" was that same early NOW, which is still less than
            // the notification's timestamp) — the backend would
            // legitimately return the same notification twice.
            //
            // Fix: advance the cursor to the latest timestamp actually
            // present in THIS batch, computed after the response arrives,
            // never optimistically ahead of what's been consumed.
            const maxTs = data.reduce((m, n) => Math.max(m, n.timestamp || 0), since);
            lastCheckRef.current = maxTs;

            data.forEach((msg) => {
              if (seenIdsRef.current.has(msg.id)) return;
              seenIdsRef.current.add(msg.id);
              onMessage(msg);
            });
            if (seenIdsRef.current.size > 500) {
              // Trim oldest-ish entries by simply rebuilding from the most
              // recent batch — this Set only needs to catch near-term
              // repeats, not serve as permanent history.
              seenIdsRef.current = new Set(data.map((n) => n.id));
            }
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
