# ── Stage 1: Build Frontend ────────────────────────────────────────────
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
# Empty VITE_API_BASE_URL forces frontend to call relative paths (/auth) instead of Absolute URLs
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

# Copy Built Frontend Source
COPY --from=frontend-builder /app/frontend/dist ./frontend_dist

# Configure Nginx & Supervisor
COPY nginx-standalone.conf /etc/nginx/sites-available/default
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Setup Entrypoint
COPY entrypoint.sh /app/entrypoint.sh
RUN sed -i 's/\r$//' /app/entrypoint.sh && chmod +x /app/entrypoint.sh

ENV PORT=8080
ENV ENVIRONMENT=production

EXPOSE ${PORT}

CMD ["/app/entrypoint.sh"]
