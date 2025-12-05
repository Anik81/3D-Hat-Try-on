'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const WEBSOCKET_URL = 'ws://localhost:8000/ws';
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [lastMessage, setLastMessage] = useState(null);
  
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const ws = new WebSocket(WEBSOCKET_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          setLastMessage(message);
          
          if (message.error) {
            console.error('Server error:', message.error);
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        setIsConnecting(false);
        wsRef.current = null;

        // Attempt to reconnect if not manually closed
        if (event.code !== 1000 && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current);
          setError(`Connection lost. Reconnecting in ${delay/1000}s... (${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          setError('Failed to connect to backend. Please check if the Python server is running on localhost:8000');
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('WebSocket connection error');
        setIsConnecting(false);
      };

    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      setError('Failed to create WebSocket connection');
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    setError(null);
    reconnectAttemptsRef.current = 0;
  }, []);

  const sendFrame = useCallback((imageData) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      // Convert blob to array buffer and send as binary data
      imageData.arrayBuffer().then((buffer) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(buffer);
        }
      }).catch((err) => {
        console.error('Failed to send frame:', err);
      });
    } else if (!isConnecting) {
      // Auto-reconnect if disconnected
      connect();
    }
  }, [connect, isConnecting]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isConnecting,
    error,
    lastMessage,
    sendFrame,
    connect,
    disconnect
  };
};