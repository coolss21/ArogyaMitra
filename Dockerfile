# ── Stage 1: Build Frontend ────────────────────────────────────────────
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
# Empty VITE_API_BASE_URL forces frontend to call relative paths (/auth/...)
RUN VITE_API_BASE_URL="" npm run build

# ── Stage 2: Build Backend & Server ───────────────────────────────────
FROM python:3.11-slim
WORKDIR /app

# Install Nginx and Supervisor
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx supervisor libpq5 curl gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Install Backend Dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy Backend Source
COPY backend/ ./backend/

# Create writable directory for SQLite database (Cloud Run has writable /tmp)
RUN mkdir -p /app/data

# Copy Built Frontend
COPY --from=frontend-builder /app/frontend/dist ./frontend_dist

# Configure Nginx — use conf.d instead of sites-available for reliability
COPY nginx-standalone.conf /etc/nginx/conf.d/default.conf
# Remove the default nginx site config to avoid conflicts
RUN rm -f /etc/nginx/sites-enabled/default /etc/nginx/sites-available/default

# Configure Supervisor
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Setup Entrypoint
COPY entrypoint.sh /app/entrypoint.sh
RUN sed -i 's/\r$//' /app/entrypoint.sh && chmod +x /app/entrypoint.sh

# Defaults — overridden by Cloud Run env vars
ENV PORT=8080
ENV ENVIRONMENT=production
ENV DATABASE_URL=sqlite:////app/data/arogyamitra.db

EXPOSE ${PORT}

CMD ["/app/entrypoint.sh"]
