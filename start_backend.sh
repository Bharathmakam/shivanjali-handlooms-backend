#!/bin/bash
# Backend startup script that survives terminal detach
cd /Users/makamamarender/repo/shivanjali-handlooms/backend
export PORT=3001
export NODE_ENV=development
exec node dist/src/main.js