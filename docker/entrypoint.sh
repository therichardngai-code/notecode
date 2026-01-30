#!/bin/sh
# NoteCode - Docker Entrypoint Script
# Starts Nginx (frontend) + Backend server

set -e

echo "========================================="
echo "NoteCode - Starting Services"
echo "========================================="
echo "Environment: ${NODE_ENV:-production}"
echo "Database: ${DATABASE_PATH:-/data/app.db}"
echo "Port: 80 (Nginx) | 3001 (Backend)"
echo "========================================="

# Ensure data directory exists
mkdir -p /data
echo "✓ Data directory ready: /data"

# Start Nginx in background
echo "Starting Nginx..."
nginx -g 'daemon off;' &
NGINX_PID=$!
echo "✓ Nginx started (PID: $NGINX_PID)"

# Start Backend server
echo "Starting Backend server..."
cd /app/backend

# Set NODE_ENV if not set
export NODE_ENV=${NODE_ENV:-production}

# Start backend process
node dist/main.js &
BACKEND_PID=$!
echo "✓ Backend started (PID: $BACKEND_PID)"

echo "========================================="
echo "NoteCode is running!"
echo "Frontend: http://localhost"
echo "Backend API: http://localhost:3001"
echo "========================================="

# Trap signals for graceful shutdown
trap 'echo "Received SIGTERM, shutting down..."; kill -TERM $NGINX_PID $BACKEND_PID; wait' TERM INT

# Wait for both processes
wait $NGINX_PID $BACKEND_PID

# Exit with status of process that exited first
EXIT_STATUS=$?
echo "NoteCode stopped (exit code: $EXIT_STATUS)"
exit $EXIT_STATUS
