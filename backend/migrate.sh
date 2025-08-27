#!/bin/bash

echo "Waiting for MySQL to be ready..."

echo "Checking MySQL connection..."

# Check required environment variables
if [ -z "$MYSQL_HOST" ]; then
    echo "Error: MYSQL_HOST environment variable is required"
    exit 1
fi

if [ -z "$MYSQL_USER" ]; then
    echo "Error: MYSQL_USER environment variable is required"
    exit 1
fi

while ! mysql -h"${MYSQL_HOST}" -u"${MYSQL_USER}" --skip-ssl -e "SELECT 1" >/dev/null 2>&1; do
    echo "MySQL connection attempt failed, retrying in 2 seconds..."
    sleep 2
done

echo "MySQL is ready. Running migrations..."
cd /app
alembic upgrade head

echo "Migrations completed successfully!"