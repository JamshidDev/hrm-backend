// WorkerUser service. Laravel: HR/WorkerUserService.
//
// Endpointlar: index, attachRole, detachRole, updatePassword, updateProfile.

import { Injectable } from '@nestjs/common';
import { and, count, eq, inArray, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  model_has_roles,
  organizations,
  roles,
  users as usersTable,
  worker_phones,
  worker_positions,
  workers,
} from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { OrgScopeService } from '@/common/database/org-scope.service';
import { buildWorkerSearchCond } from '@/modules/hr/_shared/worker-search.helper';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import * as bcrypt from 'bcrypt';
import {
  AttachWorkerRoleDto,
  DetachWorkerRoleDto,
  QueryWorkerUserDto,
  UpdatePasswordDto,
  UpdateProfileDto,
} from '@/modules/hr/worker-users/dto/worker-user.dto';

// Laravel App\Enums\RolesEnum — name → i18n label kaliti.
const ROLE_LABELS: Record<string, string> = {
  Worker: 'messages.roles.worker',
  HR: 'messages.roles.hr',
  Finance: 'messages.roles.finance',
  Jurist: 'messages.roles.jurist',
  Economist: 'messages.roles.economist',
  HrLeader: 'messages.roles.hr_leader',
  EconomistLeader: 'messages.roles.economist_leader',
  Hospital: 'messages.roles.hospital',
  TurnstileViewer: 'messages.roles.turnstile_viewer',
  TurnstileLeader: 'messages.roles.turnstile_leader',
};

