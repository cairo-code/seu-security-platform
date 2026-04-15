import Docker from 'dockerode';
import { CapacityError } from './CapacityError';

let docker: Docker;
let maxContainers: number;

export function initDocker(socketPath: string, max: number): void {
  docker = new Docker({ socketPath });
  maxContainers = max;
}

export function setMaxContainers(max: number): void {
  maxContainers = max;
}

export function getMaxContainers(): number {
  return maxContainers;
}

export async function getRunningContainerCount(): Promise<number> {
  const containers = await docker.listContainers({
    all: false,
    filters: {
      label: ['seu.managed=true']
    }
  });
  return containers.length;
}

async function ensureImageExists(imageName: string): Promise<void> {
  const images = await docker.listImages({
    filters: {
      reference: [imageName]
    }
  });

  if (images.length === 0) {
    console.log(`Pulling image ${imageName}...`);
    await new Promise<void>((resolve, reject) => {
      docker.pull(imageName, (err: Error | null, stream: NodeJS.ReadableStream) => {
        if (err) {
          reject(err);
          return;
        }
        docker.modem.followProgress(stream, (err: Error | null) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }
}

function generateRandomPort(): number {
  return Math.floor(Math.random() * (49999 - 40000 + 1)) + 40000;
}

export async function spawnContainer(
  userId: string,
  challengeId: string,
  dockerImage: string,
  dynamicFlag: string
): Promise<{ containerId: string; port: number }> {
  const runningCount = await getRunningContainerCount();

  if (runningCount >= maxContainers) {
    throw new CapacityError(runningCount, maxContainers);
  }

  await ensureImageExists(dockerImage);

  const hostPort = generateRandomPort();

  const container = await docker.createContainer({
    Image: dockerImage,
    Labels: {
      'seu.managed': 'true',
      'seu.userId': userId,
      'seu.challengeId': challengeId
    },
    Env: [
      `FLAG=${dynamicFlag}`,
      'TERM=xterm-256color'
    ],
    ExposedPorts: {
      '7681/tcp': {}
    },
    HostConfig: {
      PortBindings: {
        '7681/tcp': [{ HostPort: hostPort.toString() }]
      },
      Memory: 256 * 1024 * 1024,
     CpuQuota: 50000,
      AutoRemove: true,
      NetworkMode: 'none'
    },
    NetworkingConfig: {
      EndpointsConfig: {
        none: {}
      }
    }
  });

  await container.start();

  const info = await container.inspect();
  return {
    containerId: info.Id,
    port: hostPort
  };
}

export async function destroyContainer(containerId: string): Promise<void> {
  try {
    const container = docker.getContainer(containerId);
    await container.stop({ t: 10 });
    await container.remove({ force: true });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    if (!errMsg.includes('No such container') && !errMsg.includes('container not found')) {
      throw error;
    }
  }
}

export async function heartbeat(containerId: string): Promise<void> {
  const container = docker.getContainer(containerId);
  const info = await container.inspect();

  if (!info.State.Running) {
    throw new Error('Container is not running');
  }
}