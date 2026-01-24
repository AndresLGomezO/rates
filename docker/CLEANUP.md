# Docker Emulator Cleanup and Recreation

## Complete Cleanup Script

Run the cleanup script to completely remove and recreate all Docker resources:

```bash
./docker/cleanup-and-recreate.sh
```

Or manually:

```bash
cd docker
./cleanup-and-recreate.sh
```

## Manual Cleanup Steps

If you prefer to do it manually:

### 1. Stop and Remove Everything

```bash
cd /Users/andresgomezortiz/Projects/rates
docker-compose -f docker/docker-compose.yml down -v --remove-orphans
```

### 2. Remove Containers

```bash
docker ps -a --filter "name=rates-firebase-emulators" --format "{{.ID}}" | xargs docker rm -f
```

### 3. Remove Images

```bash
docker images --format "{{.Repository}}:{{.Tag}}" | grep -E "(rates|firebase-emulator|docker-firebase-emulators)" | xargs docker rmi -f
```

### 4. Remove Volumes

```bash
docker volume ls --format "{{.Name}}" | grep -E "(rates|firebase|docker)" | xargs docker volume rm
```

### 5. Remove Networks

```bash
docker network ls --format "{{.Name}}" | grep -E "(rates|docker)" | xargs docker network rm
```

### 6. Prune System (Optional)

```bash
docker system prune -f --volumes
```

### 7. Rebuild and Start

```bash
cd /Users/andresgomezortiz/Projects/rates
docker-compose -f docker/docker-compose.yml build --no-cache
docker-compose -f docker/docker-compose.yml up -d
```

### 8. Verify

```bash
docker-compose -f docker/docker-compose.yml ps
```

## Using Makefile Commands

Alternatively, use the Makefile:

```bash
cd docker
make clean    # Stop and remove volumes
make build    # Rebuild image
make up       # Start emulators
make status   # Check status
```

## Troubleshooting

### Permission Denied

If you get permission errors, ensure Docker Desktop is running and you have proper permissions:

```bash
# Check Docker is running
docker ps

# If needed, restart Docker Desktop
```

### Port Already in Use

If ports are already in use:

```bash
# Find what's using the ports
lsof -i :4000
lsof -i :9099
lsof -i :8080

# Kill the processes or change ports in docker-compose.yml
```

### Stale Resources

If cleanup doesn't work, force remove:

```bash
# Force remove containers
docker rm -f $(docker ps -aq --filter "name=rates")

# Force remove volumes
docker volume rm $(docker volume ls -q --filter "name=rates")

# Force remove networks
docker network rm $(docker network ls -q --filter "name=rates")
```
