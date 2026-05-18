// WorkerUser service. Laravel: HR/WorkerUserService.
//
// Endpointlar: index, attachRole, detachRole, updatePassword, updateProfile.

import { Injectable } from '@nestjs/common';
import { and, count, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  model_has_roles,
  organizations,
  roles,
  users as usersTable,
  worker_phones,
  workers,
} from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
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

@Injectable()
export class WorkerUserService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
  ) {}

  // GET /api/v1/hr/users
  async findAll(filters: QueryWorkerUserDto) {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const offset = (page - 1) * perPage;

    const searchCond = filters.search
      ? or(
          ilike(workers.last_name, `%${filters.search}%`),
          ilike(workers.first_name, `%${filters.search}%`),
          ilike(workers.middle_name, `%${filters.search}%`),
        )
      : undefined;

    const where = and(
      notDeleted(usersTable),
      filters.organization_id
        ? eq(usersTable.organization_id, filters.organization_id)
        : undefined,
      searchCond,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: usersTable.id,
          uuid: usersTable.uuid,
          phone: usersTable.phone,
          organization_id: usersTable.organization_id,
          worker_id: workers.id,
          worker_last: workers.last_name,
          worker_first: workers.first_name,
          worker_middle: workers.middle_name,
          worker_photo: workers.photo,
        })
        .from(usersTable)
        .leftJoin(workers, eq(workers.id, usersTable.worker_id))
        .where(where)
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(usersTable)
        .leftJoin(workers, eq(workers.id, usersTable.worker_id))
        .where(where),
    ]);

    // Batch load roles per user.
    const userIds = rows.map((r) => r.id);
    const roleRows = userIds.length
      ? await this.db
          .select({
            user_id: model_has_roles.model_id,
            organization_id: model_has_roles.organization_id,
            role_id: roles.id,
            role_name: roles.name,
          })
          .from(model_has_roles)
          .innerJoin(roles, eq(roles.id, model_has_roles.role_id))
          .where(inArray(model_has_roles.model_id, userIds))
      : [];

    const rolesByUser = new Map<number, typeof roleRows>();
    for (const r of roleRows) {
      const arr = rolesByUser.get(r.user_id) ?? [];
      arr.push(r);
      rolesByUser.set(r.user_id, arr);
    }

    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: await Promise.all(
        rows.map(async (r) => ({
          id: r.id,
          uuid: r.uuid,
          phone: r.phone,
          organization_id: r.organization_id,
          worker: r.worker_id
            ? {
                id: r.worker_id,
                last_name: r.worker_last,
                first_name: r.worker_first,
                middle_name: r.worker_middle,
                photo: await this.minio.fileUrl(r.worker_photo),
              }
            : null,
          roles: (rolesByUser.get(r.id) ?? []).map((rr) => ({
            id: rr.role_id,
            name: rr.role_name,
            organization_id: rr.organization_id,
          })),
        })),
      ),
    };
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
