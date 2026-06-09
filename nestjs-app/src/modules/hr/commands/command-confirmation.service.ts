// CommandConfirmationService — buyruq hujjati TO'LIQ tasdiqlanganda (barcha
// imzolar) bajariladigan biznes-logika (side-effect).
// Laravel: App\Services\CommandConfirmationService::confirmation +
// App\Services\WorkerPositionService.
//
// Manba: json/commands/{id}.json (`data`) — buyruq yaratilganda saqlangan.

import { Injectable, Logger } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  commands,
  contracts,
  contract_additional,
  department_positions,
  model_has_roles,
  users,
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
    } else if (
      [41, 55, 43, 44, 50, 45, 46, 47, 48, 49, 51, 52, 53, 54].includes(type) ||
      [61, 62, 71, 72, 73].includes(type)
    ) {
      // Ta'til / safar / mukofot side-effectlari boyroq `data` talab qiladi
      // (vacation type, contract_id, gift_type — buyruq qurishda hisoblanadi).
      // Phase 2: shu hisoblangan data saqlanib, bu yerda qo'llaniladi.
      this.logger.log(
        `wp ${this.num(data.worker_position_id) ?? '-'} tur ${type}: side-effect Phase 2 (vacation/trip/incentive)`,
      );
    }
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
