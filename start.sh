#!/bin/sh

while true; do
  echo "Starting bot..."
  node bot.js
  echo "Bot exited with code $?. Restarting in 5 seconds..."
  sleep 5
done
