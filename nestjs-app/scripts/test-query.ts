import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/db/schema';
import { relations } from '../src/db/relations';
import { eq, and } from 'drizzle-orm';

const client = postgres({ host: '127.0.0.1', port: 5432, user: 'mack', database: 'hrm' });
const db = drizzle(client, { schema, relations });

(async () => {
  const code = 'c99bc38e8ff816122ff1e6b7cae38c7999febe93';

  const [b] = await db.select()
    .from(schema.oauth_client_codes)
    .where(and(
      eq(schema.oauth_client_codes.oauth_client_id, 1),
      eq(schema.oauth_client_codes.code, code),
    ))
    .limit(1);
  console.log('1. Builder:', b ? 'TOPILDI id=' + b.id : 'TOPILMADI');

  const r = await db.query.oauth_client_codes.findFirst({
    where: { oauth_client_id: 1, code },
  });
  console.log('2. Relational shorthand:', r ? 'TOPILDI id=' + r.id : 'TOPILMADI');

  const rWith = await db.query.oauth_client_codes.findFirst({
    where: { oauth_client_id: 1, code },
    with: { user: true },
  });
  console.log('3. Relational + with:', rWith ? `TOPILDI user.id=${rWith.user?.id}` : 'TOPILMADI');

  await client.end();
})().catch(e => { console.error(e); process.exit(1); });
