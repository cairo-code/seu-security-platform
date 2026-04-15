import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import * as lifecycle from './lifecycle';

let managerSecret: string;

export function initWsProxy(secret: string): void {
  managerSecret = secret;
}

export function handleWsUpgrade(
  req: http.IncomingMessage,
  socket: any,
  head: Buffer
): void {
  const url = req.url || '';
  const urlObj = new URL(url, `http://localhost`);
  const pathParts = urlObj.pathname.split('/');

  if (pathParts[1] !== 'ws' || !pathParts[2]) {
    socket.destroy();
    return;
  }

  const containerId = pathParts[2];
  const authParam = urlObj.searchParams.get('Authorization');

  if (!authParam || authParam !== managerSecret) {
    socket.writeHead(401, { 'Content-Type': 'application/json' });
    socket.end(JSON.stringify({ error: 'Unauthorized' }));
    return;
  }

  const containerEntry = lifecycle.get(containerId);
  if (!containerEntry) {
    socket.writeHead(404, { 'Content-Type': 'application/json' });
    socket.end(JSON.stringify({ error: 'Container not found' }));
    return;
  }

  lifecycle.touch(containerId);

  const targetPort = containerEntry.port;
  const targetUrl = `ws://localhost:${targetPort}`;

  let clientWs: WebSocket | null = null;

  try {
    clientWs = new WebSocket(targetUrl);

    clientWs.on('open', () => {
      const serverWs = new WebSocketServer({ noServer: true });

      serverWs.handleUpgrade(req, socket, head, (ws) => {
        ws.on('message', (data: Buffer) => {
          if (clientWs && clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(data);
          }
          lifecycle.touch(containerId);
        });

        ws.on('close', () => {
          if (clientWs) {
            clientWs.close();
          }
        });

        ws.on('error', (err) => {
          console.error('Server WS error:', err);
        });

        clientWs?.on('message', (data: Buffer) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(data);
          }
        });

        clientWs?.on('close', () => {
          ws.close();
        });
      });
    });

    clientWs.on('error', (err) => {
      console.error('Client WS error:', err);
    });

  } catch (error) {
    console.error('WebSocket proxy setup error:', error);
    if (socket && !socket.writableEnded) {
      socket.writeHead(500, { 'Content-Type': 'application/json' });
      socket.end(JSON.stringify({ error: 'Failed to connect to container' }));
    }
  }
}