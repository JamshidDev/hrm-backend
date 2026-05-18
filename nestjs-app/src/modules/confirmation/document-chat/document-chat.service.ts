// Document chat service. Laravel: Confirmation/DocumentChatController.

import { Injectable } from '@nestjs/common';
import { and, asc, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  document_chats,
  users as usersTable,
  workers,
} from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import {
  ChatMessagesQueryDto,
  ChatQueryDto,
  ReadMessageDto,
  SendMessageDto,
} from '@/modules/confirmation/document-chat/dto/document-chat.dto';

@Injectable()
export class DocumentChatService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
  ) {}

  // GET /api/v1/document/users — chat participants.
  async users(filters: ChatQueryDto) {
    const userId = this.ctx.user_or_fail.id;
    const where = and(
      notDeleted(document_chats),
      or(
        eq(document_chats.sender_id, userId),
        eq(document_chats.recipient_id, userId),
      ),
      filters.model_type
        ? eq(document_chats.model_type, filters.model_type)
        : undefined,
      filters.model_id != null
        ? eq(document_chats.model_id, filters.model_id)
        : undefined,
    );

    const rows = await this.db
      .selectDistinct({
        sender_id: document_chats.sender_id,
        recipient_id: document_chats.recipient_id,
      })
      .from(document_chats)
      .where(where);

    const otherUserIds = [
      ...new Set(
        rows
          .map((r) => (r.sender_id === userId ? r.recipient_id : r.sender_id))
          .filter((id): id is number => id != null),
      ),
    ];

    if (otherUserIds.length === 0) return [];

    const userRows = await this.db
      .select({
        id: usersTable.id,
        phone: usersTable.phone,
        worker_id: workers.id,
        worker_last: workers.last_name,
        worker_first: workers.first_name,
        worker_middle: workers.middle_name,
        worker_photo: workers.photo,
      })
      .from(usersTable)
      .leftJoin(workers, eq(workers.id, usersTable.worker_id))
      .where(inArray(usersTable.id, otherUserIds));

    return Promise.all(
      userRows.map(async (u) => ({
        id: u.id,
        phone: u.phone,
        worker: u.worker_id
          ? {
              id: u.worker_id,
              last_name: u.worker_last,
              first_name: u.worker_first,
              middle_name: u.worker_middle,
              photo: await this.minio.fileUrl(u.worker_photo),
            }
          : null,
      })),
    );
  }

  // GET /api/v1/document/messages
  async messages(filters: ChatMessagesQueryDto) {
    const userId = this.ctx.user_or_fail.id;

    const where = and(
      notDeleted(document_chats),
      eq(document_chats.model_type, filters.model_type),
      eq(document_chats.model_id, filters.model_id),
      or(
        and(
          eq(document_chats.sender_id, userId),
          filters.recipient_id != null
            ? eq(document_chats.recipient_id, filters.recipient_id)
            : undefined,
        ),
        and(
          eq(document_chats.recipient_id, userId),
          filters.recipient_id != null
            ? eq(document_chats.sender_id, filters.recipient_id)
            : undefined,
        ),
      ),
    );

    return this.db
      .select()
      .from(document_chats)
      .where(where)
      .orderBy(asc(document_chats.id));
  }

  // POST /api/v1/document/messages
  async sendMessage(dto: SendMessageDto): Promise<void> {
    const userId = this.ctx.user_or_fail.id;
    await this.db.insert(document_chats).values({
      model_id: dto.model_id,
      model_type: dto.model_type,
      sender_id: userId,
      recipient_id: dto.recipient_id,
      message: dto.message,
    });
  }

  // DELETE /api/v1/document/messages/{id}
  async deleteMessage(id: number): Promise<void> {
    const userId = this.ctx.user_or_fail.id;
    const [msg] = await this.db
      .select({ id: document_chats.id, sender_id: document_chats.sender_id })
      .from(document_chats)
      .where(and(eq(document_chats.id, id), notDeleted(document_chats)))
      .limit(1);
    if (!msg) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    if (msg.sender_id !== userId) {
      throw new BusinessException(403, this.i18n.t('messages.permission_denied'));
    }
    await this.db
      .update(document_chats)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(document_chats.id, id));
  }

  // POST /api/v1/document/messages/read
  async readMessages(dto: ReadMessageDto): Promise<void> {
    if (!dto.message_ids || dto.message_ids.length === 0) return;
    const userId = this.ctx.user_or_fail.id;
    await this.db
      .update(document_chats)
      .set({ read_at: sql`NOW()` })
      .where(
        and(
          inArray(document_chats.id, dto.message_ids),
          eq(document_chats.recipient_id, userId),
          isNull(document_chats.read_at),
        ),
      );
  }
}
