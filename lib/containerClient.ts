import crypto from 'crypto';

const BASE_URL = process.env.CONTAINER_MANAGER_URL!;
const MANAGER_SECRET = process.env.MANAGER_SECRET!;

export class ContainerClientError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'ContainerClientError';
    this.statusCode = statusCode;
  }
}

interface StartContainerResponse {
  containerId: string;
  wsUrl: string;
}

interface ExtendContainerResponse {
  expiresAt: string;
}

interface StatusResponse {
  running: number;
  max: number;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${MANAGER_SECRET}`,
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new ContainerClientError(
      errorText || `HTTP ${response.status}`,
      response.status
    );
  }

  return response.json() as Promise<T>;
}

export async function startContainer(
  userId: string,
  challengeId: string,
  dockerImage: string,
  dynamicFlag: string
): Promise<StartContainerResponse> {
  return request<StartContainerResponse>('POST', '/containers', {
    userId,
    challengeId,
    dockerImage,
    dynamicFlag,
  });
}

export async function stopContainer(containerId: string): Promise<void> {
  await request<void>('DELETE', `/containers/${containerId}`);
}

export async function extendContainer(
  containerId: string,
  minutes: number
): Promise<ExtendContainerResponse> {
  return request<ExtendContainerResponse>('PATCH', `/containers/${containerId}/extend`, {
    minutes,
  });
}

export async function getStatus(): Promise<StatusResponse> {
  return request<StatusResponse>('GET', '/status');
}

export function generateWsToken(
  userId: string,
  containerId: string
): string {
  const hmac = crypto.createHmac('sha256', process.env.FLAG_SECRET!);
  hmac.update(`ws:${userId}:${containerId}:${Date.now()}`);
  return hmac.digest('hex').slice(0, 32);
}

export function verifyWsToken(
  userId: string,
  containerId: string,
  token: string
): boolean {
  const now = Date.now();
  const windowMs = 5 * 60 * 1000;

  for (let ts = now - windowMs; ts <= now + windowMs; ts += 1000) {
    const hmac = crypto.createHmac('sha256', process.env.FLAG_SECRET!);
    hmac.update(`ws:${userId}:${containerId}:${ts}`);
    const expected = hmac.digest('hex').slice(0, 32);

    const tokenBuffer = Buffer.from(token);
    const expectedBuffer = Buffer.from(expected);

    if (tokenBuffer.length !== expectedBuffer.length) {
      continue;
    }

    try {
      if (crypto.timingSafeEqual(tokenBuffer, expectedBuffer)) {
        return true;
      }
    } catch {
      continue;
    }
  }

  return false;
}

export const containerClient = {
  startContainer,
  stopContainer,
  extendContainer,
  getStatus,
  generateWsToken,
  verifyWsToken,
};