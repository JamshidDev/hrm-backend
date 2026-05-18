// DataSource va Tx tiplari (Foodly pattern bilan ekzakt mos).
// schema + relations ikki generic argument — `db.query.X.findFirst({ with: {...} })` uchun zarur.

import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '@/db/schema';
import type { relations } from '@/db/relations';

export type DataSource = PostgresJsDatabase<typeof schema, typeof relations>;

export type Tx = Parameters<Parameters<DataSource['transaction']>[0]>[0];
