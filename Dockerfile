# Multi-stage build for Errandify

# Stage 1: Build backend
FROM node:18-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/src ./src
COPY backend/tsconfig.json ./
RUN npm run build

# Stage 2: Build frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend . .
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# Stage 3: Runtime
FROM node:18-alpine
WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy backend from builder
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/package*.json ./backend/
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules

# Copy frontend from builder
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Copy environment file template
COPY .env.example ./.env.example

# Install backend dependencies only (production)
WORKDIR /app/backend
RUN npm ci --only=production

WORKDIR /app

# Expose ports
EXPOSE 3000 5173

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start both backend and serve frontend
CMD ["sh", "-c", "cd /app/backend && npm start & cd /app/frontend/dist && npx serve -l 5173"]