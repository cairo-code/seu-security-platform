import { Router, Request, Response } from 'express';
import { authMiddleware } from './auth';
import { spawnContainer, destroyContainer, setMaxContainers as setDockerMaxContainers } from './docker';
import * as lifecycle from './lifecycle';
import { CapacityError } from './CapacityError';
import type { ContainerEntry } from './lifecycle';

const router = Router();

let maxContainers = 10;
let timeoutMinutes = 30;

export function setMaxContainers(max: number): void {
  maxContainers = max;
}

export function setTimeoutMinutes(minutes: number): void {
  timeoutMinutes = minutes;
  lifecycle.setTimeoutMinutes(minutes);
}

function findContainerIdByEntry(entry: ContainerEntry): string | undefined {
  for (const [id, e] of lifecycle.getAllContainerEntries()) {
    if (e.userId === entry.userId && e.challengeId === entry.challengeId && e.port === entry.port) {
      return id;
    }
  }
  return undefined;
}

interface StartRequestBody {
  userId: string;
  challengeId: string;
  dockerImage: string;
  dynamicFlag: string;
}

router.post('/containers/start', authMiddleware, async (req: Request, res: Response) => {
  try {
    const body = req.body as StartRequestBody;

    if (!body.userId || !body.challengeId || !body.dockerImage || !body.dynamicFlag) {
      res.status(400).json({ error: 'Missing required fields: userId, challengeId, dockerImage, dynamicFlag' });
      return;
    }

    const existing = lifecycle.getByUser(body.userId, body.challengeId);

    if (existing) {
      const containerId = findContainerIdByEntry(existing);
      if (!containerId) {
        res.status(500).json({ error: 'Container not found in registry' });
        return;
      }
      const wsUrl = `ws://${process.env.HOST_ADDRESS || 'localhost'}:${existing.port}`;
      res.json({ containerId, wsUrl });
      return;
    }

    const { containerId, port } = await spawnContainer(
      body.userId,
      body.challengeId,
      body.dockerImage,
      body.dynamicFlag
    );

    lifecycle.register(containerId, body.userId, body.challengeId, port);

    const wsUrl = `ws://${process.env.HOST_ADDRESS || 'localhost'}:${port}`;
    res.json({ containerId, wsUrl });
  } catch (error) {
    if (error instanceof CapacityError) {
      res.status(error.statusCode).json({
        error: error.message,
        runningCount: error.runningCount,
        maxContainers: error.maxContainers
      });
      return;
    }

    const errMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: errMsg });
  }
});

router.delete('/containers/:containerId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { containerId } = req.params;
    await destroyContainer(containerId);
    lifecycle.remove(containerId);
    res.json({ destroyed: true });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: errMsg });
  }
});

router.post('/containers/:containerId/extend', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { containerId } = req.params;
    const body = req.body as { minutes?: number };

    if (!body.minutes || body.minutes < 5 || body.minutes > 60) {
      res.status(400).json({ error: 'minutes must be between 5 and 60' });
      return;
    }

    const expiresAt = lifecycle.setCustomExpiry(containerId, body.minutes);
    res.json({ expiresAt: expiresAt.toISOString() });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    if (errMsg.includes('not found')) {
      res.status(404).json({ error: 'Container not found' });
      return;
    }
    res.status(500).json({ error: errMsg });
  }
});

router.get('/containers/status', authMiddleware, (_req: Request, res: Response) => {
  const containers = lifecycle.getAllContainers();
  res.json({
    running: lifecycle.getRunningCount(),
    max: maxContainers,
    containers
  });
});

router.patch('/config', authMiddleware, (req: Request, res: Response) => {
  const body = req.body as { maxContainers?: number; timeoutMinutes?: number };

  if (body.maxContainers !== undefined) {
    if (body.maxContainers < 1) {
      res.status(400).json({ error: 'maxContainers must be at least 1' });
      return;
    }
    maxContainers = body.maxContainers;
    setDockerMaxContainers(maxContainers);
  }

  if (body.timeoutMinutes !== undefined) {
    if (body.timeoutMinutes < 1) {
      res.status(400).json({ error: 'timeoutMinutes must be at least 1' });
      return;
    }
    timeoutMinutes = body.timeoutMinutes;
    lifecycle.setTimeoutMinutes(timeoutMinutes);
  }

  res.json({
    maxContainers,
    timeoutMinutes
  });
});

export default router;