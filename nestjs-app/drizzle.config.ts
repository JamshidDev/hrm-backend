// Drizzle Kit konfiguratsiyasi
// Maqsad: mavjud HRM PostgreSQL bazasidan 562 jadval schema'sini introspect qilish
// Buyruq: pnpm drizzle-kit pull
//
// MUHIM: bu loyihada migration generate qilinmaydi (drizzle-kit generate ishlatmaymiz)
// chunki DB schema'ni Laravel boshqaradi. Biz faqat o'qiymiz va data CRUD qilamiz.

import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  // Schema fayl joyi
  schema: './src/db/schema.ts',
  // Pull natijasi (relations.ts ham shu yerga yoziladi)
  out: './src/db',
  dialect: 'postgresql',
  dbCredentials: {
    // Connection string formati — password bo'sh bo'lsa ham ishlaydi
    url: `postgresql://${process.env.DB_USER || 'mack'}${process.env.DB_PASSWORD ? ':' + process.env.DB_PASSWORD : ''}@${process.env.DB_HOST || '127.0.0.1'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'hrm'}`,
  },
  // DB column nomlarini DEYARLI o'zgartirmaymiz (snake_case'da qoldiradi).
  introspect: {
    casing: 'preserve',
  },
});
