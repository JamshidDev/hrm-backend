// Worker category service. Laravel: Economist/WorkerCategoryController.
// year/month bo'yicha xodimlar kategoriyalari hisoboti (jumladan reportByOrganizations).
// ESLATMA: worker_categories jadvalida `deleted_at` ustun yo'q — `delete()` hard-delete.

import { Injectable } from '@nestjs/common';
import { and, eq, sql, type SQL } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { OrgScopeService } from '@/common/database/org-scope.service';
import { RequestContext } from '@/common/context/request.context';
import { worker_categories, organizations } from '@/db/schema';
import type { PageQueryLike } from '@/modules/economist/_shared/helpers';
import { WorkerCategoryMapper } from '@/modules/economist/worker-categories/worker-category.mapper';

// O'zbek tilidagi oylar ro'yxati — list() index endpoint uchun.
// Laravel Helper::getMonth — kichik harf bilan (sentyabr/oktyabr — y bilan).
const MONTHS_UZ = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avgust',
  'sentyabr',
  'oktyabr',
  'noyabr',
  'dekabr',
];

// Faqat yangilanishi mumkin bo'lgan ustunlar (id, year, month, organization_id, audit'siz).
const UPDATABLE_FIELDS = [
  'external_worker_count',
  'external_salary_fund',
  'capital_society_worker_count',
  'capital_society_salary_fund',
  'capital_own_use_worker_count',
  'capital_own_use_salary_fund',
  'capital_foreign_company_worker_count',
  'capital_foreign_company_salary_fund',
  'construction_society_worker_count',
  'construction_society_salary_fund',
  'construction_own_use_worker_count',
  'construction_own_use_salary_fund',
  'construction_foreign_company_worker_count',
  'construction_foreign_company_salary_fund',
  'other_society_worker_count',
  'other_society_salary_fund',
  'other_own_use_worker_count',
  'other_own_use_salary_fund',
  'other_foreign_company_worker_count',
  'other_foreign_company_salary_fund',
  'temporary_contract_worker_count',
  'temporary_contract_salary_fund',
  'civil_contract_worker_count',
  'civil_contract_salary_fund',
  'freelancer_worker_count',
  'freelancer_salary_fund',
] as const;

// Service-darajadagi `body` shape — controller'dagi `CreateWorkerCategoryDto`
// va `UpdateWorkerCategoryDto` ikkalasi ham shu interface'ga mos.
// Faqat zarur tegishli field'lar typed; qolgan 26 kategoriya field'i optional
// numeric — service for-loop bilan UPDATABLE_FIELDS'dan o'qiydi.
interface WorkerCategoryDto {
  organization_id?: number;
  year?: number;
  month?: number;
  external_worker_count?: number;
  external_salary_fund?: number;
  capital_society_worker_count?: number;
  capital_society_salary_fund?: number;
  capital_own_use_worker_count?: number;
  capital_own_use_salary_fund?: number;
  capital_foreign_company_worker_count?: number;
  capital_foreign_company_salary_fund?: number;
  construction_society_worker_count?: number;
  construction_society_salary_fund?: number;
  construction_own_use_worker_count?: number;
  construction_own_use_salary_fund?: number;
  construction_foreign_company_worker_count?: number;
  construction_foreign_company_salary_fund?: number;
  other_society_worker_count?: number;
  other_society_salary_fund?: number;
  other_own_use_worker_count?: number;
  other_own_use_salary_fund?: number;
  other_foreign_company_worker_count?: number;
  other_foreign_company_salary_fund?: number;
  temporary_contract_worker_count?: number;
  temporary_contract_salary_fund?: number;
  civil_contract_worker_count?: number;
  civil_contract_salary_fund?: number;
  freelancer_worker_count?: number;
  freelancer_salary_fund?: number;
}

