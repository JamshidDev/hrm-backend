#!/bin/bash
sudo ln -sf /etc/nginx/sites-available/classic /etc/nginx/sites-enabled/hrm

sudo supervisorctl stop octane-backend
sudo supervisorctl start php-fpm-backend

sudo nginx -s reload
echo "Nginx PHP-FPM mode"
