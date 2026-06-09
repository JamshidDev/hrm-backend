// CommandConfirmationService — buyruq hujjati TO'LIQ tasdiqlanganda (barcha
// imzolar) bajariladigan biznes-logika (side-effect).
// Laravel: App\Services\CommandConfirmationService::confirmation +
// App\Services\WorkerPositionService.
//
// Manba: json/commands/{id}.json (`data`) — buyruq yaratilganda saqlangan.

import { Injectable, Logger } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  commands,
  contracts,
  contract_additional,
  department_positions,
  model_has_roles,
  organization_disciplinaries,
  organization_financial_assistances,
  organization_incentives,
  users,
  vacations,
  worker_business_trips,
  worker_positions,
} from '@/db/schema';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { BusinessException } from '@/common/exceptions/business.exception';
import { MinioService } from '@/shared/minio/minio.service';
import { I18nService } from 'nestjs-i18n';
import { randomUUID } from 'crypto';
import { sql } from 'drizzle-orm';

// PositionStatusEnum
const STATUS_ACTIVE = 2;
const STATUS_FINISHED = 3;
const CONTRACT_TYPE_ONE = 1;
// ContractCommandStatusEnum::NOT_MANDATORY — side-effect to'g'ridan-to'g'ri
// contract/ad-contract tasdig'ida qo'llanadi (buyruq orqali EMAS).
const COMMAND_STATUS_NOT_MANDATORY = 3;
// ContractAdditionalTypeEnum
const AD_TYPE_UPDATE_WORKER = 1; // ONE → updateWorker
const AD_TYPE_UPDATE_POSITION = 8; // EIGHT → updateWorkerPosition
const AD_TYPE_FINISH = [12, 13]; // TWELVE/THIRTEEN → finishedWorkerPosition
const WORKER_ROLE_ID = 2;
const USER_MODEL_TYPE = 'App\\Models\\User';

type CmdData = Record<string, unknown>;

