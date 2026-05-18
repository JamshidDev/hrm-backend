import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/db/schema';
import { relations } from '../src/db/relations';

const client = postgres({ host: '127.0.0.1', port: 5432, user: 'mack', database: 'hrm' });
const db = drizzle(client, { schema, relations });

(async () => {
  // Same logic as oauth.service exchangeAuthCode
  const dto = { client_id: 'test-client', client_secret: 'test-secret', code: 'c99bc38e8ff816122ff1e6b7cae38c7999febe93' };

  const oauthClient = await db.query.oauth_clients.findFirst({
    where: {
      client_id: dto.client_id,
      client_secret: dto.client_secret,
      in_active: true,
    },
    columns: { id: true },
  });
  console.log('Client:', oauthClient);
  console.log('Client.id type:', typeof oauthClient?.id, oauthClient?.id);

  if (!oauthClient) { await client.end(); return; }

  const authCode = await db.query.oauth_client_codes.findFirst({
    where: {
      oauth_client_id: oauthClient.id,
      code: dto.code,
    },
    with: { user: true },
  });
  console.log('AuthCode:', authCode ? `id=${authCode.id}, user_id=${authCode.user_id}, expires_at=${authCode.expires_at}, used=${authCode.used}` : 'TOPILMADI');

  await client.end();
})().catch(e => { console.error(e); process.exit(1); });
