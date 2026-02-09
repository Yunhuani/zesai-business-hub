export default {
  apps: [
    {
      name: 'zesai-business-hub',
      script: '/home/ubuntu/zesai-business-hub/dist/index.js',
      cwd: '/home/ubuntu/zesai-business-hub',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/pm2/zesai-error.log',
      out_file: '/var/log/pm2/zesai-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    },
  ],
};
