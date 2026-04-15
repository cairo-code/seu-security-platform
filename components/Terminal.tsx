"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

interface ContainerStartResponse {
  wsToken: string;
  expiresAt: string;
  containerId: string;
}

interface WsRelayResponse {
  wsUrl: string;
  managerToken: string;
}

interface TerminalProps {
  challengeId: string;
}

export default function Terminal({ challengeId }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const connect = useCallback(async (wsToken: string) => {
    setStatus('connecting');
    setErrorMessage(null);
    disconnect();

    try {
      const relayResponse = await fetch(
        `/api/challenges/${challengeId}/container/ws-relay?wsToken=${encodeURIComponent(wsToken)}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
          },
        }
      );

      if (!relayResponse.ok) {
        const data = await relayResponse.json();
        throw new Error(data.error || 'Failed to get WebSocket URL');
      }

      const relayData: WsRelayResponse = await relayResponse.json();
      const wsUrl = `${relayData.wsUrl}?Authorization=${encodeURIComponent(relayData.managerToken)}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
      };

      ws.onmessage = (event) => {
        if (xtermRef.current) {
          if (event.data instanceof ArrayBuffer) {
            xtermRef.current.write(new Uint8Array(event.data));
          } else if (typeof event.data === 'string') {
            xtermRef.current.write(event.data);
          }
        }
      };

      ws.onclose = () => {
        setStatus('disconnected');
      };

      ws.onerror = () => {
        setStatus('error');
        setErrorMessage('Connection error');
      };
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to connect');
    }
  }, [challengeId, disconnect]);

  const startContainer = useCallback(async () => {
    setStatus('connecting');
    setErrorMessage(null);

    try {
      const token = localStorage.getItem('token') || '';
      const response = await fetch(`/api/challenges/${challengeId}/container`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data: ContainerStartResponse | { error: string } = await response.json();

      if (!response.ok) {
        const errorData = data as { error: string };
        if (response.status === 503) {
          setErrorMessage('No capacity available, try again later');
        } else {
          setErrorMessage(errorData.error || 'Failed to start container');
        }
        setStatus('error');
        return;
      }

      const containerData = data as ContainerStartResponse;
      setExpiresAt(new Date(containerData.expiresAt));
      await connect(containerData.wsToken);
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to start container');
    }
  }, [challengeId, connect]);

  const stopContainer = useCallback(async () => {
    try {
      const token = localStorage.getItem('token') || '';
      await fetch(`/api/challenges/${challengeId}/container`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
    }
    disconnect();
    setStatus('disconnected');
    setExpiresAt(null);
  }, [challengeId, disconnect]);

  const extendContainer = useCallback(async () => {
    try {
      const token = localStorage.getItem('token') || '';
      const response = await fetch(`/api/challenges/${challengeId}/container`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ minutes: 30 }),
      });

      if (response.ok) {
        const data = await response.json();
        setExpiresAt(new Date(data.expiresAt));
      }
    } catch {
    }
  }, [challengeId]);

  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'monospace',
      theme: { background: '#000000' },
    });
    xtermRef.current = term;

    const fitAddon = new FitAddon();
    fitAddonRef.current = fitAddon;
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    term.onData((data) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(data);
      }
    });

    startContainer();

    return () => {
      term.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
      disconnect();
    };
  }, [startContainer, disconnect]);

  useEffect(() => {
    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft('');
      return;
    }

    const updateTime = () => {
      const now = new Date();
      const diff = expiresAt.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <div style={{ width: '100%', minHeight: '500px', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: '#1a1a1a',
          borderBottom: '1px solid #333',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#888', fontSize: '12px' }}>
            {status === 'connected' ? '● Connected' : status === 'connecting' ? '○ Connecting...' : status === 'error' ? '✕ Error' : '○ Disconnected'}
          </span>
          {timeLeft && (
            <span style={{ color: '#fff', fontSize: '14px', fontFamily: 'monospace' }}>
              {timeLeft}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={startContainer}
            style={{
              padding: '6px 12px',
              background: '#0066cc',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Reset
          </button>
          <button
            onClick={extendContainer}
            style={{
              padding: '6px 12px',
              background: '#444',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Add 30 min
          </button>
        </div>
      </div>
      {errorMessage && (
        <div
          style={{
            padding: '12px',
            background: '#2a1a1a',
            color: '#ff6666',
            fontSize: '14px',
            borderBottom: '1px solid #442222',
          }}
        >
          {errorMessage}
        </div>
      )}
      {status === 'disconnected' && !errorMessage && (
        <div
          style={{
            padding: '12px',
            background: '#1a1a2a',
            color: '#aaa',
            fontSize: '14px',
            borderBottom: '1px solid #333',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <button
            onClick={startContainer}
            style={{
              padding: '8px 16px',
              background: '#0066cc',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Reconnect
          </button>
        </div>
      )}
      <div
        ref={terminalRef}
        style={{
          flex: 1,
          minHeight: '450px',
          background: '#000',
        }}
      />
    </div>
  );
}