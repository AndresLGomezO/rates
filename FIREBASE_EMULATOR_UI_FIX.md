# Firebase Emulator UI Error Fix

## Problem

The Firebase Emulator UI (at http://127.0.0.1:4000) is showing Redux Saga errors when trying to connect to the Auth emulator. This typically happens when:

1. **Project ID mismatch** - UI can't find the project configuration
2. **Emulator not fully started** - Auth emulator isn't ready yet
3. **Connection issues** - Network/port binding problems

## Solution

### Step 1: Verify Emulator Status

Run the diagnostic script:

```bash
./docker/check-emulators.sh
```

Or manually check:

```bash
# Check container is running
docker ps | grep rates-firebase-emulators

# Check project ID
docker exec rates-firebase-emulators printenv FIREBASE_PROJECT_ID

# Check logs for errors
docker logs rates-firebase-emulators --tail 50
```

### Step 2: Ensure Project ID is Correct

The project ID must be consistent:

```bash
# Check current project ID in Docker
docker exec rates-firebase-emulators printenv FIREBASE_PROJECT_ID

# Should output: demo-project
```

If it's wrong, fix it:

```bash
./fix-project-id.sh demo-project
docker restart rates-firebase-emulators
```

### Step 3: Verify Ports are Accessible

```bash
# Check Emulator UI
curl http://127.0.0.1:4000

# Check Auth Emulator
curl http://127.0.0.1:9099/emulator/v1/projects/demo-project/config
```

### Step 4: Restart Emulators

If issues persist, restart:

```bash
# Stop
pnpm docker:emulators:down

# Start fresh
pnpm docker:emulators:up

# Wait 10-15 seconds for full startup
sleep 15

# Check status
./docker/check-emulators.sh
```

## Common Issues

### Issue: Project ID is "your-project-id" or placeholder

**Fix:**

```bash
# Set correct project ID
echo "FIREBASE_PROJECT_ID=demo-project" > .env.docker

# Restart Docker
docker restart rates-firebase-emulators
```

### Issue: Emulator UI shows "Loading..." forever

**Fix:**

1. Check container logs: `docker logs rates-firebase-emulators`
2. Look for Java/startup errors
3. Ensure all ports are accessible
4. Try rebuilding: `pnpm docker:emulators:build`

### Issue: Redux Saga errors in Emulator UI

**Fix:**

1. Clear browser cache for http://127.0.0.1:4000
2. Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
3. Check that Auth emulator is responding:
   ```bash
   curl http://127.0.0.1:9099/emulator/v1/projects/demo-project/config
   ```
4. Restart the container if needed

## Verification Checklist

- [ ] Docker container is running: `docker ps | grep rates-firebase-emulators`
- [ ] Project ID is `demo-project`: `docker exec rates-firebase-emulators printenv FIREBASE_PROJECT_ID`
- [ ] Emulator UI accessible: http://127.0.0.1:4000
- [ ] Auth emulator responding: `curl http://127.0.0.1:9099`
- [ ] No errors in logs: `docker logs rates-firebase-emulators | grep -i error`

## Quick Fix Command

Run this to fix common issues:

```bash
# Ensure .env.docker exists with correct project ID
./setup-env-docker.sh

# Restart emulators
pnpm docker:emulators:down
pnpm docker:emulators:up

# Wait for startup
sleep 15

# Verify
./docker/check-emulators.sh
```
