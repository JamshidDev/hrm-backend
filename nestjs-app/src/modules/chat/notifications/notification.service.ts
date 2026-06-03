// Notification service. Laravel: NotificationController.
//
// Laravel `notifications` jadvali — DatabaseNotification (built-in).
// `notifiable_type = 'App\Models\User'`, `notifiable_id = user.id`.
// `data` — JSON: {title, message, type, alert, action, sender_id, ...}.

import { Injectable } from '@nestjs/common';
import { count, desc, eq, inArray, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import { notifications, users, workers } from '@/db/schema';
import type {
  NotificationListQueryDto,
  SendBatchNotificationDto,
  SendNotificationDto,
} from '@/modules/chat/notifications/dto/notification.dto';

/**
 * Notification turlari — Laravel `NotificationTypeEnum`.
 * Frontend dropdown uchun.
 */
const NOTIFICATION_TYPES = [
  { id: 'info', name: 'Information' },
  { id: 'success', name: 'Success' },
  { id: 'warning', name: 'Warning' },
  { id: 'error', name: 'Error' },
];

const NOTIFIABLE_TYPE = 'App\\Models\\User';
const NOTIFICATION_LARAVEL_CLASS =
  'App\\Notifications\\UserMessageNotification';

@Injectable()
export class ChatNotificationService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
  ) {}

  /** GET /notifications/enums */
  enums() {
    return { notificationTypes: NOTIFICATION_TYPES };
  }

  /** GET /notifications — barcha notification'lar (admin uchun). */
  async list(q: NotificationListQueryDto) {
    const page = Number(q?.page ?? 1);
    const perPage = Number(q?.per_page ?? 10);
    const offset = (page - 1) * perPage;

    // Laravel: DatabaseNotification::latest('created_at')->with(notifiable.worker).
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(notifications)
        .orderBy(desc(notifications.created_at))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(notifications),
    ]);

    // notifiable (User) + worker batch — UserWorkerResource uchun.
    const userIds = [
      ...new Set(
        rows
          .filter((r) => r.notifiable_type === NOTIFIABLE_TYPE)
          .map((r) => r.notifiable_id)
          .filter((id): id is number => id != null),
      ),
    ];
    const userRows = userIds.length
      ? await this.db
          .select({
            id: users.id,
            w_id: workers.id,
            w_photo: workers.photo,
            w_last: workers.last_name,
            w_first: workers.first_name,
            w_middle: workers.middle_name,
          })
          .from(users)
          .leftJoin(workers, eq(workers.id, users.worker_id))
          .where(inArray(users.id, userIds))
      : [];
    const userMap = new Map(userRows.map((u) => [u.id, u]));

    const data = await Promise.all(
      rows.map(async (r) => {
        // UserWorkerResource — {id, worker: WorkerMinimalResource}.
        const u =
          r.notifiable_type === NOTIFIABLE_TYPE
            ? userMap.get(r.notifiable_id)
            : undefined;
        const user = u
          ? {
              id: u.id,
              worker: u.w_id
                ? {
                    id: u.w_id,
                    photo: await this.minio.fileUrl(u.w_photo),
                    last_name: u.w_last,
                    first_name: u.w_first,
                    middle_name: u.w_middle,
                  }
                : null,
            }
          : null;
        return {
          id: r.id,
          user,
          data: r.data,
          read_at: r.read_at,
          created_at: this.toDateTimeString(r.created_at),
        };
      }),
    );

    return { current_page: page, total: Number(total), data };
  }

  // Carbon toDateTimeString() — "Y-m-d H:i:s".
  private toDateTimeString(v: string | null): string | null {
    if (!v) return null;
    const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/.exec(v);
    return m ? `${m[1]} ${m[2]}` : v;
  }

  /**
   * POST /notifications/send — bitta foydalanuvchiga yuborish.
   * Notifications jadvaliga yangi yozuv qo'shadi.
   */
  async send(dto: SendNotificationDto) {
    // Recipient mavjudligini tekshirish
    const [recipient] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, dto.userId))
      .limit(1);
    if (!recipient) throw new BusinessException(404, 'recipient_not_found');

    const senderId = this.ctx.user?.id ?? null;
    await this.db.insert(notifications).values({
      id: randomUUID(),
      type: NOTIFICATION_LARAVEL_CLASS,
      notifiable_type: NOTIFIABLE_TYPE,
      notifiable_id: dto.userId,
      data: this.buildPayload(dto, senderId),
      created_at: sql`NOW()`,
      updated_at: sql`NOW()`,
      sender_id: senderId,
    });
    return { success: true, sent_to: 1 };
  }

  /**
   * POST /notifications/send-batch — bir nechta foydalanuvchiga.
   * filter.all=true bo'lsa, unCheck'lardan tashqari hammaga.
   */
  async sendBatch(dto: SendBatchNotificationDto) {
    // Recipient'lar ro'yxatini aniqlash
    let recipientIds: number[];
    if (dto.filter.all) {
      // Hammaga, faqat unCheck'larni istisno qilib
      const excluded = new Set(dto.filter.unCheck ?? []);
      const allUsers = await this.db.select({ id: users.id }).from(users);
      recipientIds = allUsers
        .map((u) => u.id)
        .filter((id) => !excluded.has(id));
    } else {
      // Faqat userIds dagilar
      const userIds = dto.filter.userIds;
      const found = userIds.length
        ? await this.db
            .select({ id: users.id })
            .from(users)
            .where(inArray(users.id, userIds))
        : [];
      recipientIds = found.map((u) => u.id);
    }

    if (!recipientIds.length) {
      return { success: true, sent_to: 0 };
    }

    const senderId = this.ctx.user?.id ?? null;
    const payload = this.buildPayload(
      {
        title: dto.title,
        message: dto.message,
        type: dto.type,
        alert: dto.alert,
        action: dto.action,
      },
      senderId,
    );

    // Batch insert
    const rows = recipientIds.map((uid) => ({
      id: randomUUID(),
      type: NOTIFICATION_LARAVEL_CLASS,
      notifiable_type: NOTIFIABLE_TYPE,
      notifiable_id: uid,
      data: payload,
      created_at: sql`NOW()`,
      updated_at: sql`NOW()`,
      sender_id: senderId,
    }));

    // 500 chunk'larda batch insert (juda katta to'plamlar uchun)
    const CHUNK = 500;
    for (let i = 0; i < rows.length; i += CHUNK) {
      await this.db.insert(notifications).values(rows.slice(i, i + CHUNK));
    }

    return { success: true, sent_to: recipientIds.length };
  }

  /** Notification payload — Laravel `UserMessageNotification::toArray` parity. */
  private buildPayload(
    dto: Pick<
      SendNotificationDto,
      'title' | 'message' | 'type' | 'alert' | 'action'
    >,
    senderId: number | null,
  ) {
    // Laravel UserMessageNotification.data — {title, message, type, alert, action}.
    // sender_id alohida ustunda saqlanadi (data ichida emas).
    void senderId;
    return {
      title: dto.title,
      message: dto.message,
      type: dto.type,
      alert: dto.alert ?? 'info',
      action: dto.action ?? [],
    };
  }
}
