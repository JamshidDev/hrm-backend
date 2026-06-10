// Topic service. Laravel: Exam/TopicController.
// Laravel scopeFilter: where('user_id', $user->id) — user-specific scope.
// Resource shape: {id, name, organization:{id,name,group}, type:{id,name}, exams_count}.

import { Injectable } from '@nestjs/common';
import { and, count, eq, ilike, inArray, isNull, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { exams, organizations, topic_organizations, topics } from '@/db/schema';
import { nextId, pageOf } from '@/modules/exam/_shared/helpers';
import type {
  CreateTopicDto,
  QueryTopicDto,
  UpdateTopicDto,
} from '@/modules/exam/topics/dto/topic.dto';

// Laravel TopicTypeEnum::get(int) — exam.exam_types.{one|two|three|four}.
const TOPIC_TYPE_KEYS: Record<number, string> = {
  1: 'messages.exam.exam_types.one',
  2: 'messages.exam.exam_types.two',
  3: 'messages.exam.exam_types.three',
  4: 'messages.exam.exam_types.four',
};

@Injectable()
export class TopicService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
    private readonly i18n: I18nService,
  ) {}

  // Topic'larni paginatsiya bilan ro'yxatlash.
  // Laravel: filter($user) — where('user_id', $user->id), search — name LIKE,
  //          with(['organization']), withCount('exams'), paginate(per_page).
  async list(q: QueryTopicDto) {
    const { page, perPage, offset } = pageOf(q);
    const lang = this.ctx.lang;
    const userId = this.ctx.user_or_fail.id;

    // Laravel scopeSearch: when(request('name'), whereLike('name', $name)).
    // Lekin NestJS DTO `search` ishlatadi — ikkalasini ham qo'llaymiz.
    const nameFilter = q.search ?? (q as { name?: string }).name;

    const where = and(
      notDeleted(topics),
      eq(topics.user_id, userId),
      nameFilter ? ilike(topics.name, `%${nameFilter}%`) : undefined,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db.select().from(topics).where(where).limit(perPage).offset(offset),
      this.db.select({ total: count() }).from(topics).where(where),
    ]);

    // Batch-load organizations + exams_count (withCount('exams') parity).
    const orgIds = [
      ...new Set(
        rows
          .map((r) => r.organization_id)
          .filter((id): id is number => id != null),
      ),
    ];
    const topicIds = rows.map((r) => r.id);

    const [orgList, examsCountList] = await Promise.all([
      orgIds.length
        ? this.db
            .select({
              id: organizations.id,
              name: organizations.name,
              name_ru: organizations.name_ru,
              name_en: organizations.name_en,
              group: organizations.group,
            })
            .from(organizations)
            .where(inArray(organizations.id, orgIds))
        : [],
      topicIds.length
        ? (this.db
            .select({
              topic_id: exams.topic_id,
              cnt: count(),
            })
            .from(exams)
            .where(
              and(inArray(exams.topic_id, topicIds), isNull(exams.deleted_at)),
            )
            .groupBy(exams.topic_id) as unknown as Promise<
            Array<{ topic_id: number | null; cnt: number }>
          >)
        : (Promise.resolve([]) as Promise<
            Array<{ topic_id: number | null; cnt: number }>
          >),
    ]);

    const orgMap = new Map(orgList.map((o) => [o.id, o] as const));
    const examsCountMap = new Map<number, number>(
      examsCountList
        .filter((e) => e.topic_id != null)
        .map((e) => [e.topic_id as number, Number(e.cnt)]),
    );

    const localizedOrg = (o: {
      name: string | null;
      name_ru: string | null;
      name_en: string | null;
    }) =>
      lang === 'ru'
        ? (o.name_ru ?? o.name)
        : lang === 'en'
          ? (o.name_en ?? o.name)
          : o.name;

    const data = rows.map((r) => {
      const org =
        r.organization_id != null ? orgMap.get(r.organization_id) : null;
      const typeKey = TOPIC_TYPE_KEYS[r.type];
      const typeLabel = typeKey ? this.i18n.t(typeKey, { lang }) : '';
      return {
        id: r.id,
        name: r.name,
        organization: org
          ? {
              id: org.id,
              name: localizedOrg(org),
              group: org.group ?? false,
            }
          : null,
        type: {
          id: r.type,
          name: typeof typeLabel === 'string' ? typeLabel : '',
        },
        exams_count: examsCountMap.get(r.id) ?? 0,
      };
    });

    return { current_page: page, total: Number(total), data };
  }

  // Bitta topic'ni ko'rsatish. Laravel `findOrFail` ekvivalenti → 404 agar topilmasa.
  // Laravel: $topic->load('organizations') → TopicOrganizationResource.
  // Shape: {id, name, organization:{id,name,group}, type:{id,name},
  //         organizations:[{id,name,group}, ...]}.
  async show(id: number) {
    const lang = this.ctx.lang;
    const [row] = await this.db
      .select()
      .from(topics)
      .where(eq(topics.id, id))
      .limit(1);
    if (!row) throw new BusinessException(404, 'not_found');

    // Batch: tegishli organization + pivot orqali bog'langan organizations.
    const [orgRows, pivotRows] = await Promise.all([
      row.organization_id != null
        ? this.db
            .select({
              id: organizations.id,
              name: organizations.name,
              name_ru: organizations.name_ru,
              name_en: organizations.name_en,
              group: organizations.group,
            })
            .from(organizations)
            .where(eq(organizations.id, row.organization_id))
            .limit(1)
        : Promise.resolve(
            [] as Array<{
              id: number;
              name: string | null;
              name_ru: string | null;
              name_en: string | null;
              group: boolean | null;
            }>,
          ),
      this.db
        .select({
          org_id: organizations.id,
          name: organizations.name,
          name_ru: organizations.name_ru,
          name_en: organizations.name_en,
          group: organizations.group,
        })
        .from(topic_organizations)
        .innerJoin(
          organizations,
          and(
            eq(organizations.id, topic_organizations.organization_id),
            isNull(organizations.deleted_at),
          ),
        )
        .where(eq(topic_organizations.topic_id, id)),
    ]);

    const localized = (o: {
      name: string | null;
      name_ru: string | null;
      name_en: string | null;
    }) =>
      lang === 'ru'
        ? (o.name_ru ?? o.name)
        : lang === 'en'
          ? (o.name_en ?? o.name)
          : o.name;

    const org = orgRows[0];
    const typeKey = TOPIC_TYPE_KEYS[row.type];
    const typeLabel = typeKey ? this.i18n.t(typeKey, { lang }) : '';

    return {
      id: row.id,
      name: row.name,
      organization: org
        ? { id: org.id, name: localized(org), group: org.group ?? false }
        : null,
      type: {
        id: row.type,
        name: typeof typeLabel === 'string' ? typeLabel : '',
      },
      organizations: pivotRows.map((p) => ({
        id: p.org_id,
        name: localized(p),
        group: p.group ?? false,
      })),
    };
  }

  // Yangi topic yaratish. `user_id` joriy foydalanuvchidan olinadi.
  async create(dto: CreateTopicDto) {
    const id = await nextId(this.db, topics);
    await this.db.insert(topics).values({
      id,
      name: dto.name,
      type: dto.type ?? 1,
      organization_id: dto.organization_id ?? null,
      user_id: this.ctx.user_or_fail.id,
    });
    // Laravel: $topic->organizations()->sync($organizations) — topic_organizations.
    await this.syncTopicOrganizations(id, dto.organizations ?? []);
  }

  // Laravel BelongsToMany sync — pivot'ni berilgan id'lar bilan to'liq almashtiradi.
  private async syncTopicOrganizations(
    topicId: number,
    orgIds: number[],
  ): Promise<void> {
    await this.db
      .delete(topic_organizations)
      .where(eq(topic_organizations.topic_id, topicId));
    const ids = [...new Set(orgIds.filter((x) => Number.isInteger(x)))];
    if (ids.length) {
      const base = await nextId(this.db, topic_organizations);
      await this.db.insert(topic_organizations).values(
        ids.map((organization_id, i) => ({
          id: base + i,
          topic_id: topicId,
          organization_id,
        })),
      );
    }
  }

  // Mavjud topic'ni yangilash. Laravel: $topic->update($data) +
  // $topic->organizations()->sync($organizations).
  async update(id: number, dto: UpdateTopicDto) {
    const set: Record<string, unknown> = {
      name: dto.name,
      type: dto.type ?? 1,
      updated_at: sql`NOW()`,
    };
    if (dto.organization_id !== undefined) {
      set.organization_id = dto.organization_id;
    }
    await this.db.update(topics).set(set).where(eq(topics.id, id));
    // organizations yuborilgan bo'lsa pivot'ni sync qilamiz (Laravel required|array).
    if (dto.organizations !== undefined) {
      await this.syncTopicOrganizations(id, dto.organizations);
    }
  }

  // Topic'ni soft-delete qilish (deleted_at = NOW()).
  async remove(id: number) {
    await this.db
      .update(topics)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(topics.id, id));
  }

  // Laravel: filter/topics — PaginateResource bilan o'ralgan {id, name} ro'yxat.
  // search() + whereHas('hasOrganizations' where organization_id = user.org).
  async filter(q: QueryTopicDto) {
    const { page, perPage, offset } = pageOf(q);
    const nameFilter = q.search ?? (q as { name?: string }).name;
    const where = and(
      notDeleted(topics),
      nameFilter ? ilike(topics.name, `%${nameFilter}%`) : undefined,
    );
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({ id: topics.id, name: topics.name })
        .from(topics)
        .where(where)
        .orderBy(topics.id)
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(topics).where(where),
    ]);
    return { current_page: page, total: Number(total), data: rows };
  }
}
