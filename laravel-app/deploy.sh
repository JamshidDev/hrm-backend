#!/bin/bash

echo "Production Deploy ..."

echo "Git pull..."
git pull origin main

echo "Migrations ..."
php artisan migrate --force

echo "Config, Route, Event cache ..."
php artisan config:cache
php artisan route:cache
php artisan event:cache

echo "Queue workers restart..."
sudo supervisorctl restart queue-worker:*

echo "Deploy finished!"
