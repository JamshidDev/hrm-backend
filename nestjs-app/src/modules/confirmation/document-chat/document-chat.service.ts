// Document chat service. Laravel: Confirmation/DocumentChatController.
//
// Laravel request params: `model` (string) + `document_id` (int).
// Morph `document_chats.model_type` — Laravel FQCN saqlaydi.

import { Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, ne, or, sql, type SQL } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  command_confirmations,
  commands,
  contract_additional,
  contract_additional_confirmations,
  contract_confirmations,
  contracts,
  document_chats,
  time_sheets,
  timesheet_confirmations,
  users as usersTable,
  vacation_schedule_confirmations,
  vacation_schedule_years,
  worker_application_confirmations,
  worker_applications,
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

// Laravel ModelTypeEnum — model → {doc table, confirmation table, fk, morph FQCN}.
/* eslint-disable @typescript-eslint/no-explicit-any */
const MODEL_MAP: Record<
  string,
  { doc: any; conf: any; fk: string; fqcn: string }
> = {
  contracts: {
    doc: contracts,
    conf: contract_confirmations,
    fk: 'contract_id',
    fqcn: 'Modules\\HR\\Models\\Contract',
  },
  commands: {
    doc: commands,
    conf: command_confirmations,
    fk: 'command_id',
    fqcn: 'Modules\\HR\\Models\\Command',
  },
  'contract-additional': {
    doc: contract_additional,
    conf: contract_additional_confirmations,
    fk: 'contract_additional_id',
    fqcn: 'Modules\\HR\\Models\\ContractAdditional',
  },
  timesheet: {
    doc: time_sheets,
    conf: timesheet_confirmations,
    fk: 'time_sheet_id',
    fqcn: 'Modules\\TimeSheet\\Models\\TimeSheet',
  },
  'vacation-schedule': {
    doc: vacation_schedule_years,
    conf: vacation_schedule_confirmations,
    fk: 'vacation_schedule_year_id',
    fqcn: 'Modules\\HR\\Models\\VacationScheduleYear',
  },
  'worker-application': {
    doc: worker_applications,
    conf: worker_application_confirmations,
    fk: 'worker_application_id',
    fqcn: 'Modules\\HR\\Models\\WorkerApplication',
  },
};
/* eslint-enable @typescript-eslint/no-explicit-any */

