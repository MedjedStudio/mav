#!/bin/bash

echo "Waiting for MySQL to be ready..."

echo "Checking MySQL connection..."

# Check required environment variables
if [ -z "$MYSQL_USER" ]; then
    echo "Error: MYSQL_USER environment variable is required"
    exit 1
fi

if [ -z "$MYSQL_PASSWORD" ]; then
    echo "Error: MYSQL_PASSWORD environment variable is required"
    exit 1
fi

if [ -z "$MYSQL_DATABASE" ]; then
    echo "Error: MYSQL_DATABASE environment variable is required"
    exit 1
fi

# Wait for MySQL to be ready (Docker environment uses 'mysql' as hostname)
while ! mysqladmin ping -h"mysql" -u"${MYSQL_USER}" -p"${MYSQL_PASSWORD}" --skip-ssl --silent >/dev/null 2>&1; do
    echo "MySQL connection attempt failed, retrying in 2 seconds..."
    sleep 2
done

echo "MySQL is ready. Running migrations..."
cd /app
alembic upgrade head

echo "Migrations completed successfully!"