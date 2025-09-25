import { useState, useEffect, useRef, useCallback } from 'react';

export const useWebSocket = (url, options = {}) => {
  const [connectionStatus, setConnectionStatus] = useState('Connecting');
  const [lastMessage, setLastMessage] = useState(null);
  const [messageHistory, setMessageHistory] = useState([]);
  
  const ws = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const heartbeatIntervalRef = useRef(null);
  
  const {
    onOpen,
    onClose,
    onMessage,
    onError,
    shouldReconnect = true,
    reconnectAttempts: maxReconnectAttempts = 3, // REDUCED from 5
    reconnectInterval = 5000, // INCREASED from 3000
    heartbeatInterval = 30000, // NEW: Send heartbeat every 30 seconds
  } = options;

  // Send message function
  const sendMessage = useCallback((message) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      const messageString = typeof message === 'string' ? message : JSON.stringify(message);
      ws.current.send(messageString);
      console.log('WebSocket message sent:', messageString);
      return true;
    } else {
      console.warn('WebSocket is not connected. Message not sent:', message);
      return false;
    }
  }, []);

  // Heartbeat function to keep connection alive
  const sendHeartbeat = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ action: 'heartbeat' }));
      console.log('Heartbeat sent');
    }
  }, []);

  // Start heartbeat interval
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    heartbeatIntervalRef.current = setInterval(() => {
      sendHeartbeat();
    }, heartbeatInterval);
    
    console.log(`Heartbeat started with ${heartbeatInterval}ms interval`);
  }, [sendHeartbeat, heartbeatInterval]);

  // Stop heartbeat interval
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
      console.log('Heartbeat stopped');
    }
  }, []);

  // Connect function
  const connect = useCallback(() => {
    if (!url) {
      console.warn('WebSocket URL not provided');
      setConnectionStatus('Failed');
      return;
    }
    
    try {
      console.log('Connecting to WebSocket:', url);
      setConnectionStatus('Connecting');
      
      // Close existing connection if any
      if (ws.current) {
        ws.current.close();
      }
      
      ws.current = new WebSocket(url);

      ws.current.onopen = (event) => {
        console.log('✅ WebSocket connected successfully');
        setConnectionStatus('Open');
        reconnectAttempts.current = 0; // Reset attempts on successful connection
        
        // Send initial heartbeat after 1 second
        setTimeout(() => {
          if (ws.current?.readyState === WebSocket.OPEN) {
            sendHeartbeat();
            startHeartbeat(); // Start periodic heartbeats
          }
        }, 1000);
        
        onOpen?.(event);
      };

      ws.current.onclose = (event) => {
        console.log('❌ WebSocket disconnected:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });
        
        setConnectionStatus('Closed');
        stopHeartbeat(); // Stop heartbeat on disconnect
        
        // Only reconnect if:
        // 1. Should reconnect is enabled
        // 2. It wasn't a clean disconnect (code 1000)
        // 3. Haven't exceeded max attempts
        if (shouldReconnect && 
            event.code !== 1000 && 
            reconnectAttempts.current < maxReconnectAttempts) {
          
          setConnectionStatus('Reconnecting');
          reconnectAttempts.current++;
          
          console.log(`🔄 Reconnection attempt ${reconnectAttempts.current}/${maxReconnectAttempts} in ${reconnectInterval}ms`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else {
          if (reconnectAttempts.current >= maxReconnectAttempts) {
            console.error('❌ Max reconnection attempts reached');
          }
          setConnectionStatus('Failed');
        }
        
        onClose?.(event);
      };

      ws.current.onmessage = (event) => {
        let message;
        try {
          message = JSON.parse(event.data);
        } catch (e) {
          message = event.data;
        }

        // Don't log heartbeat responses to reduce noise
        if (message?.type !== 'heartbeat-response') {
          console.log('📨 WebSocket message received:', message);
        }
        
        setLastMessage(message);
        setMessageHistory(prev => [...prev.slice(-49), message]); // Keep last 50 messages
        
        // Don't trigger onMessage for heartbeat responses
        if (message?.type !== 'heartbeat-response') {
          onMessage?.(message);
        }
      };

      ws.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setConnectionStatus('Error');
        stopHeartbeat(); // Stop heartbeat on error
        onError?.(error);
      };

    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      setConnectionStatus('Error');
      stopHeartbeat();
    }
  }, [url, onOpen, onClose, onMessage, onError, shouldReconnect, maxReconnectAttempts, reconnectInterval, sendHeartbeat, startHeartbeat, stopHeartbeat]);

  // Disconnect function
  const disconnect = useCallback(() => {
    console.log('🔌 Manually disconnecting WebSocket');
    
    // Clear reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Stop heartbeat
    stopHeartbeat();
    
    // Close WebSocket with clean disconnect code
    if (ws.current) {
      ws.current.close(1000, 'Client disconnect');
    }
    
    setConnectionStatus('Closed');
  }, [stopHeartbeat]);

  // Initialize connection
  useEffect(() => {
    if (url) {
      connect();
    }
    
    return () => {
      // Cleanup on unmount
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      stopHeartbeat();
      if (ws.current) {
        ws.current.close(1000, 'Component unmount');
      }
    };
  }, [connect, stopHeartbeat, url]);

  // Manual reconnect function
  const reconnect = useCallback(() => {
    console.log('🔄 Manual reconnection requested');
    reconnectAttempts.current = 0; // Reset attempts for manual reconnect
    connect();
  }, [connect]);

  return {
    sendMessage,
    lastMessage,
    messageHistory,
    connectionStatus,
    disconnect,
    reconnect,
    // Additional utilities
    isConnected: connectionStatus === 'Open',
    isConnecting: connectionStatus === 'Connecting',
    isReconnecting: connectionStatus === 'Reconnecting',
    isFailed: connectionStatus === 'Failed',
    reconnectAttemptsLeft: Math.max(0, maxReconnectAttempts - reconnectAttempts.current),
  };
};
