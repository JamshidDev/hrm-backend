// pm2 process config — prod serverda NestJS app'ni boshqarish.
//
// Foydalanish (serverда):
//   pnpm install --frozen-lockfile
//   pnpm build                       # dist/ yaratadi
//   pm2 start ecosystem.config.js --env production
//   pm2 save                         # restartда avtomatik ko'tarilishi uchun
//   pm2 startup                      # OS boot'da pm2'ni ishga tushiradi (chiqqаn buyruqni bajaring)
//
// Log:   pm2 logs hrm-nestjs
// Reload: pm2 reload hrm-nestjs      # zero-downtime qayta yuklash (build'dan keyin)
module.exports = {
  apps: [
    {
      name: 'hrm-nestjs',
      script: 'dist/main.js',
      cwd: __dirname,

      // fork mode, 1 instance — nestjs-cls (per-request context) va in-memory
      // holatlar uchun xavfsiz. Socket.io redis-adapterи bor, lekin cluster'ga
      // o'tishdan oldin presence/CLS holatini tekshirish kerak. Hozir 1 instance.
      instances: 1,
      exec_mode: 'fork',

      // Ba'zi export endpointlar 50K+ rows yuklab JS heap'ni to'ldiradi
      // (CLAUDE.md'da ko'rsatilgan). Heap limitini oshiramiz.
      node_args: '--max-old-space-size=8192',

      // Crash bo'lganda avtomatik restart.
      autorestart: true,
      max_restarts: 10,
      min_uptime: '20s',

      // RAM 1.5G dan oshsa restart (memory leak xavfsizligi).
      max_memory_restart: '1500M',

      // Muhit o'zgaruvchilari .env fayldan oʻqiladi (@nestjs/config orqali).
      // Bu yerda faqat NODE_ENV beriladi.
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },

      // Log fayllar.
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
