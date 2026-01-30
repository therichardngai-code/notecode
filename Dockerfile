# ================================
# NoteCode - Multi-stage Docker Build
# ================================
# Builds frontend + backend into single production container
# with Nginx reverse proxy

# ================================
# Stage 1: Build Frontend
# ================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Install dependencies
COPY frontend/package*.json ./
RUN npm ci --production=false

# Copy source and build
COPY frontend/ ./
RUN npm run build

# ================================
# Stage 2: Build Backend
# ================================
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend

# Install dependencies
COPY backend/package*.json ./
RUN npm ci --production=false

# Copy source and build
COPY backend/ ./
RUN npm run build

# ================================
# Stage 3: Production Image
# ================================
FROM node:20-alpine

LABEL maintainer="NoteCode Team"
LABEL description="NoteCode - AI-powered coding workspace"
LABEL version="1.0.0"

WORKDIR /app

# Install runtime dependencies and tools
RUN apk add --no-cache \
    nginx \
    tini \
    dumb-init \
    curl \
    wget

# Copy built backend
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/package*.json ./backend/

# Install production dependencies only
WORKDIR /app/backend
RUN npm ci --production && npm cache clean --force

# Copy built frontend to Nginx directory
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html

# Copy Nginx configuration
COPY docker/nginx.conf /etc/nginx/nginx.conf

# Copy entrypoint script
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Create data directory with proper permissions
RUN mkdir -p /data && \
    chown -R node:node /data && \
    chown -R node:node /app

# Create Nginx directories
RUN mkdir -p /var/log/nginx /var/lib/nginx/tmp && \
    chown -R nginx:nginx /var/log/nginx /var/lib/nginx

# Expose ports
EXPOSE 80 3001

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

# Switch to node user for security
USER node

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--", "/entrypoint.sh"]
