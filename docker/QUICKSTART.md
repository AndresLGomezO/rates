# Docker Emulators Quick Start

Get Firebase emulators running in Docker in 3 steps:

## 1. Build the Docker Image

```bash
pnpm docker:emulators:build
```

## 2. Start the Emulators

```bash
pnpm docker:emulators:up
```

## 3. Access the Emulator UI

Open http://localhost:4000 in your browser.

## That's It! 🎉

Your emulators are now running. Your app can connect to them using:

```env
VITE_USE_FIREBASE_EMULATOR=true
VITE_FIREBASE_MODE=emulator
VITE_FIREBASE_EMULATOR_HOST=localhost
```

## Common Commands

- **View logs**: `pnpm docker:emulators:logs`
- **Stop emulators**: `pnpm docker:emulators:down`
- **Restart**: `pnpm docker:emulators:restart`
- **Clear all data**: `pnpm docker:emulators:clean`

## Troubleshooting

### Port Already in Use

If ports 4000, 5001, 8080, 9099, or 9199 are already in use:

1. Stop the conflicting service, or
2. Create `docker-compose.override.yml` to change ports

### Emulators Won't Start

1. Check logs: `pnpm docker:emulators:logs`
2. Rebuild: `pnpm docker:emulators:build`
3. Check Docker is running: `docker ps`

For more details, see [README.md](./README.md).