@Injectable()
export class DocumentChatService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
  ) {}

  // GET /api/v1/document/users — potentsial chat ishtirokchilari.
  // Laravel getUsers: confirmation worker'lari + document yaratuvchisi + xabarlashganlar.
  async users(filters: ChatQueryDto) {
    const map = MODEL_MAP[filters.model];
    if (!map) {
      throw new BusinessException(400, this.i18n.t('messages.invalid_type'));
    }
    const userId = this.ctx.user_or_fail.id;

    // 1) Confirmation worker_id'lari (foreignKey = document_id).
    const confRows = await this.db
      .select({ worker_id: map.conf.worker_id })
      .from(map.conf)
      .where(eq(map.conf[map.fk], filters.document_id));
    const workerIds = [
      ...new Set(
        confRows
          .map((r: { worker_id: number | null }) => r.worker_id)
          .filter((x: number | null): x is number => x != null),
      ),
    ];

    // 2) Xabarlashgan user'lar (sender/recipient) — model_type=FQCN.
    const chatRows = await this.db
      .select({
        sender_id: document_chats.sender_id,
        recipient_id: document_chats.recipient_id,
      })
      .from(document_chats)
      .where(
        and(
          eq(document_chats.model_type, map.fqcn),
          eq(document_chats.model_id, filters.document_id),
        ),
      );
    const messagedUserIds = [
      ...new Set(chatRows.flatMap((r) => [r.sender_id, r.recipient_id])),
    ];

    // 3) Document yaratuvchisi.
    const [doc] = await this.db
      .select({ user_id: map.doc.user_id })
      .from(map.doc)
      .where(eq(map.doc.id, filters.document_id))
      .limit(1);
    const docUserId: number | null = doc?.user_id ?? null;

    // 4) User::whereNot(id, current)->where(worker_id IN workerIds OR id=docUser)
    //        ->orWhereIn(id, messagedUsers).
    const orParts: SQL[] = [];
    if (workerIds.length > 0) {
      orParts.push(inArray(usersTable.worker_id, workerIds));
    }
    if (docUserId != null) {
      orParts.push(eq(usersTable.id, docUserId));
    }
    if (messagedUserIds.length > 0) {
      orParts.push(inArray(usersTable.id, messagedUserIds));
    }
    if (orParts.length === 0) return [];

    const userRows = await this.db
      .select({
        id: usersTable.id,
        worker_id: workers.id,
        worker_photo: workers.photo,
        worker_last: workers.last_name,
        worker_first: workers.first_name,
        worker_middle: workers.middle_name,
      })
      .from(usersTable)
      .leftJoin(workers, eq(workers.id, usersTable.worker_id))
      .where(and(ne(usersTable.id, userId), or(...orParts)));

    // Laravel UserLittleResource: {id, worker: WorkerUserResource}.
    return Promise.all(
      userRows.map(async (u) => ({
        id: u.id,
        worker: u.worker_id
          ? {
              id: u.worker_id,
              photo: await this.minio.fileUrl(u.worker_photo),
              last_name: u.worker_last,
              first_name: u.worker_first,
              middle_name: u.worker_middle,
            }
          : null,
      })),
    );
  }

  // GET /api/v1/document/messages — Laravel getMessages (paginated).
  async messages(filters: ChatMessagesQueryDto) {
    const map = MODEL_MAP[filters.model];
    if (!map) {
      throw new BusinessException(400, this.i18n.t('messages.invalid_type'));
    }
    const userId = this.ctx.user_or_fail.id;
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const offset = (page - 1) * perPage;

    const where = and(
      eq(document_chats.model_type, map.fqcn),
      eq(document_chats.model_id, filters.document_id),
      or(
        eq(document_chats.sender_id, userId),
        eq(document_chats.recipient_id, userId),
      ),
      filters.user_id != null
        ? or(
            eq(document_chats.sender_id, filters.user_id),
            eq(document_chats.recipient_id, filters.user_id),
          )
        : undefined,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(document_chats)
        .where(where)
        .orderBy(desc(document_chats.id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: sql<number>`COUNT(*)::int` })
        .from(document_chats)
        .where(where),
    ]);

    // Batch-load sender/recipient users.
    const userIds = [
      ...new Set(rows.flatMap((r) => [r.sender_id, r.recipient_id])),
    ];
    const userMap = await this.bundleLittleUsers(userIds);

    return {
      current_page: page,
      total: Number(total),
      data: rows.map((r) => ({
        id: r.id,
        sender: userMap.get(r.sender_id) ?? null,
        recipient: userMap.get(r.recipient_id) ?? null,
        message: r.message,
        read_at: r.read_at,
        created_at: r.created_at,
      })),
    };
  }

  // POST /api/v1/document/messages
  async sendMessage(dto: SendMessageDto): Promise<void> {
    const map = MODEL_MAP[dto.model];
    if (!map) {
      throw new BusinessException(400, this.i18n.t('messages.invalid_type'));
    }
    const userId = this.ctx.user_or_fail.id;
    await this.db.insert(document_chats).values({
      model_id: dto.document_id,
      model_type: map.fqcn,
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
      throw new BusinessException(
        403,
        this.i18n.t('messages.permission_denied'),
      );
    }
    await this.db
      .update(document_chats)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(document_chats.id, id));
  }

  // POST /api/v1/document/messages/read
  async readMessages(dto: ReadMessageDto): Promise<void> {
    if (!dto.message_ids || dto.message_ids.length === 0) return;
    await this.db
      .update(document_chats)
      .set({ read_at: sql`NOW()` })
      .where(inArray(document_chats.id, dto.message_ids));
  }

  // Laravel UserLittleResource: {id, worker:{id,photo,last/first/middle_name}}.
  private async bundleLittleUsers(userIds: number[]) {
    const map = new Map<
      number,
      {
        id: number;
        worker: {
          id: number;
          photo: string | null;
          last_name: string | null;
          first_name: string | null;
          middle_name: string | null;
        } | null;
      }
    >();
    if (userIds.length === 0) return map;
    const rows = await this.db
      .select({
        id: usersTable.id,
        worker_id: workers.id,
        worker_photo: workers.photo,
        worker_last: workers.last_name,
        worker_first: workers.first_name,
        worker_middle: workers.middle_name,
      })
      .from(usersTable)
      .leftJoin(workers, eq(workers.id, usersTable.worker_id))
      .where(inArray(usersTable.id, userIds));
    for (const u of rows) {
      map.set(u.id, {
        id: u.id,
        worker: u.worker_id
          ? {
              id: u.worker_id,
              photo: await this.minio.fileUrl(u.worker_photo),
              last_name: u.worker_last,
              first_name: u.worker_first,
              middle_name: u.worker_middle,
            }
          : null,
      });
    }
    return map;
  }
}