@Injectable()
export class WorkerCategoryService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly scope: OrgScopeService,
    private readonly ctx: RequestContext,
  ) {}

  /**
   * GET /api/v1/economist/worker-categories — yil bo'yicha 12 oylik ko'rinish.
   * Laravel: filter($user)->where(year)->get()->keyBy('month') → har oy uchun
   * bitta yozuv yoki null.
   */
  async list(
    q: PageQueryLike & {
      organization_id?: number | string;
      organizations?: string;
    },
  ) {
    const year =
      q.year !== undefined ? Number(q.year) : new Date().getFullYear();

    // Laravel: ->filter($user, $filters). MUHIM — WorkerCategoryIndexRequest FAQAT
    // `year` validatsiya qiladi, shuning uchun $filters'da organizations/organization_id
    // YO'Q (strip qilinadi). filterByOrganizations faqat ROL childIds qo'llaydi.
    // Demak org-scope rol asosida — query param organization_id E'TIBORGA OLINMAYDI.
    const inScope = await this.scope.whereOrg(
      worker_categories.organization_id,
      {},
    );
    const conds: SQL[] = [eq(worker_categories.year, year)];
    if (inScope) conds.push(inScope);

    // Laravel `get()` orderBy YO'Q → PG seq-scan = fizik (heap/ctid) tartib;
    // keyBy('month') dublikat oylarda OXIRGISINI (= eng katta ctid) saqlaydi.
    // Shuni `ORDER BY ctid` (fizik tartib) + last bilan AYNAN takrorlaymiz
    // (id tartibi MOS EMAS — heap order id'dan farq qiladi).
    const rows = await this.db
      .select()
      .from(worker_categories)
      .where(and(...conds))
      .orderBy(sql`ctid`);

    // keyBy('month') — oxirgi (eng katta ctid) yozuv qoladi.
    const byMonth = new Map<number, (typeof rows)[0]>();
    for (const r of rows) byMonth.set(r.month, r);

    // 12 ta yozuvni qaytarish — Laravel: WorkerCategoryResource yoki null.
    return Array.from({ length: 12 }, (_, i) => {
      const row = byMonth.get(i + 1);
      return {
        month: MONTHS_UZ[i],
        data: row ? WorkerCategoryMapper.toResource(row) : null,
      };
    });
  }

  async show(id: number) {
    const [row] = await this.db
      .select()
      .from(worker_categories)
      .where(eq(worker_categories.id, id))
      .limit(1);
    if (!row) throw new BusinessException(404, 'not_found');
    return row;
  }

  /**
   * POST /api/v1/economist/worker-categories — upsert.
   * Laravel: avval (org, year, month) bo'yicha mavjudni o'chiradi, keyin yangi yaratadi.
   * Foydalanuvchi user.organization_id'sini ishlatadi (biz body'dan olamiz, RequestContext yo'q).
   */
  async create(body: WorkerCategoryDto) {
    // Laravel: 'organization_id' => $user->organization_id (payload'dan EMAS).
    const orgId = Number(this.ctx.user?.organization_id ?? 0);
    const year = Number(body.year);
    const month = Number(body.month);

    // Avval mavjudni o'chiramiz (Laravel `delete` — hard delete)
    await this.db
      .delete(worker_categories)
      .where(
        and(
          eq(worker_categories.organization_id, orgId),
          eq(worker_categories.year, year),
          eq(worker_categories.month, month),
        ),
      );

    // Yangi yozuv. Laravel normalizePayload: stringdan bo'sh joy olib tashlanadi,
    // null → 0. Payload'da bor field'lar (null bo'lsa ham 0) insert qilinadi.
    const insertData: Record<string, unknown> = {
      organization_id: orgId,
      year,
      month,
      created_at: sql`NOW()`,
      updated_at: sql`NOW()`,
    };
    for (const f of UPDATABLE_FIELDS) {
      const v = (body as Record<string, number | undefined>)[f];
      if (v !== undefined) {
        insertData[f] = Number(v) || 0; // null/NaN → 0 (Laravel `?? 0`)
      }
    }

    const [row] = await this.db
      .insert(worker_categories)
      .values(insertData as never)
      .returning();
    return row;
  }

  async update(id: number, body: Partial<WorkerCategoryDto>) {
    const updateData: Record<string, unknown> = { updated_at: sql`NOW()` };
    for (const f of UPDATABLE_FIELDS) {
      const v = (body as Record<string, number | undefined>)[f];
      if (v !== undefined && v !== null) {
        updateData[f] = Number(v) || 0;
      }
    }
    const [row] = await this.db
      .update(worker_categories)
      .set(updateData as never)
      .where(eq(worker_categories.id, id))
      .returning();
    if (!row) throw new BusinessException(404, 'not_found');
    return row;
  }

  // Laravel jadvalda deleted_at yo'q — hard-delete.
  async remove(id: number) {
    await this.db.delete(worker_categories).where(eq(worker_categories.id, id));
  }

  /**
   * GET /api/v1/economist/worker-category-organizations — tashkilotlar daraxti +
   * har bir tugunda shu (year, month) bo'yicha worker_category yozuvi.
   *
   * Laravel: barcha organizations + worker_categories'ni xotiraga oladi, keyin
   * `parent_id` bo'yicha rekursiv tree quradi.
   */
  async reportByOrganizations(q: {
    year?: number | string;
    month?: number | string;
  }) {
    const year =
      q?.year !== undefined ? Number(q.year) : new Date().getFullYear();
    const month =
      q?.month !== undefined ? Number(q.month) : new Date().getMonth() + 1;

    // 1. Barcha organizationlarni xotiraga olamiz (parent_id bilan)
    const orgRows = await this.db
      .select({
        id: organizations.id,
        name: organizations.name,
        parent_id: organizations.parent_id,
      })
      .from(organizations)
      .where(notDeleted(organizations));

    // 2. Shu yil/oy uchun worker_categories — Laravel `filter($user)` org-scope
    //    (rol childIds; reportByOrganizations request faqat year/month validatsiya
    //    qiladi). keyBy('organization_id') — PG fizik (ctid) tartibida OXIRGISI.
    const inScope = await this.scope.whereOrg(
      worker_categories.organization_id,
      {},
    );
    const categoryRows = await this.db
      .select()
      .from(worker_categories)
      .where(
        and(
          eq(worker_categories.year, year),
          eq(worker_categories.month, month),
          inScope,
        ),
      )
      .orderBy(sql`ctid`);
    const catMap = new Map<number, (typeof categoryRows)[0]>();
    for (const c of categoryRows) {
      if (c.organization_id) catMap.set(c.organization_id, c);
    }

    // 3. parent_id bo'yicha guruhlash
    const childrenMap = new Map<number | null, typeof orgRows>();
    for (const o of orgRows) {
      const parent = o.parent_id ?? null;
      if (!childrenMap.has(parent)) childrenMap.set(parent, []);
      childrenMap.get(parent)!.push(o);
    }

    // 4. Rekursiv tree quramiz (root = parent_id IS NULL)
    const build = (parentId: number | null): OrgTreeNode[] =>
      (childrenMap.get(parentId) ?? []).map((o) => {
        const cat = catMap.get(o.id);
        return {
          id: o.id,
          name: o.name,
          // Laravel: WorkerCategoryResource (formatlangan) yoki null.
          data: cat ? WorkerCategoryMapper.toResource(cat) : null,
          children: build(o.id),
        };
      });

    return build(null);
  }
}

/**
 * Worker-category report tree node — `reportByOrganizations` qaytaradigan tip.
 * Eksport qilingani sababli controller'ning return type'ida ham ko'rinadi.
 */
export interface OrgTreeNode {
  id: number;
  name: string | null;
  data: Record<string, unknown> | null;
  children: OrgTreeNode[];
}
