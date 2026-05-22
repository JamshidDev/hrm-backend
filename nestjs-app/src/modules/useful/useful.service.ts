// Useful service. Laravel: UsefulController.
// 2 endpoint: codex (static HTML), leaders (organization tree).
// Codex faylni file system'dan o'qiydi — stub bo'sh string qaytaramiz.

import { Injectable } from '@nestjs/common';
import { desc } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { organizations } from '@/db/schema';

@Injectable()
export class UsefulService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  /**
   * GET /useful/codex — static HTML (lang bo'yicha).
   * Stub: real implement uchun resources/documents/codex*.html fayllar kerak.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async codex(_lang?: string) {
    return { codex: '' };
  }

  /**
   * GET /useful/leaders — organization tree with leaders.
   * Stub: tree + leaders joinlari murakkab — hozirgi versiya faqat tepa darajadagi
   * organizationlarni qaytaradi.
   */
  async leaders() {
    return this.db
      .select({
        id: organizations.id,
        name: organizations.name,
      })
      .from(organizations)
      .where(notDeleted(organizations))
      .orderBy(desc(organizations.id));
  }
}
