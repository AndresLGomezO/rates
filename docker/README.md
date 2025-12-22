# Firebase Emulators with Docker

This directory contains Docker configuration for running Firebase emulators in a containerized environment.

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Docker daemon running

### Start Emulators

```bash
# From project root
pnpm docker:emulators:up

# Or using docker-compose directly
docker-compose -f docker/docker-compose.yml up -d
```

### Stop Emulators

```bash
pnpm docker:emulators:down
```

### View Logs

```bash
pnpm docker:emulators:logs
```

## Available Scripts

All scripts should be run from the project root:

- `pnpm docker:emulators:up` - Start emulators in detached mode
- `pnpm docker:emulators:down` - Stop emulators
- `pnpm docker:emulators:logs` - View emulator logs (follow mode)
- `pnpm docker:emulators:restart` - Restart emulators
- `pnpm docker:emulators:build` - Rebuild Docker image
- `pnpm docker:emulators:clean` - Stop and remove volumes (clears all data)

## Accessing Emulators

Once started, the emulators are available at:

- **Emulator UI**: http://localhost:4000
- **Auth Emulator**: http://localhost:9099
- **Firestore Emulator**: http://localhost:8080
- **Storage Emulator**: http://localhost:9199
- **Functions Emulator**: http://localhost:5001

## Configuration

### Environment Variables

1. Copy `docker/env.docker.example` to `.env.docker` (optional, for custom config)
2. Set `FIREBASE_PROJECT_ID` if you want to use a specific project ID (defaults to `default`)

### Port Customization

To change ports, create a `docker-compose.override.yml` file:

```yaml
version: '3.8'

services:
  firebase-emulators:
    ports:
      - '4001:4000' # Use port 4001 for UI instead of 4000
      - '9100:9099' # Use port 9100 for Auth instead of 9099
```

### Data Persistence

Emulator data is persisted in a Docker volume named `firebase-emulator-data`. This means:

- Data persists across container restarts
- To clear data, use `pnpm docker:emulators:clean`
- Volume location: Managed by Docker (check with `docker volume inspect rates-firebase-emulator-data`)

## Connecting Your App

Your app should connect to the emulators using `localhost` as the host (since ports are mapped to the host):

```env
VITE_USE_FIREBASE_EMULATOR=true
VITE_FIREBASE_MODE=emulator
VITE_FIREBASE_EMULATOR_HOST=localhost
VITE_FIREBASE_EMULATOR_AUTH_PORT=9099
VITE_FIREBASE_EMULATOR_FIRESTORE_PORT=8080
VITE_FIREBASE_EMULATOR_STORAGE_PORT=9199
VITE_FIREBASE_EMULATOR_FUNCTIONS_PORT=5001
```

## Development Workflow

### Typical Development Flow

1. Start emulators: `pnpm docker:emulators:up`
2. Start your app: `pnpm dev`
3. Your app will connect to the Dockerized emulators
4. View emulator UI at http://localhost:4000
5. When done: `pnpm docker:emulators:down`

### Hot Reload of Firebase Config

The `firebase/` directory is mounted as read-only, so changes to:

- `firebase/firestore.rules`
- `firebase/firestore.indexes.json`
- `firebase/firebase.json`

Will require a container restart to take effect:

```bash
pnpm docker:emulators:restart
```

## Troubleshooting

### Port Already in Use

If you get port conflicts, either:

1. Stop the conflicting service
2. Change ports in `docker-compose.override.yml`
3. Use `docker-compose -f docker/docker-compose.yml down` to free ports

### Emulators Not Starting

1. Check logs: `pnpm docker:emulators:logs`
2. Verify Docker is running: `docker ps`
3. Rebuild image: `pnpm docker:emulators:build`
4. Check Java installation in container (required for Firestore emulator)

### Data Not Persisting

- Verify volume exists: `docker volume ls | grep firebase`
- Check volume mount in container: `docker inspect rates-firebase-emulators`
- Recreate volume: `pnpm docker:emulators:clean && pnpm docker:emulators:up`

### Connection Issues

- Ensure emulators are running: `docker ps | grep firebase`
- Check port mappings: `docker port rates-firebase-emulators`
- Verify environment variables in your app match the Docker port mappings

## Advanced Usage

### Running Multiple Instances

To run multiple emulator instances (e.g., for different projects):

1. Create separate compose files: `docker-compose.project1.yml`, `docker-compose.project2.yml`
2. Use different project names: `docker-compose -p project1 -f docker/docker-compose.project1.yml up`

### Custom Java Version

Firebase tools requires Java 21 or above. The Dockerfile uses Java 21 by default. If you need a different Java version, modify `Dockerfile.firebase-emulators`:

```dockerfile
# For Java 21 (required minimum)
RUN apt-get update && \
    apt-get install -y openjdk-21-jre-headless && \
    rm -rf /var/lib/apt/lists/*
```

### Network Configuration

The emulators run on a Docker network (`rates-network`). If your app is also containerized:

1. Connect your app container to the same network
2. Use `firebase-emulators` as the hostname instead of `localhost`
3. Update environment variables accordingly

## Comparison: Docker vs Local

| Feature          | Docker                         | Local (`pnpm firebase:emulators`) |
| ---------------- | ------------------------------ | --------------------------------- |
| Isolation        | ✅ Full container isolation    | ❌ Uses host system               |
| Consistency      | ✅ Same environment everywhere | ⚠️ Depends on local setup         |
| Portability      | ✅ Works on any Docker host    | ⚠️ Requires Node.js/Java locally  |
| Data Persistence | ✅ Docker volumes              | ⚠️ Local filesystem               |
| Resource Usage   | ⚠️ Higher (container overhead) | ✅ Lower                          |
| Setup Complexity | ⚠️ Requires Docker             | ✅ Simple (just `pnpm install`)   |

Choose Docker if:

- You want consistent environments across team
- You're already using Docker in your workflow
- You want to isolate emulators from your system

Choose Local if:

- You want faster startup
- You don't want Docker overhead
- You're doing quick local testing

## See Also

- [Firebase Emulator Documentation](https://firebase.google.com/docs/emulator-suite)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- Main project README for Firebase setup
