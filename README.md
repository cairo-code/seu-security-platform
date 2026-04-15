# SEU Security Platform

A cybersecurity training platform for students at Prince Sultan University.

## Architecture

The platform consists of a Next.js web application and a separate container management service. The container manager handles spinning up Docker containers for interactive challenges, while the main app manages user authentication, progress tracking, and content delivery.

## Prerequisites

- Node.js 20
- Docker and Docker Compose
- Neon PostgreSQL account (cloud-hosted database)
- Cloudinary account (for certificate image storage)

## Setup

1. Clone the repository and navigate to the project directory

2. Copy the environment example file:
```bash
cp .env.example .env
```

3. Fill in the `.env` file with your configuration:
- `DATABASE_URL` - Neon PostgreSQL connection string
- `JWT_SECRET` - Minimum 32 characters
- `JWT_REFRESH_SECRET` - Minimum 32 characters
- `FLAG_SECRET` - Minimum 32 characters
- `MANAGER_SECRET` - Minimum 32 characters (same value in container-manager/.env)
- `CONTAINER_MANAGER_URL` - http://localhost:3001
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` - Your Cloudinary credentials
- `NEXT_PUBLIC_APP_URL` - http://localhost:3000

4. Install dependencies:
```bash
npm install
```

5. Run database migrations:
```bash
npx prisma migrate dev
```

6. Seed the database:
```bash
npx prisma db seed
```

7. Start the development server:
```bash
npm run dev
```

## Production

Build and run with Docker Compose:

```bash
docker-compose up --build
```

## Container Manager Setup

The container-manager service requires Docker to be available. In production, it needs access to the Docker socket:

```bash
docker run -v /var/run/docker.sock:/var/run/docker.sock container-manager
```

Or use the docker-compose setup which already mounts the socket.

## Default Credentials

After seeding, the following users are available:

- **Admin**: universityId: `ADMIN001`, password: `ChangeMe123!`
- **Teacher**: universityId: `TEACHER001`, password: `ChangeMe123!`

**Warning**: Change these passwords immediately after first login.