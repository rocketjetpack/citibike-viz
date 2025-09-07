#!/bin/sh

if [ -d /app/.git ]; then
  cd /app
  git reset --hard
  git pull origin main
else
  git clone git@github.com:rocketjetpack/citibike-viz.git
fi

cp -R /app/src/* /usr/share/nginx/html/

nginx -g "daemon off;"
