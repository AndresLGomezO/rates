# Firebase Settings Reference

## ✅ Verified Configuration

All Firebase settings have been standardized and verified. Here's the complete reference:

### Ports (All Consistent)

| Service            | Port     | Configuration Files                                |
| ------------------ | -------- | -------------------------------------------------- |
| Auth Emulator      | **9099** | firebase.json, docker-compose.yml, all env.example |
| Firestore Emulator | **8080** | firebase.json, docker-compose.yml, all env.example |
| Storage Emulator   | **9199** | firebase.json, docker-compose.yml, all env.example |
| Functions Emulator | **5001** | docker-compose.yml, all env.example                |
| Emulator UI        | **4000** | firebase.json, docker-compose.yml                  |

### Hosts/IPs

- **Emulator Host**: `127.0.0.1` (standardized across all configs)
- **Auth App URL**: `http://127.0.0.1:5175`
- **Main App URL**: `http://127.0.0.1:5174`
- **Default Return URL**: `http://127.0.0.1:5174` (main app)

### Project ID

**Standard**: `demo-project`

Set in:

- Docker: `FIREBASE_PROJECT_ID=demo-project` (`.env.docker`)
- Auth App: `VITE_FIREBASE_PROJECT_ID=demo-project` (`.env.local`)
- Main App: `VITE_FIREBASE_PROJECT_ID=demo-project` (`.env.local`)

### Firebase Config Values (Emulator)

```bash
VITE_FIREBASE_API_KEY=demo-api-key
VITE_FIREBASE_AUTH_DOMAIN=demo-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=demo-project
VITE_FIREBASE_STORAGE_BUCKET=demo-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:demo
VITE_FIREBASE_MEASUREMENT_ID=G-DEMO123
```

### Emulator Settings

```bash
VITE_USE_FIREBASE_EMULATOR=true
VITE_FIREBASE_EMULATOR_HOST=127.0.0.1
VITE_FIREBASE_EMULATOR_AUTH_PORT=9099
VITE_FIREBASE_EMULATOR_FIRESTORE_PORT=8080
VITE_FIREBASE_EMULATOR_STORAGE_PORT=9199
VITE_FIREBASE_EMULATOR_FUNCTIONS_PORT=5001
```

## Files Updated

✅ `firebase/firebase.json` - Ports verified
✅ `docker/docker-compose.yml` - Ports and project ID updated
✅ `env.example` - Host standardized to 127.0.0.1
✅ `apps/auth-app/env.example` - All ports added, return URL fixed
✅ `docker/env.docker.example` - Project ID updated to demo-project

## Quick Verification Commands

```bash
# Check Docker container is running
docker ps | grep rates-firebase-emulators

# Check project ID in Docker
docker exec rates-firebase-emulators printenv FIREBASE_PROJECT_ID

# Check ports are accessible
curl http://127.0.0.1:4000  # Emulator UI
curl http://127.0.0.1:9099  # Auth Emulator

# Verify configuration
./verify-firebase-config.sh
```

## All Settings Are Now Consistent! ✅
