FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

EXPOSE 3001

CMD ["node", "dist/index.js"]

# Run with Docker socket bind-mounted:
# docker run -v /var/run/docker.sock:/var/run/docker.sock container-manager