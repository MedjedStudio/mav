#!/bin/bash

echo "Waiting for MySQL to be ready..."

echo "Checking MySQL connection..."
while ! mysql -h"mysql" -u"mav_user" --skip-ssl -e "SELECT 1" >/dev/null 2>&1; do
    echo "MySQL connection attempt failed, retrying in 2 seconds..."
    sleep 2
done

echo "MySQL is ready. Running migrations..."
cd /app
alembic upgrade head

echo "Migrations completed successfully!"