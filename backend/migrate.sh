#!/bin/bash

echo "Waiting for MySQL to be ready..."
while ! mysqladmin ping -h"mysql" -u"mav_user" -p"mav_password" --silent; do
    sleep 1
done

echo "MySQL is ready. Running migrations..."
cd /app
alembic upgrade head

echo "Migrations completed successfully!"