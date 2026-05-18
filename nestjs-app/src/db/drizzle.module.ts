import { Global, Inject, Module, type Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/db/schema';
import { relations } from '@/db/relations';
import type { DataSource } from '@/db/types';

export const DATA_SOURCE = 'DATA_SOURCE';
export const InjectDb = () => Inject(DATA_SOURCE);

const drizzleProvider: Provider = {
  provide: DATA_SOURCE,
  inject: [ConfigService],
  useFactory: (config: ConfigService): DataSource => {
    const client = postgres({
      host: config.get<string>('DB_HOST', '127.0.0.1'),
      port: config.get<number>('DB_PORT', 5432),
      user: config.get<string>('DB_USER', 'mack'),
      // postgres-js bo'sh stringni rad etadi.
      password: config.get<string>('DB_PASSWORD') || undefined,
      database: config.get<string>('DB_NAME', 'hrm'),
      max: 20,
      idle_timeout: 20,
    });
    // schema + relations: db.select() uchun ham, db.query.X uchun ham ishlaydi.
    return drizzle(client, { schema, relations });
  },
};

@Global()
@Module({
  imports: [ConfigModule],
  providers: [drizzleProvider],
  exports: [DATA_SOURCE],
})
export class DrizzleModule {}
