import dotenv from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import { validateEnv } from './validateEnv';
import { setManagerSecret } from './auth';
import { initDocker } from './docker';
import * as lifecycle from './lifecycle';
import routes from './routes';
import { handleWsUpgrade, initWsProxy } from './wsProxy';

dotenv.config();

const env = validateEnv();

setManagerSecret(env.MANAGER_SECRET);
initWsProxy(env.MANAGER_SECRET);

initDocker(env.DOCKER_SOCKET, env.MAX_CONTAINERS);
lifecycle.setTimeoutMinutes(env.CONTAINER_TIMEOUT_MINUTES);

const app = express();
app.use(express.json());
app.use(routes);

const server = createServer(app);

server.on('upgrade', (req, socket, head) => {
  const url = req.url || '';

  if (url.startsWith('/ws/')) {
    handleWsUpgrade(req, socket, head);
    return;
  }

  socket.destroy();
});

lifecycle.startReaper();

server.listen(env.PORT, () => {
  console.log(`Container manager running on port ${env.PORT}`);
  console.log(`Max containers: ${env.MAX_CONTAINERS}`);
  console.log(`Container timeout: ${env.CONTAINER_TIMEOUT_MINUTES} minutes`);
  console.log(`Docker socket: ${env.DOCKER_SOCKET}`);
});