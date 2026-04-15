interface EnvVars {
  MANAGER_SECRET: string;
  DOCKER_SOCKET: string;
  MAX_CONTAINERS: number;
  CONTAINER_TIMEOUT_MINUTES: number;
  PORT: number;
  HOST_ADDRESS?: string;
}

export function validateEnv(): EnvVars {
  const errors: string[] = [];

  const managerSecret = process.env.MANAGER_SECRET;
  if (!managerSecret) {
    errors.push('MANAGER_SECRET is required');
  } else if (managerSecret.length < 32) {
    errors.push('MANAGER_SECRET must be at least 32 characters');
  }

  const dockerSocket = process.env.DOCKER_SOCKET || '/var/run/docker.sock';

  const maxContainersStr = process.env.MAX_CONTAINERS;
  const maxContainers = maxContainersStr ? parseInt(maxContainersStr, 10) : 10;
  if (isNaN(maxContainers) || maxContainers < 1) {
    errors.push('MAX_CONTAINERS must be a positive integer');
  }

  const timeoutStr = process.env.CONTAINER_TIMEOUT_MINUTES;
  const timeoutMinutes = timeoutStr ? parseInt(timeoutStr, 10) : 30;
  if (isNaN(timeoutMinutes) || timeoutMinutes < 1) {
    errors.push('CONTAINER_TIMEOUT_MINUTES must be a positive integer');
  }

  const portStr = process.env.PORT;
  const port = portStr ? parseInt(portStr, 10) : 3001;
  if (isNaN(port) || port < 1 || port > 65535) {
    errors.push('PORT must be a valid port number');
  }

  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
  }

  return {
    MANAGER_SECRET: managerSecret!,
    DOCKER_SOCKET: dockerSocket,
    MAX_CONTAINERS: maxContainers,
    CONTAINER_TIMEOUT_MINUTES: timeoutMinutes,
    PORT: port,
    HOST_ADDRESS: process.env.HOST_ADDRESS
  };
}