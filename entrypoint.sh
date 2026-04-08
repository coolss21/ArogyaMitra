#!/bin/bash
set -e

# Cloud Run injects $PORT (default 8080)
PORT=${PORT:-8080}

# Replace Nginx listen port dynamically
sed -i "s/listen 8080/listen ${PORT}/g" /etc/nginx/conf.d/default.conf

# Ensure the SQLite data directory exists and is writable
mkdir -p /app/data

# Run Alembic migrations (create tables if needed)
cd /app/backend
python -c "from app.database import Base, engine; Base.metadata.create_all(bind=engine)" 2>/dev/null || true
cd /app

# Start supervisor to boot both Nginx and FastAPI
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
