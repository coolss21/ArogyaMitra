#!/bin/bash
set -e

# Cloud Run injects $PORT. We must replace Nginx's default 8080 with it.
sed -i "s/listen 8080/listen ${PORT}/g" /etc/nginx/sites-available/default

# Start supervisor to boot both Nginx and FastAPI
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
