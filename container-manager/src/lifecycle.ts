import { destroyContainer } from './docker';

export interface ContainerEntry {
  userId: string;
  challengeId: string;
  port: number;
  lastActivityAt: Date;
  expiresAt: Date;
}

const containerMap = new Map<string, ContainerEntry>();

let timeoutMinutes = 30;
let reaperInterval: NodeJS.Timeout | null = null;

export function setTimeoutMinutes(minutes: number): void {
  timeoutMinutes = minutes;
}

export function getTimeoutMinutes(): number {
  return timeoutMinutes;
}

export function register(
  containerId: string,
  userId: string,
  challengeId: string,
  port: number
): void {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + timeoutMinutes * 60 * 1000);

  containerMap.set(containerId, {
    userId,
    challengeId,
    port,
    lastActivityAt: now,
    expiresAt
  });
}

export function touch(containerId: string): void {
  const entry = containerMap.get(containerId);
  if (entry) {
    entry.lastActivityAt = new Date();
    entry.expiresAt = new Date(entry.lastActivityAt.getTime() + timeoutMinutes * 60 * 1000);
  }
}

export function setCustomExpiry(containerId: string, minutes: number): Date {
  const entry = containerMap.get(containerId);
  if (!entry) {
    throw new Error('Container not found');
  }

  const now = new Date();
  entry.lastActivityAt = now;
  entry.expiresAt = new Date(now.getTime() + minutes * 60 * 1000);

  return entry.expiresAt;
}

export function remove(containerId: string): void {
  containerMap.delete(containerId);
}

export function getByUser(userId: string, challengeId: string): ContainerEntry | undefined {
  for (const entry of containerMap.values()) {
    if (entry.userId === userId && entry.challengeId === challengeId) {
      return entry;
    }
  }
  return undefined;
}

export function get(containerId: string): ContainerEntry | undefined {
  return containerMap.get(containerId);
}

export function getAllContainers(): Array<{
  containerId: string;
  challengeId: string;
  port: number;
  lastActivityAt: string;
  expiresAt: string;
}> {
  const result: Array<{
    containerId: string;
    challengeId: string;
    port: number;
    lastActivityAt: string;
    expiresAt: string;
  }> = [];

  for (const [containerId, entry] of containerMap.entries()) {
    result.push({
      containerId,
      challengeId: entry.challengeId,
      port: entry.port,
      lastActivityAt: entry.lastActivityAt.toISOString(),
      expiresAt: entry.expiresAt.toISOString()
    });
  }

  return result;
}

export function getAllContainerEntries(): Map<string, ContainerEntry> {
  return containerMap;
}

export async function startReaper(): Promise<void> {
  if (reaperInterval) {
    clearInterval(reaperInterval);
  }

  reaperInterval = setInterval(async () => {
    const now = new Date();
    const toRemove: string[] = [];

    for (const [containerId, entry] of containerMap.entries()) {
      if (entry.expiresAt < now) {
        toRemove.push(containerId);
      }
    }

    for (const containerId of toRemove) {
      try {
        await destroyContainer(containerId);
      } catch (error) {
        console.error(`Failed to destroy container ${containerId}:`, error);
      }
      containerMap.delete(containerId);
    }

    if (toRemove.length > 0) {
      console.log(`Reaper cleaned up ${toRemove.length} expired containers`);
    }
  }, 60000);
}

export function getRunningCount(): number {
  return containerMap.size;
}