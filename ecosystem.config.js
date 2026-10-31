// pm2로 실행할 때: pm2 start ecosystem.config.js
module.exports = { apps: [{ name: "skcdn-portal", script: "server/server.js", instances: 1, autorestart: true, max_memory_restart: "300M", env: { NODE_ENV: "production" } }] };