@Injectable()
export class CommandConfirmationService {
  private readonly logger = new Logger(CommandConfirmationService.name);

  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly minio: MinioService,
  ) {}

  // Buyruq tasdiqlangach chaqiriladi (document finalize). Tur bo'yicha
  // side-effect. command.confirmation allaqachon SUCCESS qilingan bo'ladi.
  async applyConfirmation(commandId: number): Promise<void> {
    const [cmd] = await this.db
      .select({ id: commands.id, type: commands.type })
      .from(commands)
      .where(eq(commands.id, commandId))
      .limit(1);
    if (!cmd) return;

    const data = await this.readData(commandId);
    if (!data) {
      this.logger.warn(`json/commands/${commandId}.json topilmadi`);
      return;
    }

    const type = cmd.type;
    if (type >= 1 && type <= 7) {
      await this.createWorker(data);
    } else if (type === 25) {
      await this.updateWorker(data);
    } else if (type === 21) {
      await this.updateWorkerPosition(data);
    } else if (type >= 31 && type <= 39) {
      await this.finishedWorkerPosition(data);
      const contractId = this.num(data.contract_id);
      if (contractId) {
        await this.db
          .update(contracts)
          .set({
            contract_to_date: this.str(data.contract_to_date),
            status: STATUS_FINISHED,
            updated_at: sql`NOW()`,
          })
          .where(eq(contracts.id, contractId));
      }
    } else if ([61, 62, 71, 72, 73].includes(type)) {
      // Many-worker insert: safar(61/62)/mukofot(71)/jarima(72)/moddiy yordam(73).
      await this.applyManyWorkerInsert(commandId, type, data);
    } else if (
      [41, 55, 43, 44, 50, 45, 46, 47, 48, 49, 51, 52, 53, 54].includes(type)
    ) {
      // Ta'til (vacation) side-effectlari — Batch B.
      await this.applyVacationSideEffect(commandId, type, data);
    }
  }

  // Ta'til buyruqlari (Batch B) tasdiqlangach — Laravel CommandConfirmationService
  // vacation case'lari. type bo'yicha:
  //   41/55 → many-worker upsert; 45-54 → single updateOrCreate;
  //   43/50 → update {to, work_day}; 44 → update {to, rest_day, work_day}.
  // Vacation.type = command_type (Laravel parity), from/to/work_day request'dan.
  private async applyVacationSideEffect(
    commandId: number,
    type: number,
    data: CmdData,
  ): Promise<void> {
    // 43/50/44 — mavjud ta'tilni yangilash (xodimning oxirgi ta'tili).
    if ([43, 50, 44].includes(type)) {
      const wpId = this.num(data.worker_position_id);
      const workerId = this.num(data.worker_id);
      if (!workerId && !wpId) return;
      const [last] = await this.db
        .select({ id: vacations.id })
        .from(vacations)
        .where(
          workerId
            ? eq(vacations.worker_id, workerId)
            : eq(vacations.worker_position_id, wpId as number),
        )
        .orderBy(sql`${vacations.id} DESC`)
        .limit(1);
      if (!last) return;
      const set: Record<string, unknown> = {
        to: this.str(data.new_date ?? data.to),
        work_day: this.str(data.work_day),
        updated_at: sql`NOW()`,
      };
      if (type === 44) set.rest_day = this.num(data.rest_day);
      await this.db.update(vacations).set(set).where(eq(vacations.id, last.id));
      return;
    }

    // 41/55 — many-worker upsert; 45-54 — single updateOrCreate.
    const items: Array<Record<string, unknown>> =
      [41, 55].includes(type) && Array.isArray(data.worker_positions)
        ? (data.worker_positions as Array<Record<string, unknown>>)
        : [{ id: data.worker_position_id, ...data }];

    for (const item of items) {
      const wpId = this.num(item.id ?? data.worker_position_id);
      if (!wpId) continue;
      const [wp] = await this.db
        .select({
          id: worker_positions.id,
          worker_id: worker_positions.worker_id,
          organization_id: worker_positions.organization_id,
          contract_id: worker_positions.contract_id,
        })
        .from(worker_positions)
        .where(eq(worker_positions.id, wpId))
        .limit(1);
      if (!wp || !wp.worker_id) continue;

      const toDate = this.str(item.to ?? data.to);
      const record: Record<string, unknown> = {
        worker_id: wp.worker_id,
        worker_position_id: wp.id,
        organization_id: wp.organization_id,
        contract_id: wp.contract_id,
        command_id: commandId,
        type, // Laravel: vacation.type = command_type
        from: this.str(item.from ?? data.from),
        to: toDate,
        work_day: this.str(item.work_day ?? data.work_day),
        period_from: this.str(item.period_from ?? data.period_from),
        period_to: this.str(item.period_to ?? data.period_to),
        all_day: this.num(item.all_day ?? data.all_day),
        rest_day: this.num(item.rest_day ?? data.rest_day),
      };

      // updateOrCreate / upsert kaliti: (worker_id, type, to).
      const [existing] = await this.db
        .select({ id: vacations.id })
        .from(vacations)
        .where(
          and(
            eq(vacations.worker_id, wp.worker_id),
            eq(vacations.type, type),
            toDate ? eq(vacations.to, toDate) : sql`${vacations.to} IS NULL`,
          ),
        )
        .limit(1);
      if (existing) {
        await this.db
          .update(vacations)
          .set({ ...record, updated_at: sql`NOW()` })
          .where(eq(vacations.id, existing.id));
      } else {
        await this.db.insert(vacations).values({
          ...record,
          created_at: sql`NOW()`,
          updated_at: sql`NOW()`,
        } as never);
      }
    }
  }

  // Many-worker buyruqlar (61/62 safar, 71 mukofot, 72 jarima, 73 moddiy yordam)
  // tasdiqlangach — Laravel ManyWorkerCommandTypeHandler. data.worker_positions
  // (har xodim uchun) bo'yicha har bir target jadvalga yozuv (bulk insert).
  private async applyManyWorkerInsert(
    commandId: number,
    type: number,
    data: CmdData,
  ): Promise<void> {
    const [cmd] = await this.db
      .select({
        command_date: commands.command_date,
        organization_id: commands.organization_id,
      })
      .from(commands)
      .where(eq(commands.id, commandId))
      .limit(1);
    const date = this.str(cmd?.command_date) ?? this.str(data.command_date);

    const items = Array.isArray(data.worker_positions)
      ? (data.worker_positions as Array<Record<string, unknown>>)
      : [];
    if (!items.length) return;

    // Har worker_position uchun worker_id + organization_id (DB'dan).
    const wpIds = items
      .map((i) => this.num(i.id))
      .filter((x): x is number => !!x);
    if (!wpIds.length) return;
    const wpRows = await this.db
      .select({
        id: worker_positions.id,
        worker_id: worker_positions.worker_id,
        organization_id: worker_positions.organization_id,
      })
      .from(worker_positions)
      .where(inArray(worker_positions.id, wpIds));
    const wpMap = new Map(wpRows.map((w) => [w.id, w]));

    type Rec = Record<string, unknown>;
    const rows: Rec[] = [];
    for (const item of items) {
      const wpId = this.num(item.id);
      const wp = wpId ? wpMap.get(wpId) : undefined;
      if (!wp || !wp.worker_id) continue;
      const base = {
        worker_id: wp.worker_id,
        worker_position_id: wp.id,
        organization_id: wp.organization_id,
        date,
        created_at: sql`NOW()`,
        updated_at: sql`NOW()`,
      };
      if (type === 71) {
        rows.push({
          ...base,
          reason: this.str(item.reason),
          gift_type: this.num(item.gift_type ?? item.gift) ?? 0,
        });
      } else if (type === 72) {
        rows.push({
          ...base,
          reason: this.str(item.reason),
          fine_type: this.num(item.fine_type ?? item.fine) ?? 0,
        });
      } else if (type === 73) {
        const amount = Number(item.amount) || 0;
        const amountType = this.num(item.type) ?? 1;
        const amountText =
          amountType === 1
            ? `mehnatga haq to'lash eng kam miqdorining ${item.amount} barobari ko'rinishida `
            : `uzluksiz ish stajiga bog'liq ravishda lavozim maoshinining ${item.amount}% miqdorida `;
        rows.push({
          ...base,
          reason: this.str(item.reason),
          amount_text: amountText,
          type: amountType,
          amount,
        });
      } else if (type === 61 || type === 62) {
        rows.push({
          ...base,
          to_organization: this.str(item.to_organization),
          type,
          from: this.str(item.from),
          to: this.str(item.to),
        });
      }
    }
    if (!rows.length) return;

    const table =
      type === 71
        ? organization_incentives
        : type === 72
          ? organization_disciplinaries
          : type === 73
            ? organization_financial_assistances
            : worker_business_trips;
    await this.db.insert(table).values(rows as never);
  }

  // CONTRACTS tasdiqlangach — Laravel ContractConfirmationService::confirmation.
  // FAQAT command_status=NOT_MANDATORY bo'lsa (aks holda buyruq orqali bo'ladi).
  //   json/contracts/{id}.json → data → createWorker + status=ACTIVE.
  async applyContractConfirmation(contractId: number): Promise<void> {
    const [c] = await this.db
      .select({ id: contracts.id, command_status: contracts.command_status })
      .from(contracts)
      .where(eq(contracts.id, contractId))
      .limit(1);
    if (!c || c.command_status !== COMMAND_STATUS_NOT_MANDATORY) return;

    const data = await this.readJsonData(`json/contracts/${contractId}.json`);
    if (!data) {
      this.logger.warn(`json/contracts/${contractId}.json topilmadi`);
      return;
    }
    data.rank = data.rank ?? 1;
    data.rate = data.rate ?? 1;
    data.group = data.group ?? 0;

    await this.createWorker(data);
    await this.db
      .update(contracts)
      .set({ status: STATUS_ACTIVE, updated_at: sql`NOW()` })
      .where(eq(contracts.id, contractId));
  }

  // CONTRACT_ADDITIONAL tasdiqlangach — Laravel ContractConfirmationService::
  // updateContract. FAQAT command_status=NOT_MANDATORY. Tur bo'yicha:
  //   1 → updateWorker, 8 → updateWorkerPosition, 12/13 → finishedWorkerPosition
  //   (+ parent contract status=FINISHED, contract_to_date).
  async applyContractAdditionalConfirmation(adId: number): Promise<void> {
    const [ad] = await this.db
      .select({
        id: contract_additional.id,
        type: contract_additional.type,
        command_status: contract_additional.command_status,
        contract_id: contract_additional.contract_id,
      })
      .from(contract_additional)
      .where(eq(contract_additional.id, adId))
      .limit(1);
    if (!ad || ad.command_status !== COMMAND_STATUS_NOT_MANDATORY) return;

    const data = await this.readJsonData(
      `json/contract-additional/${adId}.json`,
    );
    if (!data) {
      this.logger.warn(`json/contract-additional/${adId}.json topilmadi`);
      return;
    }

    const type = ad.type;
    if (type === AD_TYPE_UPDATE_POSITION) {
      await this.updateWorkerPosition(data);
    } else if (type === AD_TYPE_UPDATE_WORKER) {
      await this.updateWorker(data);
    } else if (AD_TYPE_FINISH.includes(type)) {
      await this.finishedWorkerPosition(data);
      const contractId = this.num(ad.contract_id);
      if (contractId) {
        await this.db
          .update(contracts)
          .set({
            status: STATUS_FINISHED,
            contract_to_date: this.str(data.contract_to_date),
            updated_at: sql`NOW()`,
          })
          .where(eq(contracts.id, contractId));
      }
    }
  }

  private async readJsonData(key: string): Promise<CmdData | null> {
    try {
      const buf = await this.minio.getObject(key);
      const parsed = JSON.parse(buf.toString('utf-8')) as { data?: CmdData };
      return parsed.data ?? null;
    } catch {
      return null;
    }
  }

  // ---- Worker position side-effectlar (Laravel WorkerPositionService) ----

  // Laravel finishedWorkerPosition — status=FINISHED, to=contract_to_date|now.
  private async finishedWorkerPosition(data: CmdData): Promise<void> {
    const wpId = this.num(data.worker_position_id);
    if (!wpId) return;
    await this.db
      .update(worker_positions)
      .set({
        status: STATUS_FINISHED,
        to: this.str(data.contract_to_date) ?? this.today(),
        updated_at: sql`NOW()`,
      })
      .where(eq(worker_positions.id, wpId));
  }

  // Laravel updateWorker — group/rank/rate/salary yangilash (tur 25).
  private async updateWorker(data: CmdData): Promise<void> {
    const wpId = this.num(data.worker_position_id);
    if (!wpId) {
      throw new BusinessException(
        404,
        this.i18n.t('messages.worker_position_not_found'),
      );
    }
    await this.db
      .update(worker_positions)
      .set({
        group: this.num(data.group) ?? 0,
        rank: this.str(data.rank) ?? '4',
        rate: this.num(data.rate) ?? 100,
        salary: this.num(data.salary) ?? null,
        updated_at: sql`NOW()`,
      })
      .where(eq(worker_positions.id, wpId));
  }

  // Laravel updateWorkerPosition (tur 21) — eski position FINISHED + yangi create.
  private async updateWorkerPosition(data: CmdData): Promise<void> {
    const wpId = this.num(data.worker_position_id);
    if (!wpId) {
      throw new BusinessException(
        404,
        this.i18n.t('messages.worker_position_not_found'),
      );
    }
    const [wp] = await this.db
      .select({ type: worker_positions.type })
      .from(worker_positions)
      .where(eq(worker_positions.id, wpId))
      .limit(1);
    await this.db
      .update(worker_positions)
      .set({
        status: STATUS_FINISHED,
        to: this.str(data.position_date) ?? this.today(),
        updated_at: sql`NOW()`,
      })
      .where(eq(worker_positions.id, wpId));
    // type 21 → createWorker'da 1 ga aylanadi.
    await this.createWorker({ ...data, type: wp?.type ?? 1 });
  }

  // Laravel createWorker (tur 1–7, 21) — worker_position yaratish/yangilash +
  // contract ACTIVE + user org/Worker rol.
  private async createWorker(data: CmdData): Promise<void> {
    const deptPosId = this.num(data.department_position_id);
    if (!deptPosId) {
      throw new BusinessException(
        404,
        this.i18n.t('messages.department_position_not_found'),
      );
    }
    const [dp] = await this.db
      .select({
        department_id: department_positions.department_id,
        position_id: department_positions.position_id,
        organization_id: department_positions.organization_id,
      })
      .from(department_positions)
      .where(eq(department_positions.id, deptPosId))
      .limit(1);
    if (!dp || dp.organization_id == null) {
      throw new BusinessException(
        404,
        this.i18n.t('messages.department_position_not_found'),
      );
    }
    const orgId = dp.organization_id;

    let type = this.num(data.type) ?? CONTRACT_TYPE_ONE;
    if (type === 21) type = CONTRACT_TYPE_ONE;
    const workerId = this.num(data.worker_id);
    if (!workerId) return;

    // type=1 (asosiy) bo'lsa, xodimda allaqachon faol asosiy lavozim bo'lmasin.
    if (type === CONTRACT_TYPE_ONE) {
      const [existing] = await this.db
        .select({ id: worker_positions.id })
        .from(worker_positions)
        .where(
          and(
            eq(worker_positions.worker_id, workerId),
            eq(worker_positions.type, CONTRACT_TYPE_ONE),
            eq(worker_positions.status, STATUS_ACTIVE),
            notDeleted(worker_positions),
          ),
        )
        .limit(1);
      if (existing) {
        throw new BusinessException(
          400,
          this.i18n.t('messages.worker.already'),
        );
      }
    }

    const values = {
      department_id: dp.department_id,
      position_id: dp.position_id,
      organization_id: orgId,
      department_position_id: deptPosId,
      worker_id: workerId,
      contract_id: this.num(data.contract_id),
      type,
      contract_position: true,
      probation: this.num(data.probation) ?? 0,
      vacation_main_day: this.num(data.vacation_main_day) ?? 0,
      additional_vacation_day: this.num(data.additional_vacation_day) ?? 0,
      group: this.num(data.group) ?? 0,
      rank: this.str(data.rank) ?? '4',
      rate: this.num(data.rate) ?? 100,
      salary: this.num(data.salary) ?? null,
      post_name: this.str(data.post_name) ?? null,
      position_date:
        this.str(data.position_date) ??
        this.str(data.command_date) ??
        this.today(),
      status: STATUS_ACTIVE,
    };

    // updateOrCreate (organization_id, worker_id, department_position_id).
    const [found] = await this.db
      .select({ id: worker_positions.id })
      .from(worker_positions)
      .where(
        and(
          eq(worker_positions.organization_id, orgId),
          eq(worker_positions.worker_id, workerId),
          eq(worker_positions.department_position_id, deptPosId),
        ),
      )
      .limit(1);
    if (found) {
      await this.db
        .update(worker_positions)
        .set({ ...values, updated_at: sql`NOW()` })
        .where(eq(worker_positions.id, found.id));
    } else {
      await this.db.insert(worker_positions).values({
        uuid: randomUUID(),
        ...values,
        created_at: sql`NOW()`,
        updated_at: sql`NOW()`,
      });
    }

    // Contract ACTIVE.
    const contractId = this.num(data.contract_id);
    if (contractId) {
      await this.db
        .update(contracts)
        .set({ status: STATUS_ACTIVE, updated_at: sql`NOW()` })
        .where(eq(contracts.id, contractId));
    }

    // User org + Worker rol (Laravel: user org update + roles attach).
    await this.assignWorkerRole(workerId, orgId);
  }

  // Laravel: user->update(org) + roles detach/attach 'Worker'.
  private async assignWorkerRole(
    workerId: number,
    organizationId: number | null,
  ): Promise<void> {
    if (!organizationId) return;
    const [user] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.worker_id, workerId))
      .limit(1);
    if (!user) return;
    await this.db
      .update(users)
      .set({ organization_id: organizationId })
      .where(eq(users.id, user.id));
    // Worker rolini qayta biriktirish (eski 'Worker' pivotni o'chirib).
    await this.db
      .delete(model_has_roles)
      .where(
        and(
          eq(model_has_roles.role_id, WORKER_ROLE_ID),
          eq(model_has_roles.model_id, user.id),
          eq(model_has_roles.model_type, USER_MODEL_TYPE),
        ),
      );
    await this.db.insert(model_has_roles).values({
      role_id: WORKER_ROLE_ID,
      model_id: user.id,
      model_type: USER_MODEL_TYPE,
      organization_id: organizationId,
    });
  }

  // ---- Helperlar ----

  private async readData(commandId: number): Promise<CmdData | null> {
    try {
      const buf = await this.minio.getObject(`json/commands/${commandId}.json`);
      const parsed = JSON.parse(buf.toString('utf-8')) as {
        data?: CmdData;
      };
      return parsed.data ?? null;
    } catch {
      return null;
    }
  }

  private num(v: unknown): number | null {
    if (v == null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  private str(v: unknown): string | null {
    if (v == null) return null;
    return String(v);
  }

  private today(): string {
    return new Date().toISOString().split('T')[0];
  }
}