@Injectable()
export class WorkerUserService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
    private readonly scope: OrgScopeService,
  ) {}

  // RolesEnum::tryFrom(name)?->label() — RoleOrganizationsResource name mantiqi.
  // Enum bo'lsa label; enum emas & id!==3 bo'lsa raw name; id===3 (Admin) bo'lsa null.
  private roleName(
    id: number,
    name: string | null,
    lang: string,
  ): string | null {
    const key = name ? ROLE_LABELS[name] : undefined;
    if (!key) {
      return id !== 3 ? name : null;
    }
    const v = this.i18n.t(key, { lang });
    return typeof v === 'string' ? v : null;
  }

  // Laravel OrganizationListResource — ru→name_ru, en→name_en, default→name.
  private orgName(
    o: {
      name: string | null;
      name_ru: string | null;
      name_en: string | null;
    },
    lang: string,
  ): string | null {
    if (lang === 'ru') return o.name_ru;
    if (lang === 'en') return o.name_en;
    return o.name;
  }

  /**
   * GET /api/v1/extra/users — Laravel WorkerUserController::index → UserWorkerRolesResource.
   * Org-scope: WorkerPosition::filter worker_ids + User::filter. search + role filter.
   */
  async findAll(filters: QueryWorkerUserDto) {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const offset = (page - 1) * perPage;
    const lang = this.ctx.lang;
    const orgFilters = {
      organizations: filters.organizations,
      organization_id: filters.organization_id,
    };

    // Org-scope: $workerIds = WorkerPosition::filter(...)->select('worker_id').
    const wpCond = await this.scope.whereOrg(
      worker_positions.organization_id,
      orgFilters,
    );
    const scopedWorkerIds = this.db
      .select({ worker_id: worker_positions.worker_id })
      .from(worker_positions)
      .where(and(notDeleted(worker_positions), wpCond));

    // User::filter — users.organization_id org-scope.
    const userCond = await this.scope.whereOrg(
      usersTable.organization_id,
      orgFilters,
    );

    // search — whereHas('worker', searchByFullName).
    const searchCond = filters.search
      ? buildWorkerSearchCond(filters.search)
      : undefined;

    // role — whereHas('roles', where name = role) → EXISTS.
    const roleCond = filters.role
      ? sql`EXISTS (SELECT 1 FROM ${model_has_roles} mhr JOIN ${roles} r ON r.id = mhr.role_id WHERE mhr.model_id = ${usersTable.id} AND r.name = ${filters.role})`
      : undefined;

    const where = and(
      notDeleted(usersTable),
      userCond,
      inArray(usersTable.worker_id, scopedWorkerIds),
      searchCond,
      roleCond,
    );

    const needWorkerJoin = !!searchCond;
    const listQuery = this.db
      .select({
        id: usersTable.id,
        uuid: usersTable.uuid,
        phone: usersTable.phone,
        organization_id: usersTable.organization_id,
        worker_id: workers.id,
        worker_uuid: workers.uuid,
        worker_last: workers.last_name,
        worker_first: workers.first_name,
        worker_middle: workers.middle_name,
        worker_birthday: workers.birthday,
        worker_photo: workers.photo,
        worker_pin: workers.pin,
        o_id: organizations.id,
        o_name: organizations.name,
        o_name_ru: organizations.name_ru,
        o_name_en: organizations.name_en,
        o_group: organizations.group,
      })
      .from(usersTable)
      .leftJoin(workers, eq(workers.id, usersTable.worker_id))
      .leftJoin(organizations, eq(organizations.id, usersTable.organization_id))
      .where(where)
      .limit(perPage)
      .offset(offset);

    const countBase = this.db.select({ total: count() }).from(usersTable);
    const countQuery = needWorkerJoin
      ? countBase
          .leftJoin(workers, eq(workers.id, usersTable.worker_id))
          .where(where)
      : countBase.where(where);

    const [rows, [{ total }]] = await Promise.all([listQuery, countQuery]);
    const userIds = rows.map((r) => r.id);
    const workerIds = rows
      .map((r) => r.worker_id)
      .filter((v): v is number => v != null);

    // phones (worker.phones), roles+organizations (getRoles) batch.
    const [phoneRows, mhrRows] = await Promise.all([
      workerIds.length
        ? this.db
            .select({
              worker_id: worker_phones.worker_id,
              phone: worker_phones.phone,
            })
            .from(worker_phones)
            .where(
              and(
                inArray(worker_phones.worker_id, workerIds),
                notDeleted(worker_phones),
              ),
            )
        : [],
      userIds.length
        ? this.db
            .select({
              user_id: model_has_roles.model_id,
              role_id: roles.id,
              role_name: roles.name,
              org_id: organizations.id,
              org_name: organizations.name,
              org_full_name: organizations.full_name,
            })
            .from(model_has_roles)
            .innerJoin(roles, eq(roles.id, model_has_roles.role_id))
            .innerJoin(
              organizations,
              eq(organizations.id, model_has_roles.organization_id),
            )
            .where(inArray(model_has_roles.model_id, userIds))
        : [],
    ]);

    const phonesByWorker = new Map<number, number[]>();
    for (const p of phoneRows) {
      const arr = phonesByWorker.get(p.worker_id) ?? [];
      if (p.phone != null) arr.push(p.phone);
      phonesByWorker.set(p.worker_id, arr);
    }
    const mhrByUser = new Map<number, typeof mhrRows>();
    for (const m of mhrRows) {
      const arr = mhrByUser.get(m.user_id) ?? [];
      arr.push(m);
      mhrByUser.set(m.user_id, arr);
    }

    return {
      current_page: page,
      total: Number(total),
      data: await Promise.all(
        rows.map(async (r) => ({
          id: r.id,
          uuid: r.uuid,
          phone: r.phone,
          phones: r.worker_id ? (phonesByWorker.get(r.worker_id) ?? []) : [],
          worker: r.worker_id
            ? {
                id: r.worker_id,
                uuid: r.worker_uuid,
                photo: await this.minio.fileUrl(r.worker_photo),
                last_name: r.worker_last,
                first_name: r.worker_first,
                middle_name: r.worker_middle,
                birthday: r.worker_birthday,
                pin: r.worker_pin,
              }
            : null,
          current_organization: r.o_id
            ? {
                id: r.o_id,
                name: this.orgName(
                  {
                    name: r.o_name,
                    name_ru: r.o_name_ru,
                    name_en: r.o_name_en,
                  },
                  lang,
                ),
                group: r.o_group,
              }
            : null,
          roles: this.buildRoles(
            mhrByUser.get(r.id) ?? [],
            r.organization_id,
            lang,
          ),
        })),
      ),
    };
  }

  // Laravel UserHelper::getRoles — (org, role) juftlarini role_id bo'yicha guruhlash.
  private buildRoles(
    mhr: {
      role_id: number;
      role_name: string | null;
      org_id: number;
      org_name: string | null;
      org_full_name: string | null;
    }[],
    currentOrgId: number | null,
    lang: string,
  ) {
    const grouped = new Map<
      number,
      {
        id: number;
        name: string | null;
        organizations: {
          id: number;
          name: string | null;
          full_name: string | null;
          current: boolean;
        }[];
      }
    >();
    for (const m of mhr) {
      let entry = grouped.get(m.role_id);
      if (!entry) {
        entry = {
          id: m.role_id,
          name: this.roleName(m.role_id, m.role_name, lang),
          organizations: [],
        };
        grouped.set(m.role_id, entry);
      }
      entry.organizations.push({
        id: m.org_id,
        name: m.org_name,
        full_name: m.org_full_name,
        current: m.org_id === currentOrgId,
      });
    }
    return [...grouped.values()];
  }

  // POST /api/v1/hr/users/attach-role
  async attachRole(dto: AttachWorkerRoleDto): Promise<void> {
    const [user] = await this.db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.uuid, dto.uuid))
      .limit(1);
    if (!user) {
      throw new BusinessException(404, this.i18n.t('messages.user_not_found'));
    }

    let roleId: number | null = null;
    if (dto.role_id) {
      const [r] = await this.db
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.name, dto.role_id))
        .limit(1);
      if (r) roleId = r.id;
    }
    if (!roleId && dto.role) {
      const [r] = await this.db
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.name, dto.role))
        .limit(1);
      if (r) roleId = r.id;
    }
    if (!roleId) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }

    const [existing] = await this.db
      .select({ role_id: model_has_roles.role_id })
      .from(model_has_roles)
      .where(
        and(
          eq(model_has_roles.role_id, roleId),
          eq(model_has_roles.model_id, user.id),
          eq(model_has_roles.organization_id, dto.organization_id),
        ),
      )
      .limit(1);
    if (!existing) {
      await this.db.insert(model_has_roles).values({
        role_id: roleId,
        model_id: user.id,
        model_type: 'App\\Models\\User',
        organization_id: dto.organization_id,
      });
    }
  }

  // POST /api/v1/hr/users/detach-role
  async detachRole(dto: DetachWorkerRoleDto): Promise<void> {
    const [user] = await this.db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.uuid, dto.uuid))
      .limit(1);
    if (!user) {
      throw new BusinessException(404, this.i18n.t('messages.user_not_found'));
    }

    let roleId = dto.role_id;
    if (!roleId && dto.role) {
      const [r] = await this.db
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.name, dto.role))
        .limit(1);
      if (r) roleId = r.id;
    }

    const conds = [
      eq(model_has_roles.model_id, user.id),
      eq(model_has_roles.organization_id, dto.organization_id),
    ];
    if (roleId) conds.push(eq(model_has_roles.role_id, roleId));

    await this.db.delete(model_has_roles).where(and(...conds));
  }

  // POST /api/v1/hr/users/update-password
  async updatePassword(dto: UpdatePasswordDto): Promise<void> {
    const [user] = await this.db
      .select({ id: usersTable.id, pin: workers.pin })
      .from(usersTable)
      .leftJoin(workers, eq(workers.id, usersTable.worker_id))
      .where(eq(usersTable.uuid, dto.uuid))
      .limit(1);
    if (!user) {
      throw new BusinessException(404, this.i18n.t('messages.user_not_found'));
    }

    const password = dto.password ?? String(user.pin ?? '');
    const hashed = await bcrypt.hash(password, 10);
    await this.db
      .update(usersTable)
      .set({
        password: hashed,
        password_changed_at: sql`NOW()`,
      })
      .where(eq(usersTable.id, user.id));
  }

  // PUT /api/v1/hr/users/update
  async updateProfile(dto: UpdateProfileDto): Promise<void> {
    const [user] = await this.db
      .select({ id: usersTable.id, worker_id: usersTable.worker_id })
      .from(usersTable)
      .where(eq(usersTable.uuid, dto.uuid))
      .limit(1);
    if (!user) {
      throw new BusinessException(404, this.i18n.t('messages.user_not_found'));
    }

    // Update user.phone (Laravel: u->phone = user_phone).
    await this.db
      .update(usersTable)
      .set({ phone: Number(dto.user_phone) })
      .where(eq(usersTable.id, user.id));

    // Sync worker_phones (forceDelete + re-insert).
    if (user.worker_id) {
      await this.db
        .delete(worker_phones)
        .where(eq(worker_phones.worker_id, user.worker_id));
      const validPhones = dto.phones.filter((p) => p.length === 9);
      if (validPhones.length > 0) {
        await this.db.insert(worker_phones).values(
          validPhones.map((p) => ({
            worker_id: user.worker_id!,
            phone: Number(p),
          })),
        );
      }
    }
  }
}
