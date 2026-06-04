// CommandReplaceService — buyruq (command) DOCX shablonini to'ldirish.
// Laravel: Modules\HR\Services\CommandReplaceService.
//
// Hozircha faqat command_type = 32 (THIRTY_TWO — mehnat shartnomasi muddati
// tugashi munosabati bilan bekor qilish) qo'llab-quvvatlanadi.
//
// Oqim:
//   1. `resumes/commands/32.docx` shabloni o'qiladi
//   2. `${placeholder}` lar to'ldiriladi (Word run'larga bo'lingani normalize qilinadi)
//   3. DOCX buffer qaytariladi → controller ConvertService bilan PDF'ga aylantiradi

import { Injectable } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import PizZip from 'pizzip';
import { and, eq, inArray } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  cities,
  command_types,
  confirmation_workers,
  contracts,
  department_positions,
  departments,
  organizations,
  positions as positionsTable,
  worker_positions,
  workers,
} from '@/db/schema';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { BusinessException } from '@/common/exceptions/business.exception';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import { I18nService } from 'nestjs-i18n';
import type { CreateCommandDto } from '@/modules/hr/commands/dto/command.dto';

const UZ_MONTHS = [
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

// VacationAdditionalEnum (uz) — Laravel messages.vacations.additional_types.
// Hujjat har doim uz'da yasaladi (VacationAdditionalEnum::get default 'uz').
const VACATION_ADDITIONAL_UZ: Record<number, string> = {
  1: 'Bitta tashkilotda yoki tarmoqda ko‘p yillik ish staji uchun',
  2: "12 yoshga to'lmagan 2 va undan ortiq farzandi borligi uchun",
  3: '16 yoshga to‘lmagan nogironligi bo‘lgan farzandi borligi uchun',
  4: 'Noqulay mehnat sharoitlaridagi ish uchun',
  5: 'Noqulay tabiiy-iqlim sharoitlaridagi ish uchun',
  6: 'Donorlarga beriladigan dam olish kuni',
};

@Injectable()
export class CommandReplaceService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
    private readonly i18n: I18nService,
    private readonly minio: MinioService,
  ) {}

  // Qo'llab-quvvatlanadigan command type'lar — delete/termination guruhi (31–39).
  // Laravel dispatchDeleteTypeHandler. 31/32 oddiy; 33–39 qo'shimcha bloklar
  // (pension/compensation/salary_withholding) bilan — CommandAdditionalTemplateHelper.
  static readonly SUPPORTED_TYPES = [31, 32, 33, 34, 35, 36, 37, 38, 39];

  // Create-group (Laravel dispatchCreateTypeHandler) — yangi lavozimga qabul.
  static readonly CREATE_TYPES = [1, 2, 3, 4, 5, 6, 7, 8];

  // Update-group (Laravel dispatchUpdateTypeHandler) — lavozim/shartnoma o'zgarishi.
  static readonly UPDATE_TYPES = [21, 25];

  // Many-worker (Laravel ManyWorkerCommandTypeHandler) — ko'p xodimli buyruqlar.
  static readonly MANY_WORKER_TYPES = [41, 55, 61, 62, 71, 72, 73];

  // Termination (bekor qilish) turlari — qo'shimcha bloklar qo'llanadigan.
  private static readonly TERMINATION_TYPES = [
    31, 32, 33, 34, 35, 36, 37, 38, 39,
  ];
  // reasonCode qo'shiladigan turlar.
  private static readonly REASON_CODE_TYPES = [34, 39];

  // Delete-group command (31, 32) uchun DOCX hosil qiladi.
  // Laravel handleDeleteType, view rejimi. `{type}.docx` shabloni ishlatiladi.
  async buildDeleteTypeDocx(dto: CreateCommandDto): Promise<Buffer> {
    if (!dto.worker_position_id) {
      throw new BusinessException(
        400,
        this.i18n.t('messages.worker_position_not_found'),
      );
    }

    // 1) Worker position + worker + contract.
    const [wp] = await this.db
      .select({
        id: worker_positions.id,
        worker_id: worker_positions.worker_id,
        contract_id: worker_positions.contract_id,
        organization_id: worker_positions.organization_id,
        department_id: worker_positions.department_id,
        position_id: worker_positions.position_id,
        worker_last: workers.last_name,
        worker_first: workers.first_name,
        worker_middle: workers.middle_name,
        contract_number: contracts.number,
        contract_date: contracts.contract_date,
      })
      .from(worker_positions)
      .leftJoin(workers, eq(workers.id, worker_positions.worker_id))
      .leftJoin(contracts, eq(contracts.id, worker_positions.contract_id))
      .where(
        and(
          eq(worker_positions.id, dto.worker_position_id),
          notDeleted(worker_positions),
        ),
      )
      .limit(1);
    if (!wp) {
      throw new BusinessException(
        400,
        this.i18n.t('messages.worker_position_not_found'),
      );
    }

    // 2) Director (ConfirmationWorker → worker + position).
    const director = await this.loadConfirmationWorker(dto.director_id);

    // 3) Finance (ConfirmationWorker), agar berilgan bo'lsa.
    const finance = dto.finance_id
      ? await this.loadConfirmationWorker(dto.finance_id)
      : null;

    // 4) Organization (address uchun) — user.org yoki dto.organization_id.
    const orgId =
      this.ctx.user?.organization_id ??
      dto.organization_id ??
      wp.organization_id;
    const address = await this.resolveAddress(orgId);

    // 5) post_name (qisqa lavozim nomi).
    const postName = await this.buildShortPosition(
      wp.department_id,
      wp.position_id,
    );

    // 6) Qiymatlar.
    const scalars: Record<string, string> = {
      command_number: dto.command_number ?? '',
      command_date: this.dateTex(dto.command_date),
      address,
      director_position: director?.position ?? '',
      director_short_name: director
        ? this.shortName(
            director.last_name,
            director.first_name,
            director.middle_name,
          )
        : '',
      contract_to_date: dto.contract_to_date
        ? this.dateTex(dto.contract_to_date)
        : '',
      contract_date: this.dateTex(wp.contract_date),
      contract_number: wp.contract_number ?? '',
      post_name: postName.toLowerCase(),
      worker_full_name: this.fullName(
        wp.worker_last,
        wp.worker_first,
        wp.worker_middle,
      ),
      worker_short_name: this.shortName(
        wp.worker_last,
        wp.worker_first,
        wp.worker_middle,
      ),
      // `finance` — Laravel setFinanceValue: scalar EMAS. finance bo'lsa complex
      // value (Arial 14, lavozim normal + ism BOLD), bo'lmasa "Moliya bo'limi".
      // Scalar replace'dan keyin alohida ishlanadi (pastga qarang).
      // `signature_director` — Laravel view rejimida o'rnatmaydi (literal qoladi).
      // `photo` — banner rasm, alohida embedBanner() bilan qo'yiladi.
    };

    // 6b) Qo'shimcha bloklar (33–39: pension/compensation/salary_withholding,
    //     codes, reason, warning/med, base) — CommandAdditionalTemplateHelper.
    const additional = this.buildDeleteAdditional(dto);
    Object.assign(scalars, additional.scalars);

    // 7) Render — template + scalar + cloneBlock + finance + banner.
    return this.renderTemplate(
      orgId,
      dto.command_type,
      scalars,
      finance,
      additional.blocks,
    );
  }

  // Umumiy render: resolveTemplate → normalize → cloneBlock → scalar → finance → banner.
  // Delete (blocks bilan) va create (blocks'siz) ikkalasi ishlatadi.
  private async renderTemplate(
    orgId: number | null,
    type: number,
    scalars: Record<string, string>,
    finance: {
      position: string | null;
      last_name: string | null;
      first_name: string | null;
      middle_name: string | null;
    } | null,
    blocks?: {
      pension_count: number;
      compensation: number;
      salary_withholding: number;
    },
    rowSets?: Array<{ anchor: string; rows: Array<Record<string, string>> }>,
  ): Promise<Buffer> {
    const content = await this.resolveTemplate(orgId, type);
    const zip = new PizZip(content);
    const xmlFile = zip.file('word/document.xml');
    if (!xmlFile) {
      throw new BusinessException(500, 'document.xml topilmadi');
    }
    let xml = xmlFile.asText();
    xml = this.normalizePlaceholders(xml);

    if (blocks) {
      xml = this.cloneBlock(xml, 'pension_count', blocks.pension_count);
      xml = this.cloneBlock(xml, 'compensation', blocks.compensation);
      xml = this.cloneBlock(xml, 'salary_withholding', blocks.salary_withholding);
    }

    // Ko'p ishchili (many-worker) jadval qatorlari — cloneRowAndSetValues.
    if (rowSets) {
      for (const rs of rowSets) {
        xml = this.cloneRowAndSetValues(xml, rs.anchor, rs.rows);
      }
    }

    for (const [k, v] of Object.entries(scalars)) {
      xml = xml.split(`\${${k}}`).join(this.escapeXml(v));
    }

    // finance — Laravel setFinanceValue parity (complex value).
    if (finance) {
      xml = this.setComplexValue(xml, 'finance', [
        { text: `${this.ucfirst(finance.position ?? '')} ` },
        {
          text: this.shortName(
            finance.last_name,
            finance.first_name,
            finance.middle_name,
          ),
          bold: true,
        },
      ]);
    } else {
      xml = xml.split('${finance}').join(this.escapeXml("Moliya bo'limi"));
    }

    xml = await this.embedBanner(zip, xml, orgId);
    zip.file('word/document.xml', xml);
    return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  }

  // Laravel number_format((int)$x, 2) — "1,500,000.00".
  private numberFormat(v: number | string | null | undefined): string {
    const n = Number(v);
    if (!Number.isFinite(n)) return '';
    return Math.trunc(n).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  // Create-group command (1–8) DOCX — Laravel handleCreateType +
  // applyWorkerPositionInfo. Tip 3: contract_to_date, tip 6: temporary_*.
  async buildCreateTypeDocx(dto: CreateCommandDto): Promise<Buffer> {
    if (!dto.worker_id) {
      throw new BusinessException(400, this.i18n.t('messages.worker_not_found'));
    }
    const [worker] = await this.db
      .select({
        last: workers.last_name,
        first: workers.first_name,
        middle: workers.middle_name,
      })
      .from(workers)
      .where(and(eq(workers.id, dto.worker_id), notDeleted(workers)))
      .limit(1);
    if (!worker) {
      throw new BusinessException(400, this.i18n.t('messages.worker_not_found'));
    }

    const director = await this.loadConfirmationWorker(dto.director_id);
    const finance = dto.finance_id
      ? await this.loadConfirmationWorker(dto.finance_id)
      : null;
    const orgId =
      this.ctx.user?.organization_id ?? dto.organization_id ?? null;
    const address = await this.resolveAddress(orgId);

    // post_name — department_position_id (qisqa lavozim) yoki position_id (nom).
    let postName = '';
    if (dto.department_position_id) {
      const [dp] = await this.db
        .select({
          department_id: department_positions.department_id,
          position_id: department_positions.position_id,
        })
        .from(department_positions)
        .where(eq(department_positions.id, dto.department_position_id))
        .limit(1);
      if (dp) {
        postName = await this.buildShortPosition(
          dp.department_id,
          dp.position_id,
        );
      }
    } else if (dto.position_id) {
      const [pos] = await this.db
        .select({ name: positionsTable.name })
        .from(positionsTable)
        .where(eq(positionsTable.id, dto.position_id))
        .limit(1);
      postName = pos?.name ?? '';
    }

    // probation — Laravel ProbationEnum uz: "{n} oylik" + " sinov muddati bilan".
    const probation = dto.probation
      ? `${dto.probation} oylik sinov muddati bilan`
      : 'sinovsiz';
    const group = dto.group ?? 1;
    const rank = dto.rank ?? 7;

    const scalars: Record<string, string> = {
      command_number: dto.command_number ?? '',
      command_date: this.dateTex(dto.command_date),
      address,
      director_position: director?.position ?? '',
      director_short_name: director
        ? this.shortName(
            director.last_name,
            director.first_name,
            director.middle_name,
          )
        : '',
      post_name: postName.toLowerCase(),
      probation,
      position_date: this.dateTex(dto.position_date),
      worker_full_name: this.fullName(worker.last, worker.first, worker.middle),
      worker_short_name: this.shortName(
        worker.last,
        worker.first,
        worker.middle,
      ),
      group: `${group}-guruh`,
      rank: `${rank}-razryadi`,
      salary: this.numberFormat(dto.salary),
      rate: dto.rate != null ? String(dto.rate) : '',
      contract_date: this.dateTex(dto.contract_date),
      contract_number: dto.number ?? '',
    };

    // Tip 3 — contract_to_date.
    if (dto.command_type === 3 && dto.contract_to_date) {
      scalars.contract_to_date = this.dateTex(dto.contract_to_date);
    }

    // Tip 6 — vaqtinchalik o'rinbosar (WorkerPosition by temporary_worker_id).
    if (dto.command_type === 6 && dto.temporary_worker_id) {
      const [twp] = await this.db
        .select({
          last: workers.last_name,
          first: workers.first_name,
          middle: workers.middle_name,
          department_id: worker_positions.department_id,
          position_id: worker_positions.position_id,
        })
        .from(worker_positions)
        .leftJoin(workers, eq(workers.id, worker_positions.worker_id))
        .where(
          and(
            eq(worker_positions.id, dto.temporary_worker_id),
            notDeleted(worker_positions),
          ),
        )
        .limit(1);
      if (twp) {
        scalars.temporary_worker_name = this.shortName(
          twp.last,
          twp.first,
          twp.middle,
        );
        scalars.temporary_post_name = (
          await this.buildShortPosition(twp.department_id, twp.position_id)
        ).toLowerCase();
      }
    }

    return this.renderTemplate(orgId, dto.command_type, scalars, finance);
  }

  // Update-group command (21, 25) DOCX — Laravel handleUpdateType.
  // worker_position'dan worker+contract; applyWorkerPositionInfo (dto'dan);
  // tip 21 post_name (dept_position). DIQQAT: contract_date RAW (dateTex EMAS).
  // Tasdiqlovchilar delete bilan bir xil (worker_position'dan) → buildDeleteTypeConfirmations.
  async buildUpdateTypeDocx(dto: CreateCommandDto): Promise<Buffer> {
    if (!dto.worker_position_id) {
      throw new BusinessException(
        400,
        this.i18n.t('messages.worker_position_not_found'),
      );
    }
    const [wp] = await this.db
      .select({
        worker_last: workers.last_name,
        worker_first: workers.first_name,
        worker_middle: workers.middle_name,
        department_id: worker_positions.department_id,
        position_id: worker_positions.position_id,
        organization_id: worker_positions.organization_id,
        contract_number: contracts.number,
        contract_date: contracts.contract_date,
        contract_to_date: contracts.contract_to_date,
      })
      .from(worker_positions)
      .leftJoin(workers, eq(workers.id, worker_positions.worker_id))
      .leftJoin(contracts, eq(contracts.id, worker_positions.contract_id))
      .where(
        and(
          eq(worker_positions.id, dto.worker_position_id),
          notDeleted(worker_positions),
        ),
      )
      .limit(1);
    if (!wp) {
      throw new BusinessException(
        400,
        this.i18n.t('messages.worker_position_not_found'),
      );
    }

    const director = await this.loadConfirmationWorker(dto.director_id);
    const finance = dto.finance_id
      ? await this.loadConfirmationWorker(dto.finance_id)
      : null;
    const orgId =
      this.ctx.user?.organization_id ??
      dto.organization_id ??
      wp.organization_id;
    const address = await this.resolveAddress(orgId);

    // post_name — faqat tip 21 (department_position_id, qisqa lavozim, kichik harf).
    let postName = '';
    if (dto.command_type === 21 && dto.department_position_id) {
      const [dp] = await this.db
        .select({
          department_id: department_positions.department_id,
          position_id: department_positions.position_id,
        })
        .from(department_positions)
        .where(eq(department_positions.id, dto.department_position_id))
        .limit(1);
      if (dp) {
        postName = (
          await this.buildShortPosition(dp.department_id, dp.position_id)
        ).toLowerCase();
      }
    }

    const group = dto.group ?? 1;
    const rank = dto.rank ?? 7;
    // worker_position — getShortPosition (kichik harf EMAS, Laravel kabi).
    const workerPositionShort = await this.buildShortPosition(
      wp.department_id,
      wp.position_id,
    );

    const scalars: Record<string, string> = {
      command_number: dto.command_number ?? '',
      command_date: this.dateTex(dto.command_date),
      address,
      director_position: director?.position ?? '',
      director_short_name: director
        ? this.shortName(
            director.last_name,
            director.first_name,
            director.middle_name,
          )
        : '',
      // applyWorkerPositionInfo — dto'dan.
      position_date: this.dateTex(dto.position_date),
      worker_full_name: this.fullName(
        wp.worker_last,
        wp.worker_first,
        wp.worker_middle,
      ),
      worker_short_name: this.shortName(
        wp.worker_last,
        wp.worker_first,
        wp.worker_middle,
      ),
      group: `${group}-guruh`,
      rank: `${rank}-razryadi`,
      salary: this.numberFormat(dto.salary),
      rate: dto.rate != null ? String(dto.rate) : '',
      // contract_date — RAW (Laravel update raw qiymat, dateTex EMAS).
      contract_date: wp.contract_date ?? '',
      contract_number: wp.contract_number ?? '',
      worker_position: workerPositionShort,
      position_to_date: wp.contract_to_date ?? '',
      post_name: postName,
    };

    return this.renderTemplate(orgId, dto.command_type, scalars, finance);
  }

  // Many-worker command (41,55,61,62,71,72,73) DOCX — ManyWorkerCommandTypeHandler.
  // Har xodim uchun jadval qatori (cloneRowAndSetValues); tur bo'yicha row maydonlari.
  async buildManyWorkerDocx(dto: CreateCommandDto): Promise<Buffer> {
    const type = dto.command_type;
    const items = Array.isArray(dto.worker_positions)
      ? (dto.worker_positions as Array<Record<string, unknown>>)
      : [];
    const ids = items
      .map((i) => Number(i.id))
      .filter((n) => Number.isFinite(n));

    const wps = ids.length
      ? await this.db
          .select({
            id: worker_positions.id,
            worker_id: worker_positions.worker_id,
            organization_id: worker_positions.organization_id,
            department_id: worker_positions.department_id,
            position_id: worker_positions.position_id,
            worker_last: workers.last_name,
            worker_first: workers.first_name,
            worker_middle: workers.middle_name,
            contract_number: contracts.number,
            contract_date: contracts.contract_date,
          })
          .from(worker_positions)
          .leftJoin(workers, eq(workers.id, worker_positions.worker_id))
          .leftJoin(contracts, eq(contracts.id, worker_positions.contract_id))
          .where(
            and(
              inArray(worker_positions.id, ids),
              notDeleted(worker_positions),
            ),
          )
      : [];
    const wpMap = new Map(wps.map((w) => [w.id, w]));

    // Destination org/dept lookuplari (tip 61, 62).
    const orgMap = new Map<number, string>();
    const deptMap = new Map<number, string>();
    if (type === 61 || type === 62) {
      const orgIds = items
        .map((i) => Number(i.work_place_id))
        .filter((n) => Number.isFinite(n));
      const deptIds = items
        .map((i) => Number(i.department_id))
        .filter((n) => Number.isFinite(n));
      if (orgIds.length) {
        const orgs = await this.db
          .select({ id: organizations.id, full_name: organizations.full_name })
          .from(organizations)
          .where(inArray(organizations.id, orgIds));
        orgs.forEach((o) => orgMap.set(o.id, o.full_name ?? ''));
      }
      if (deptIds.length) {
        const depts = await this.db
          .select({ id: departments.id, name: departments.name })
          .from(departments)
          .where(inArray(departments.id, deptIds));
        depts.forEach((d) => deptMap.set(d.id, d.name ?? ''));
      }
    }

    const director = await this.loadConfirmationWorker(dto.director_id);
    const finance = dto.finance_id
      ? await this.loadConfirmationWorker(dto.finance_id)
      : null;
    const orgId =
      this.ctx.user?.organization_id ??
      dto.organization_id ??
      wps[0]?.organization_id ??
      null;
    const address = await this.resolveAddress(orgId);

    const rows: Array<Record<string, string>> = [];
    const shortNames: string[] = [];
    for (const item of items) {
      const wp = wpMap.get(Number(item.id));
      if (!wp) continue;
      const fullName = this.fullName(
        wp.worker_last,
        wp.worker_first,
        wp.worker_middle,
      );
      const postName = (
        await this.buildShortPosition(wp.department_id, wp.position_id)
      ).toLowerCase();
      shortNames.push(
        this.shortName(wp.worker_last, wp.worker_first, wp.worker_middle),
      );

      if (type === 41) {
        const addArr = Array.isArray(item.additional)
          ? (item.additional as Array<{ id?: unknown; value?: unknown }>)
          : [];
        let va = addArr
          .map(
            (a) =>
              `${(VACATION_ADDITIONAL_UZ[Number(a.id)] ?? '').toLowerCase()} ${
                a.value ?? ''
              } kun`,
          )
          .join(', ');
        if (va) va = `(${va})`;
        rows.push({
          worker_full_name: fullName,
          period_from: this.dateTex(item.period_from as string),
          period_to: this.dateTex(item.period_to as string),
          post_name: postName,
          all_day: String(item.all_day ?? ''),
          additional: va,
          from: this.dateTex(item.from as string),
          to: this.dateTex(item.to as string),
          work_day: this.dateTex((item.work_day ?? item.to) as string),
        });
      } else if (type === 55) {
        rows.push({
          worker_full_name: fullName,
          post_name: postName,
          vacation_dates: this.buildVacationTimes(item),
          work_day: item.work_day
            ? this.dateTex(item.work_day as string)
            : this.dateTexPlusDay(item.to as string),
        });
      } else if (type === 61 || type === 62) {
        let toOrg: string;
        if ('work_place_id' in item) {
          const wpName = orgMap.get(Number(item.work_place_id)) ?? '';
          toOrg =
            'department_id' in item
              ? `${wpName} ${deptMap.get(Number(item.department_id)) ?? ''}`.trim()
              : wpName;
        } else {
          toOrg = String(item.to_organization ?? '');
        }
        rows.push({
          worker_full_name: fullName,
          to_organization: `${toOrg}ga`,
          reason: String(item.reason ?? ''),
          post_name: postName,
          contract_date: wp.contract_date ?? '',
          contract_number: wp.contract_number ?? '',
          from: this.dateTex(item.from as string),
          to: this.dateTex(item.to as string),
        });
      } else if (type === 71) {
        rows.push({
          worker_full_name: fullName,
          post_name: postName,
          reason: String(item.reason ?? '').toLowerCase(),
          gift: String(item.gift ?? ''),
        });
      } else if (type === 72) {
        rows.push({
          worker_full_name: fullName,
          post_name: postName,
          reason: String(item.reason ?? ''),
          fine: String(item.fine ?? ''),
        });
      } else if (type === 73) {
        const amount = item.amount ?? '';
        const finText =
          Number(item.type) === 1
            ? `mehnatga haq to'lash eng kam miqdorining ${amount} barobari ko'rinishida `
            : `uzluksiz ish stajiga bog'liq ravishda lavozim maoshinining ${amount}% miqdorida `;
        rows.push({
          worker_full_name: fullName,
          post_name: postName,
          reason: String(item.reason ?? '').toLowerCase(),
          financial_assistance: finText,
        });
      }
    }

    const scalars: Record<string, string> = {
      command_number: dto.command_number ?? '',
      command_date: this.dateTex(dto.command_date),
      address,
      director_position: director?.position ?? '',
      director_short_name: director
        ? this.shortName(
            director.last_name,
            director.first_name,
            director.middle_name,
          )
        : '',
    };

    // Qo'shimcha scalar'lar: workers (61/62), base (71 dto.base / 73 additional.base).
    if (type === 61 || type === 62) {
      scalars.workers =
        shortNames.length > 1
          ? `${shortNames.join(', ')}lar`
          : (shortNames[0] ?? '');
    }
    if (type === 71) {
      scalars.base = dto.base ?? '';
    }
    if (type === 73) {
      const add = (dto.command_additional ?? {}) as Record<string, unknown>;
      scalars.base = typeof add.base === 'string' ? add.base : '';
    }

    return this.renderTemplate(orgId, type, scalars, finance, undefined, [
      { anchor: 'worker_full_name', rows },
    ]);
  }

  // Tip 55 — ta'til vaqtlari matni (Laravel handleFiftyFiveType match logikasi).
  private buildVacationTimes(item: Record<string, unknown>): string {
    const from = item.from as string;
    const to = item.to as string;
    const fromText = this.dateTex(from);
    const toText = this.dateTex(to);
    const fromTime = (item.from_time as string) || null;
    const toTime = (item.to_time as string) || null;
    const diff = from !== to;
    if (diff && fromTime && toTime)
      return `${fromText} ${fromTime} dan ${toText} ${toTime} gacha`;
    if (diff && fromTime) return `${fromText} ${fromTime} dan ${toText} gacha`;
    if (diff && toTime) return `${fromText} dan ${toText} ${toTime} gacha`;
    if (diff) return `${fromText} dan ${toText} gacha`;
    if (fromTime && toTime) return `${fromText} ${fromTime} dan ${toTime} gacha`;
    if (fromTime) return `${fromText} ${fromTime} dan`;
    if (toTime) return `${fromText} ${toTime} gacha`;
    return `${fromText} kuni`;
  }

  // getDateTex(sana + 1 kun) — tip 55 work_day default.
  private dateTexPlusDay(d: string | null | undefined): string {
    if (!d) return '';
    const dt = new Date(`${d}T00:00:00Z`);
    if (isNaN(dt.getTime())) return '';
    dt.setUTCDate(dt.getUTCDate() + 1);
    return this.dateTex(dt.toISOString().slice(0, 10));
  }

  // Many-worker tasdiqlovchilari — Laravel appendCommandConfirmations: har
  // worker_position uchun type='w' (position bilan) + imzolovchilar.
  async buildManyWorkerConfirmations(dto: CreateCommandDto): Promise<
    Array<{
      worker_id: number;
      position: string | null;
      type: string;
      order: number;
    }>
  > {
    const rows: Array<{
      worker_id: number;
      position: string | null;
      type: string;
      order: number;
    }> = [];
    const items = Array.isArray(dto.worker_positions)
      ? (dto.worker_positions as Array<Record<string, unknown>>)
      : [];
    const ids = items
      .map((i) => Number(i.id))
      .filter((n) => Number.isFinite(n));
    if (ids.length) {
      const wps = await this.db
        .select({
          id: worker_positions.id,
          worker_id: worker_positions.worker_id,
          department_id: worker_positions.department_id,
          position_id: worker_positions.position_id,
        })
        .from(worker_positions)
        .where(
          and(inArray(worker_positions.id, ids), notDeleted(worker_positions)),
        );
      for (const wp of wps) {
        if (wp.worker_id == null) continue;
        const position = await this.buildShortPosition(
          wp.department_id,
          wp.position_id,
        );
        rows.push({ worker_id: wp.worker_id, position, type: 'w', order: 1 });
      }
    }
    rows.push(...(await this.buildSignerConfirmations(dto)));
    return rows;
  }

  // Create-group command (1–8) tasdiqlovchilari — Laravel appendWorkerConfirmation
  // (hodim type='w' order=1) + imzolovchilar (type='s') + direktor (type='d').
  async buildCreateTypeConfirmations(dto: CreateCommandDto): Promise<
    Array<{
      worker_id: number;
      position: string | null;
      type: string;
      order: number;
    }>
  > {
    const rows: Array<{
      worker_id: number;
      position: string | null;
      type: string;
      order: number;
    }> = [];
    if (dto.worker_id) {
      rows.push({ worker_id: dto.worker_id, position: null, type: 'w', order: 1 });
    }
    rows.push(...(await this.buildSignerConfirmations(dto)));
    return rows;
  }

  // Delete-group command (31, 32) uchun `command_confirmations` qatorlari.
  // Laravel: appendWorkerPositionConfirmation (type='w') + createConfirmations
  // (imzolovchilar type='s', direktor type='d').
  async buildDeleteTypeConfirmations(dto: CreateCommandDto): Promise<
    Array<{
      worker_id: number;
      position: string | null;
      type: string;
      order: number;
    }>
  > {
    const rows: Array<{
      worker_id: number;
      position: string | null;
      type: string;
      order: number;
    }> = [];

    // 1) Hodim tasdig'i (type='w') — bekor qilinayotgan lavozim egasi.
    if (dto.worker_position_id) {
      const [wp] = await this.db
        .select({
          worker_id: worker_positions.worker_id,
          department_id: worker_positions.department_id,
          position_id: worker_positions.position_id,
        })
        .from(worker_positions)
        .where(
          and(
            eq(worker_positions.id, dto.worker_position_id),
            notDeleted(worker_positions),
          ),
        )
        .limit(1);
      if (wp?.worker_id) {
        const position = await this.buildShortPosition(
          wp.department_id,
          wp.position_id,
        );
        rows.push({
          worker_id: wp.worker_id,
          position,
          type: 'w',
          order: 1,
        });
      }
    }

    // 2) Imzolovchilar (type='s') + direktor (type='d').
    rows.push(...(await this.buildSignerConfirmations(dto)));

    return rows;
  }

  // Imzolovchilar (type='s') + direktor (type='d') — Laravel createConfirmations.
  // confirmations[].id → ConfirmationWorker. Create va delete ikkalasi ishlatadi.
  private async buildSignerConfirmations(dto: CreateCommandDto): Promise<
    Array<{
      worker_id: number;
      position: string | null;
      type: string;
      order: number;
    }>
  > {
    const out: Array<{
      worker_id: number;
      position: string | null;
      type: string;
      order: number;
    }> = [];
    const confItems = Array.isArray(dto.confirmations)
      ? (dto.confirmations as Array<{ id?: number; order?: number }>)
      : [];
    const csMap = new Map<number, { id?: number; order?: number }>();
    for (const c of confItems) {
      const id = Number(c?.id);
      if (Number.isFinite(id)) csMap.set(id, c);
    }
    const ids = [...csMap.keys()];
    const directorId = Number(dto.director_id);
    if (Number.isFinite(directorId) && !ids.includes(directorId)) {
      ids.push(directorId);
    }
    if (!ids.length) return out;

    const cws = await this.db
      .select({
        id: confirmation_workers.id,
        worker_id: confirmation_workers.worker_id,
        position: confirmation_workers.position,
      })
      .from(confirmation_workers)
      .where(inArray(confirmation_workers.id, ids));
    const cwMap = new Map(cws.map((cw) => [cw.id, cw]));
    for (const id of ids) {
      const cw = cwMap.get(id);
      if (!cw || cw.worker_id == null) continue;
      const order = csMap.get(id)?.order ?? csMap.size + 1;
      out.push({
        worker_id: cw.worker_id,
        position: cw.position,
        type: id === directorId ? 'd' : 's',
        order: Number(order),
      });
    }
    return out;
  }

  // `${photo}` placeholder o'rniga banner rasmni inline image qilib joylaydi.
  // Laravel: createTemplateProcessor → setImageValue('photo', banner).
  private async embedBanner(
    zip: PizZip,
    xml: string,
    orgId: number | null | undefined,
  ): Promise<string> {
    if (!xml.includes('${photo}')) return xml;

    // Banner: HD papka (3x upscale, 1962×261) afzal — PDF'da letterhead matni
    // xira chiqmasligi uchun. Topilmasa standart 654×87 papkaga, so'ng 1.png ga.
    const cmdDir = join(process.cwd(), 'public', 'resumes', 'commands');
    const bannerCandidates = [
      join(cmdDir, 'banners-hd', `${orgId ?? 1}.png`),
      join(cmdDir, 'banners', `${orgId ?? 1}.png`),
      join(cmdDir, 'banners-hd', '1.png'),
      join(cmdDir, 'banners', '1.png'),
    ];
    const bannerPath = bannerCandidates.find((p) => existsSync(p));
    if (!bannerPath) {
      // Banner topilmasa — placeholder'ni bo'shatamiz.
      return xml.split('${photo}').join('');
    }
    const imgBuffer = await readFile(bannerPath);

    // 1) Rasmni zip ichiga qo'shish.
    zip.file('word/media/banner.png', imgBuffer);

    // 2) [Content_Types].xml — png Default qo'shish.
    const ctFile = zip.file('[Content_Types].xml');
    if (ctFile) {
      let ct = ctFile.asText();
      if (!ct.includes('Extension="png"')) {
        ct = ct.replace(
          '</Types>',
          '<Default Extension="png" ContentType="image/png"/></Types>',
        );
        zip.file('[Content_Types].xml', ct);
      }
    }

    // 3) document.xml.rels — image relationship.
    const relId = 'rId900';
    const relsFile = zip.file('word/_rels/document.xml.rels');
    if (relsFile) {
      let rels = relsFile.asText();
      if (!rels.includes(relId)) {
        rels = rels.replace(
          '</Relationships>',
          `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/banner.png"/></Relationships>`,
        );
        zip.file('word/_rels/document.xml.rels', rels);
      }
    }

    // 4) `${photo}` run'ini drawing bilan almashtirish.
    //    Textbox o'lchamlari: cx=6257160, cy=828360 EMU.
    const drawing =
      `<w:drawing>` +
      `<wp:inline distT="0" distB="0" distL="0" distR="0">` +
      `<wp:extent cx="6257160" cy="828360"/>` +
      `<wp:effectExtent l="0" t="0" r="0" b="0"/>` +
      `<wp:docPr id="900" name="banner"/>` +
      `<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>` +
      `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">` +
      `<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
      `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
      `<pic:nvPicPr><pic:cNvPr id="900" name="banner"/><pic:cNvPicPr/></pic:nvPicPr>` +
      `<pic:blipFill><a:blip r:embed="${relId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
      `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="6257160" cy="828360"/></a:xfrm>` +
      `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
      `</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>`;

    // `<w:t...>${photo}</w:t>` ni topib, `<w:t>` ni drawing bilan almashtirish.
    return xml.replace(/<w:t(?:\s+[^>]*)?>\$\{photo\}<\/w:t>/, drawing);
  }

  // ---- DB helpers ----

  private async loadConfirmationWorker(id: number | undefined): Promise<{
    position: string | null;
    last_name: string | null;
    first_name: string | null;
    middle_name: string | null;
  } | null> {
    if (!id) return null;
    const [row] = await this.db
      .select({
        position: confirmation_workers.position,
        last_name: workers.last_name,
        first_name: workers.first_name,
        middle_name: workers.middle_name,
      })
      .from(confirmation_workers)
      .leftJoin(workers, eq(workers.id, confirmation_workers.worker_id))
      .where(eq(confirmation_workers.id, id))
      .limit(1);
    return row ?? null;
  }

  private async resolveAddress(
    orgId: number | null | undefined,
  ): Promise<string> {
    if (!orgId) return '';
    const [org] = await this.db
      .select({
        command_address: organizations.command_address,
        city_id: organizations.city_id,
      })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);
    if (!org) return '';
    if (org.command_address) return org.command_address;
    if (!org.city_id) return '';
    const [city] = await this.db
      .select({ name: cities.name })
      .from(cities)
      .where(eq(cities.id, org.city_id))
      .limit(1);
    // Laravel: 'viloyati'→'v.', 'shahri'→'sh.', 'tumani'→'t.'.
    return (city?.name ?? '')
      .replace('viloyati', 'v.')
      .replace('shahri', 'sh.')
      .replace('tumani', 't.');
  }

  private async buildShortPosition(
    departmentId: number | null,
    positionId: number | null,
  ): Promise<string> {
    if (!positionId) return '';
    const [pos] = await this.db
      .select({ name: positionsTable.name })
      .from(positionsTable)
      .where(eq(positionsTable.id, positionId))
      .limit(1);
    let result = pos?.name ?? '';
    if (departmentId) {
      const [dept] = await this.db
        .select({ name: departments.name, level: departments.level })
        .from(departments)
        .where(eq(departments.id, departmentId))
        .limit(1);
      // DepartmentLevelEnum::CENTER = 1.
      if (dept && dept.level !== 1 && dept.name) {
        result = `${dept.name} ${result}`;
      }
    }
    return result;
  }

  // ---- formatters ----

  // Laravel Helper::getDateTex — "2026-yil 20-may".
  private dateTex(d: string | null | undefined): string {
    if (!d) return '';
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
    if (!m) return d;
    const month = UZ_MONTHS[Number(m[2]) - 1] ?? '';
    return `${m[1]}-yil ${Number(m[3])}-${month}`;
  }

  private fullName(
    last: string | null,
    first: string | null,
    middle: string | null,
  ): string {
    return [last, first, middle].filter(Boolean).join(' ');
  }

  // Laravel Worker::short_name — F.M.Familiya (digraf'lar saqlanadi).
  private shortName(
    last: string | null,
    first: string | null,
    middle: string | null,
  ): string {
    const digraphs = [
      'Yu',
      'YU',
      'yu',
      'Sh',
      'SH',
      'sh',
      'Ch',
      'CH',
      'ch',
      "O'",
      "o'",
      "G'",
      "g'",
      'Oʻ',
      'oʻ',
      'Gʻ',
      'gʻ',
      'O’',
      'o’',
      'G’',
      'g’',
    ];
    const shorten = (name: string | null): string => {
      if (!name) return '';
      const two = name.slice(0, 2);
      return digraphs.includes(two) ? two : name.slice(0, 1);
    };
    return `${shorten(first)}.${shorten(middle)}.${last ?? ''}`;
  }

  private ucfirst(s: string): string {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  }

  // Laravel getDocumentPath parity: tashkilotga xos template (command_types.file
  // → MinIO) bo'lsa o'sha, bo'lmasa default public/resumes/commands/{type}.docx.
  private async resolveTemplate(
    orgId: number | null,
    type: number,
  ): Promise<Buffer> {
    if (orgId != null) {
      const [ct] = await this.db
        .select({ file: command_types.file })
        .from(command_types)
        .where(
          and(
            eq(command_types.organization_id, orgId),
            eq(command_types.type, type),
            notDeleted(command_types),
          ),
        )
        .limit(1);
      if (ct?.file) {
        return this.minio.getObject(ct.file);
      }
    }
    return readFile(
      join(process.cwd(), 'public', 'resumes', 'commands', `${type}.docx`),
    );
  }

  // ---- DOCX template engine ----

  // PhpWord `setComplexValue` parity: `${placeholder}` ni o'z ichiga olgan butun
  // `<w:r>` run'ini berilgan formatли run'lar bilan almashtiradi. Har bir run
  // Arial 14pt (w:sz=28 yarim-punkt), kerak bo'lsa BOLD (w:b).
  // Laravel: TextRun->addText(text, ['name'=>'Arial','size'=>14,'bold'=>...]).
  private setComplexValue(
    xml: string,
    placeholder: string,
    runs: Array<{ text: string; bold?: boolean }>,
  ): string {
    const runsXml = runs
      .map((r) => {
        const rPr =
          `<w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>` +
          (r.bold ? `<w:b/><w:bCs/>` : ``) +
          `<w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr>`;
        return `<w:r>${rPr}<w:t xml:space="preserve">${this.escapeXml(
          r.text,
        )}</w:t></w:r>`;
      })
      .join('');
    // `${placeholder}` joylashgan <w:r>...</w:r> ni butunlay almashtiramiz
    // (boshqa run'larga kirib ketmasdan).
    const re = new RegExp(
      `<w:r\\b[^>]*>(?:(?!<w:r\\b)[\\s\\S])*?\\$\\{${placeholder}\\}(?:(?!</w:r>)[\\s\\S])*?</w:r>`,
    );
    return xml.replace(re, runsXml);
  }

  // PhpWord `cloneBlock` parity: `${name}` ... `${/name}` orasidagi blokni
  // `count` marta takrorlaydi yoki o'chiradi (count=0). Marker'lar joylashgan
  // `<w:p>` paragraflar olib tashlanadi (PhpWord default xatti-harakati).
  //   count=0 → blok butunlay o'chadi (marker'lar + ichidagi kontent)
  //   count=1 → kontent bir marta qoladi, marker paragraflar o'chadi
  // Marker topilmasa (masalan 31/32 templateda) — hech narsa qilmaydi.
  private cloneBlock(xml: string, name: string, count: number): string {
    const re = new RegExp(
      `<w:p\\b[^>]*>(?:(?!<w:p\\b)[\\s\\S])*?\\$\\{${name}\\}(?:(?!</w:p>)[\\s\\S])*?</w:p>` +
        `([\\s\\S]*?)` +
        `<w:p\\b[^>]*>(?:(?!<w:p\\b)[\\s\\S])*?\\$\\{/${name}\\}(?:(?!</w:p>)[\\s\\S])*?</w:p>`,
    );
    return xml.replace(re, (_full, block: string) =>
      count <= 0 ? '' : block.repeat(count),
    );
  }

  // PhpWord `cloneRowAndSetValues` parity: `${anchor}` ni o'z ichiga olgan jadval
  // qatorini (`<w:tr>`) har bir `rows[i]` uchun takrorlaydi va `${key}` larni
  // to'ldiradi. rows bo'sh bo'lsa qator o'chadi.
  private cloneRowAndSetValues(
    xml: string,
    anchor: string,
    rows: Array<Record<string, string>>,
  ): string {
    const re = new RegExp(
      `<w:tr\\b[^>]*>(?:(?!</w:tr>)[\\s\\S])*?\\$\\{${anchor}\\}(?:(?!</w:tr>)[\\s\\S])*?</w:tr>`,
    );
    const m = xml.match(re);
    if (!m) return xml;
    const rowTpl = m[0];
    const filled = rows
      .map((r) => {
        let row = rowTpl;
        for (const [k, v] of Object.entries(r)) {
          row = row.split(`\${${k}}`).join(this.escapeXml(v));
        }
        return row;
      })
      .join('');
    return xml.replace(re, () => filled);
  }

  // Oy raqami (1–12) → UZ nomi. Laravel Helper::getMonth.
  private getMonth(month: unknown): string {
    const n = Number(month);
    return Number.isInteger(n) && n >= 1 && n <= 12 ? UZ_MONTHS[n - 1] : '';
  }

  // Laravel CommandAdditionalTemplateHelper::apply parity — delete/termination
  // (33–39) uchun qo'shimcha scalar'lar + cloneBlock qarorlari.
  // 31/32 da ham xavfsiz: ortiqcha scalar/blok templateda yo'q → no-op.
  private buildDeleteAdditional(dto: CreateCommandDto): {
    scalars: Record<string, string>;
    blocks: {
      pension_count: number;
      compensation: number;
      salary_withholding: number;
    };
  } {
    const type = dto.command_type;
    const add = (dto.command_additional ?? {}) as Record<string, any>;
    const scalars: Record<string, string> = {};
    const blocks = { pension_count: 0, compensation: 0, salary_withholding: 0 };

    if (CommandReplaceService.TERMINATION_TYPES.includes(type)) {
      // codes — default 172-modda (NB-hyphen ‑, Laravel bilan bir xil).
      scalars.codes = '172‑moddasiga';

      // Pension bloki.
      if (add.pension_count) {
        scalars.year = String(add.pension_count.year ?? '');
        scalars.count = `lavozim maoshining ${add.pension_count.count} barobari miqdorida`;
        blocks.pension_count = 1;
      } else if (add.pension_coefficient) {
        scalars.year = String(add.pension_coefficient.year ?? '');
        scalars.count = `lavozim maoshining ${add.pension_coefficient.count} foizi miqdorida`;
        scalars.codes = '172,269‑moddalariga';
        blocks.pension_count = 1;
      }

      // Salary withholding yoki compensation bloki (biri).
      if (add.salary_withholding) {
        const d = add.salary_withholding;
        scalars.withholding_per1 = this.dateTex(d.period1);
        scalars.withholding_per2 = this.dateTex(d.period2);
        scalars.withholding_all_day = String(d.all_day ?? '');
        scalars.withholding_rest_day = String(d.rest_day ?? '');
        scalars.withholding_month = this.getMonth(d.month);
        scalars.codes = '172,234‑moddalariga';
        blocks.salary_withholding = 1;
      } else if (add.compensation) {
        const d = add.compensation;
        scalars.compensation_per1 = this.dateTex(d.period1);
        scalars.compensation_per2 = this.dateTex(d.period2);
        scalars.compensation_all_day = String(d.rest_day ?? '');
        scalars.codes = '172,234‑moddalariga';
        blocks.compensation = 1;
      }

      // Ixtiyoriy sana/qiymatlar (kalit mavjud bo'lsa).
      if ('warning_date' in add)
        scalars.warning_date = add.warning_date
          ? this.dateTex(add.warning_date)
          : '';
      if ('med_date' in add)
        scalars.med_date = add.med_date ? this.dateTex(add.med_date) : '';
      if ('warning_number' in add)
        scalars.warning_number = String(add.warning_number ?? '');
      if ('med_number' in add)
        scalars.med_number = String(add.med_number ?? '');
      if ('reason' in add)
        scalars.reason = String(add.reason ?? '').toLowerCase();
    }

    if (CommandReplaceService.REASON_CODE_TYPES.includes(type)) {
      scalars.reasonCode = add.reasonId
        ? `161-moddasi 2-qismi ${add.reasonId}-bandiga asosan`
        : '161-moddasi 2-qismiga asosan';
    }

    if (add && 'base' in add) {
      scalars.base = String(add.base ?? '');
    }

    return { scalars, blocks };
  }

  // `${var}` placeholder'lar Word'da bir nechta `<w:t>` run'larga bo'linadi —
  // ularni bitta `<w:t>` ichiga normalize qilamiz.
  private normalizePlaceholders(xml: string): string {
    const tagRe = /<w:t(\s+[^>]*)?>([\s\S]*?)<\/w:t>/g;
    const matches: Array<{
      start: number;
      end: number;
      text: string;
      attrs: string;
    }> = [];
    let m: RegExpExecArray | null;
    while ((m = tagRe.exec(xml)) !== null) {
      matches.push({
        start: m.index,
        end: m.index + m[0].length,
        text: m[2],
        attrs: m[1] ?? '',
      });
    }
    if (matches.length === 0) return xml;

    const fullText = matches.map((mm) => mm.text).join('');
    const offsets: number[] = [];
    let cursor = 0;
    for (const mm of matches) {
      offsets.push(cursor);
      cursor += mm.text.length;
    }
    const findMatchFor = (textIdx: number): number => {
      let lo = 0;
      let hi = matches.length - 1;
      let ans = 0;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (offsets[mid] <= textIdx) {
          ans = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      return ans;
    };

    // `${name}` va blok-yopuvchi `${/name}` markerlari (cloneBlock uchun).
    const phRe = /\$\{\/?([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
    const merges: Array<{ first: number; last: number; merged: string }> = [];
    let pm: RegExpExecArray | null;
    while ((pm = phRe.exec(fullText)) !== null) {
      const startIdx = pm.index;
      const endIdx = pm.index + pm[0].length - 1;
      const firstMatch = findMatchFor(startIdx);
      const lastMatch = findMatchFor(endIdx);
      if (firstMatch === lastMatch) continue;
      const firstWtStart = offsets[firstMatch];
      const lastWtStart = offsets[lastMatch];
      const preFirst = matches[firstMatch].text.slice(
        0,
        startIdx - firstWtStart,
      );
      const postLast = matches[lastMatch].text.slice(endIdx + 1 - lastWtStart);
      const middleText = fullText.slice(startIdx, endIdx + 1);
      merges.push({
        first: firstMatch,
        last: lastMatch,
        merged: preFirst + middleText + postLast,
      });
      phRe.lastIndex = endIdx + 1;
    }
    if (merges.length === 0) return xml;

    let result = xml;
    for (let i = merges.length - 1; i >= 0; i--) {
      const { first, last, merged } = merges[i];
      const firstMatch = matches[first];
      const attrs = firstMatch.attrs.includes('xml:space')
        ? firstMatch.attrs
        : `${firstMatch.attrs} xml:space="preserve"`;
      const newFirst = `<w:t${attrs}>${merged}</w:t>`;
      for (let j = last; j > first; j--) {
        const mm = matches[j];
        result =
          result.slice(0, mm.start) +
          `<w:t${mm.attrs}></w:t>` +
          result.slice(mm.end);
      }
      result =
        result.slice(0, firstMatch.start) +
        newFirst +
        result.slice(firstMatch.end);
    }
    return result;
  }

  private escapeXml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
