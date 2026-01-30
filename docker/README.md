# Docker Setup for NoteCode

## Quick Start

```bash
# Build and start
docker-compose up --build

# Access application
# Frontend: http://localhost:8080
# Backend API: http://localhost:3001

# Stop
docker-compose down

# Clean everything (including data)
docker-compose down -v
```

## Configuration

### Environment Variables

Create `.env` file in project root:

```env
# Host configuration
HOST_PORT=8080
BACKEND_PORT=3001

# Application environment
NODE_ENV=production

# Logging
LOG_LEVEL=info

# CORS (for development)
CORS_ORIGIN=http://localhost:8080

# Data storage path (host machine)
DATA_PATH=./data

# Optional: API keys
# ANTHROPIC_API_KEY=your_key_here
# GOOGLE_API_KEY=your_key_here
```

## Production Deployment

### 1. Build Production Image

```bash
docker build -t notecode:1.0.0 .
```

### 2. Push to Registry

```bash
# Tag for your registry
docker tag notecode:1.0.0 registry.example.com/notecode:1.0.0

# Push
docker push registry.example.com/notecode:1.0.0
```

### 3. Deploy on Server

```bash
docker run -d \
  --name notecode \
  -p 80:80 \
  -p 3001:3001 \
  -v /var/notecode/data:/data \
  -e NODE_ENV=production \
  -e LOG_LEVEL=info \
  --restart unless-stopped \
  registry.example.com/notecode:1.0.0
```

## Development Mode

### With Live Reload (Optional)

Uncomment volume mounts in `docker-compose.yml`:

```yaml
volumes:
  - ./backend/src:/app/backend/src:ro
  - ./frontend/src:/app/frontend/src:ro
```

Then rebuild:

```bash
docker-compose up --build
```

## Monitoring

### View Logs

```bash
# All logs
docker-compose logs -f

# Backend only
docker-compose logs -f notecode

# Nginx access logs
docker exec notecode-app tail -f /var/log/nginx/access.log

# Nginx error logs
docker exec notecode-app tail -f /var/log/nginx/error.log
```

### Health Check

```bash
# Container health
docker ps

# Application health
curl http://localhost:8080/health

# Backend API health
curl http://localhost:3001/api/system/platform
```

### Enter Container

```bash
docker exec -it notecode-app /bin/sh
```

## Troubleshooting

### Port Already in Use

```bash
# Change ports in .env
HOST_PORT=9090
BACKEND_PORT=9091
```

### Database Issues

```bash
# Check database file
docker exec notecode-app ls -la /data

# Reset database (WARNING: deletes all data)
docker-compose down -v
docker-compose up --build
```

### Nginx Issues

```bash
# Test Nginx config
docker exec notecode-app nginx -t

# Reload Nginx
docker exec notecode-app nginx -s reload
```

## File Structure

```
docker/
├── nginx.conf        # Nginx reverse proxy config
├── entrypoint.sh     # Container startup script
└── README.md         # This file

Root files:
├── Dockerfile        # Multi-stage build
├── docker-compose.yml # Orchestration
└── .dockerignore     # Build exclusions
```

## Security Notes

1. **Environment Variables**: Use Docker secrets for production API keys
2. **Nginx User**: Runs as `nginx` user (non-root)
3. **Backend User**: Runs as `node` user (non-root)
4. **Health Checks**: Enabled for container monitoring
5. **Resource Limits**: Configure in docker-compose.yml

## Performance Optimization

### 1. Build Cache

```bash
# Use BuildKit for faster builds
DOCKER_BUILDKIT=1 docker-compose build
```

### 2. Resource Limits

Adjust in `docker-compose.yml`:

```yaml
deploy:
  resources:
    limits:
      cpus: '4'
      memory: 4G
```

### 3. Gzip Compression

Already enabled in `nginx.conf` for static assets.

## Backup & Restore

### Backup Database

```bash
# Copy from container
docker cp notecode-app:/data/app.db ./backup-$(date +%Y%m%d).db

# Or backup volume
docker run --rm -v notecode-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/data-backup.tar.gz /data
```

### Restore Database

```bash
# Copy to container
docker cp ./backup.db notecode-app:/data/app.db

# Restart
docker-compose restart
```
