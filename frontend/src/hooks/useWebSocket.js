import { useEffect, useRef, useCallback } from 'react';

const getWebSocketBaseUrl = () => {
  const explicitUrl = process.env.REACT_APP_WS_URL;
  if (explicitUrl) {
    return explicitUrl.replace(/\/+$/, '');
  }

  const apiUrl = process.env.REACT_APP_API_URL;
  if (apiUrl) {
    return apiUrl.replace(/^http/i, 'ws').replace(/\/+$/, '');
  }

  return 'ws://localhost:8000';
};

export function useWebSocket(userId, onMessage) {
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const shouldReconnectRef = useRef(true);

  const connect = useCallback(() => {
    if (!userId || !shouldReconnectRef.current) return;

    const ws = new WebSocket(`${getWebSocketBaseUrl()}/ws/${userId}`);
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
      console.log('WebSocket disconnected, reconnecting in 3s...');
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = (err) => {
      console.error('WebSocket error', err);
      ws.close();
    };
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
