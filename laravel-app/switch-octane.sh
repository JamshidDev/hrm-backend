#!/bin/bash
sudo ln -sf /etc/nginx/sites-available/hrm /etc/nginx/sites-enabled/hrm

sudo supervisorctl stop php-fpm-backend
sudo supervisorctl start octane-backend

sudo nginx -s reload
echo "Nginx Octane mode"
