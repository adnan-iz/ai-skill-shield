module.exports = {
  apps: [{
    name: 'ai-skill-shield',
    script: '.next/standalone/server.js',
    cwd: '/www/wwwroot/ai-skill-sheild/ai-skill-shield/.next/standalone',
    interpreter: '/www/server/nodejs/v20.19.5/bin/node',
    interpreter_args: '--env-file=/www/wwwroot/ai-skill-sheild/ai-skill-shield/.next/standalone/.env',
    max_memory_restart: '1G',
  }]
}
