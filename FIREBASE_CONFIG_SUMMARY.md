# Firebase Configuration Summary

## Port Configuration

All ports are consistent across all configuration files:

| Service                | Port   | Files                                          |
| ---------------------- | ------ | ---------------------------------------------- |
| **Auth Emulator**      | `9099` | firebase.json, docker-compose.yml, env.example |
| **Firestore Emulator** | `8080` | firebase.json, docker-compose.yml, env.example |
| **Storage Emulator**   | `9199` | firebase.json, docker-compose.yml, env.example |
| **Functions Emulator** | `5001` | docker-compose.yml, env.example                |
| **Emulator UI**        | `4000` | firebase.json, docker-compose.yml              |

## Host/IP Configuration

- **Emulator Host**: `127.0.0.1` (consistent across all configs)
- **Auth App**: `http://127.0.0.1:5175`
- **Main App**: `http://127.0.0.1:5174`

## Project ID Configuration

**Standard Project ID**: `demo-project`

Must be set consistently in:

- Docker: `FIREBASE_PROJECT_ID=demo-project` (in `.env.docker` or docker-compose.yml)
- Auth App: `VITE_FIREBASE_PROJECT_ID=demo-project` (in `apps/auth-app/.env.local`)
- Main App: `VITE_FIREBASE_PROJECT_ID=demo-project` (in `apps/app/.env.local`)

## Firebase Configuration Values (Emulator Mode)

Use these demo values for emulator mode:

```bash
VITE_FIREBASE_API_KEY=demo-api-key
VITE_FIREBASE_AUTH_DOMAIN=demo-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=demo-project
VITE_FIREBASE_STORAGE_BUCKET=demo-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:demo
VITE_FIREBASE_MEASUREMENT_ID=G-DEMO123
```

## Emulator Configuration

```bash
VITE_USE_FIREBASE_EMULATOR=true
VITE_FIREBASE_EMULATOR_HOST=127.0.0.1
VITE_FIREBASE_EMULATOR_AUTH_PORT=9099
VITE_FIREBASE_EMULATOR_FIRESTORE_PORT=8080
VITE_FIREBASE_EMULATOR_STORAGE_PORT=9199
VITE_FIREBASE_EMULATOR_FUNCTIONS_PORT=5001
```

## Verification

Run the verification script to check consistency:

```bash
./verify-firebase-config.sh
```

## Quick Setup Checklist

- [ ] Docker `.env.docker` has `FIREBASE_PROJECT_ID=demo-project`
- [ ] `apps/auth-app/.env.local` has `VITE_FIREBASE_PROJECT_ID=demo-project`
- [ ] `apps/app/.env.local` has `VITE_FIREBASE_PROJECT_ID=demo-project`
- [ ] All emulator ports match (9099, 8080, 9199, 5001, 4000)
- [ ] Emulator host is `127.0.0.1` everywhere
- [ ] Docker container is running: `docker ps | grep rates-firebase-emulators`
- [ ] Emulator UI accessible: http://127.0.0.1:4000

## Common Issues

### Port Already in Use

```bash
# Check what's using the port
lsof -i :9099
lsof -i :4000

# Kill the process or change port in config
```

### Connection Refused

- Ensure Docker container is running: `docker ps`
- Check emulator logs: `docker logs rates-firebase-emulators`
- Verify host is `127.0.0.1`, not `localhost`

### Project ID Mismatch

- Ensure all three places use the same project ID
- Run `./fix-project-id.sh demo-project` to set consistently
