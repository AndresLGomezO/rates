# Docker Emulators Verification

Use this checklist to verify your Docker emulators setup is working correctly.

## Pre-flight Checks

- [ ] Docker is installed and running (`docker ps`)
- [ ] Docker Compose is available (`docker-compose --version`)
- [ ] Ports 4000, 5001, 8080, 9099, 9199 are available

## Build Verification

```bash
# Build the Docker image
pnpm docker:emulators:build

# Verify image was created
docker images | grep rates-firebase-emulators
```

Expected: Image should be listed with name containing `rates-firebase-emulators`

## Start Verification

```bash
# Start emulators
pnpm docker:emulators:up

# Check container is running
docker ps | grep rates-firebase-emulators
```

Expected: Container should be running and healthy

## Port Verification

```bash
# Check all ports are exposed
docker port rates-firebase-emulators
```

Expected output should show:

- 4000/tcp -> 0.0.0.0:4000
- 5001/tcp -> 0.0.0.0:5001
- 8080/tcp -> 0.0.0.0:8080
- 9099/tcp -> 0.0.0.0:9099
- 9199/tcp -> 0.0.0.0:9199

## UI Verification

1. Open http://localhost:4000 in your browser
2. You should see the Firebase Emulator Suite UI
3. All services (Auth, Firestore, Storage, Functions) should show as "Online"

## Logs Verification

```bash
# View logs
pnpm docker:emulators:logs
```

Expected: Should see Firebase emulator startup messages without errors

## Health Check

```bash
# Check container health
docker inspect rates-firebase-emulators | grep -A 10 Health
```

Expected: Health status should be "healthy" after ~30 seconds

## Data Persistence Verification

```bash
# Create some test data in Firestore via the UI
# Stop emulators
pnpm docker:emulators:down

# Start again
pnpm docker:emulators:up

# Check if data persisted
# Open UI and verify your test data is still there
```

Expected: Data should persist across restarts

## Cleanup Verification

```bash
# Clean everything
pnpm docker:emulators:clean

# Verify volume was removed
docker volume ls | grep firebase-emulator-data
```

Expected: Volume should not exist (or be empty)

## App Connection Verification

1. Set in your `.env.local`:

   ```env
   VITE_USE_FIREBASE_EMULATOR=true
   VITE_FIREBASE_MODE=emulator
   VITE_FIREBASE_EMULATOR_HOST=localhost
   ```

2. Start your app: `pnpm dev`

3. Try to connect to Firebase services

Expected: App should connect to Docker emulators without errors

## Troubleshooting

If any step fails:

1. Check logs: `pnpm docker:emulators:logs`
2. Rebuild: `pnpm docker:emulators:build`
3. Check Docker: `docker ps -a`
4. Check ports: `lsof -i :4000` (or other ports)
5. Review [README.md](./README.md) for detailed troubleshooting
