// ContractReplaceService — shartnoma (contract) DOCX shablonini to'ldirish.
// Laravel: Modules\HR\Services\ContractReplaceService::contractReplace.
//
// Command'dan farqli: cloneRow/cloneBlock/banner YO'Q — sof `setValue` (scalar).
// Template manbasi: contract_types (org-template) → fallback resumes/contracts/{type}.docx.

import { Injectable } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { join } from 'path';
import PizZip from 'pizzip';
import { and, eq } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  cities,
  confirmation_workers,
  contract_additional_types,
  contract_types,
  contracts,
  department_positions,
  departments,
  organizations,
  positions as positionsTable,
  regions,
  schedules,
  worker_passports,
  worker_phones,
  worker_positions,
  workers,
} from '@/db/schema';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { BusinessException } from '@/common/exceptions/business.exception';
import { MinioService } from '@/shared/minio/minio.service';
import { I18nService } from 'nestjs-i18n';
import type { CreateContractDto } from '@/modules/hr/contracts/dto/contract.dto';
import type { CreateContractAdditionalDto } from '@/modules/hr/contract-additional/dto/contract-additional.dto';

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

// ContractTypeEnum::label (uz) — Laravel messages.contract.*.
const CONTRACT_TYPE_UZ: Record<number, string> = {
  1: 'Mehnat shartnomasi (Nomuayyan)',
  2: 'Fuqarolik-huquqiy shartnomasi',
  3: 'Mehnat shartnomasi (O‘rindosh)',
  4: 'Mehnat shartnomasi (Masofadan turib ishlash)',
  5: 'Mehnat shartnomasi (Mavsumiy ishlarni bajarish)',
  6: 'Mehnat shartnomasi (Muayyan)',
};

@Injectable()
export class ContractReplaceService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly minio: MinioService,
  ) {}

  // Shartnoma DOCX'ini hosil qiladi (Laravel contractReplace).
  async buildContractDocx(dto: CreateContractDto): Promise<Buffer> {
    const common = await this.commonReplaceScalars(
      dto.worker_id,
      dto.director_id,
      dto.organization_id,
      dto.contract_date,
      dto.number,
    );

    const departmentName = await this.departmentName(dto.department_id);
    const workDay = await this.scheduleName(dto.schedule_id);
    const contractTypeLabel = CONTRACT_TYPE_UZ[dto.type] ?? '';
    const commandTypeLabel = dto.command_status
      ? this.commandTypeLabel(dto.command_type)
      : contractTypeLabel;

    const scalars: Record<string, string> = {
      ...common,
      contract_type: contractTypeLabel,
      department_name: departmentName,
      position_name: dto.post_name ?? '',
      command_type: commandTypeLabel,
      position_date: this.dateTex(dto.position_date),
      salary: dto.salary != null ? `${this.numberFormat(dto.salary)} so'm` : '',
      contract_to_date: dto.contract_to_date
        ? this.dateTex(dto.contract_to_date)
        : '',
      vacation_main_days:
        dto.vacation_main_day != null ? String(dto.vacation_main_day) : '',
      additional_vacation_days:
        dto.additional_vacation_day != null
          ? String(dto.additional_vacation_day)
          : '',
      probation: dto.probation ? `${dto.probation} oylik` : '',
      work_day: workDay,
    };

    const content = await this.resolveTemplate(
      'contracts',
      dto.organization_id,
      dto.type,
    );
    return this.fillTemplate(content, scalars);
  }

  // Qo'shimcha shartnoma (contract-additional) DOCX — Laravel
  // contractAdditionalReplace. Turlar: 1, 8, 12, 13.
  async buildContractAdditionalDocx(
    dto: CreateContractAdditionalDto,
  ): Promise<Buffer> {
    // worker_position → worker + contract + department/position.
    const [wp] = await this.db
      .select({
        worker_id: worker_positions.worker_id,
        department_id: worker_positions.department_id,
        position_id: worker_positions.position_id,
        contract_id: worker_positions.contract_id,
        contract_number: contracts.number,
        contract_date: contracts.contract_date,
      })
      .from(worker_positions)
      .leftJoin(contracts, eq(contracts.id, worker_positions.contract_id))
      .where(
        and(
          eq(worker_positions.id, dto.worker_position_id),
          notDeleted(worker_positions),
        ),
      )
      .limit(1);
    if (!wp?.worker_id) {
      throw new BusinessException(
        400,
        this.i18n.t('messages.worker_position_not_found'),
      );
    }

    const common = await this.commonReplaceScalars(
      wp.worker_id,
      dto.director_id,
      dto.organization_id,
      dto.contract_date,
      dto.number,
    );

    const workerPosition = `${await this.buildShortPosition(
      wp.department_id,
      wp.position_id,
    )} `;
    const contractNumber = wp.contract_number ?? '';
    const contractDate = this.dateTex(wp.contract_date);

    const scalars: Record<string, string> = {
      ...common,
      worker_position: workerPosition,
      contract_number: contractNumber,
      contract_date: contractDate,
      number: dto.number != null ? String(dto.number) : '',
    };

    // Tur 8 — yangi lavozim (department_position yoki position).
    if (dto.type === 8) {
      let newPos = '';
      if (dto.department_position_id) {
        newPos = await this.departmentPositionShort(dto.department_position_id);
      } else if (dto.position_id) {
        newPos = await this.positionName(dto.position_id);
      }
      scalars.worker_new_position = newPos;
    }
    // Tur 12, 13 — contract_to_date (kontrakt mavjud bo'lishi shart).
    if (dto.type === 12 || dto.type === 13) {
      if (!wp.contract_id) {
        throw new BusinessException(
          400,
          this.i18n.t('messages.replace.contract_not_found'),
        );
      }
      scalars.contract_to_date = this.dateTex(dto.contract_to_date);
    }

    const content = await this.resolveTemplate(
      'contract-additional',
      dto.organization_id ?? null,
      dto.type,
    );
    return this.fillTemplate(content, scalars);
  }

  // Laravel replace() — barcha contract/additional shablonlari uchun umumiy
  // setValue maydonlari (worker/org/director ma'lumotlari).
  private async commonReplaceScalars(
    workerId: number,
    directorId: number,
    orgId: number | null | undefined,
    contractDate: string | null | undefined,
    number: string | number | null | undefined,
  ): Promise<Record<string, string>> {
    const [worker] = await this.db
      .select({
        last: workers.last_name,
        first: workers.first_name,
        middle: workers.middle_name,
        pin: workers.pin,
        address: workers.address,
        current_region_id: workers.current_region_id,
        current_city_id: workers.current_city_id,
        passport: worker_passports.serial_number,
      })
      .from(workers)
      .leftJoin(worker_passports, eq(worker_passports.worker_id, workers.id))
      .where(and(eq(workers.id, workerId), notDeleted(workers)))
      .limit(1);
    if (!worker) {
      throw new BusinessException(
        400,
        this.i18n.t('messages.worker_not_found'),
      );
    }
    const workerRegion = await this.regionName(worker.current_region_id);
    const workerCity = await this.cityName(worker.current_city_id);
    const workerPhones = await this.phones(workerId);

    const [org] =
      orgId != null
        ? await this.db
            .select({
              full_name: organizations.full_name,
              address: organizations.address,
              city_id: organizations.city_id,
            })
            .from(organizations)
            .where(eq(organizations.id, orgId))
            .limit(1)
        : [];
    const orgCity = await this.cityRow(org?.city_id ?? null);
    const orgRegion = await this.regionName(orgCity?.region_id ?? null);

    const [director] = await this.db
      .select({
        position: confirmation_workers.position,
        worker_id: confirmation_workers.worker_id,
        last: workers.last_name,
        first: workers.first_name,
        middle: workers.middle_name,
      })
      .from(confirmation_workers)
      .leftJoin(workers, eq(workers.id, confirmation_workers.worker_id))
      .where(eq(confirmation_workers.id, directorId))
      .limit(1);
    const directorPhones = director?.worker_id
      ? await this.phones(director.worker_id)
      : [];

    return {
      address: this.regionAbbrev(orgRegion),
      director_full_name: director
        ? this.fullName(director.last, director.first, director.middle)
        : '',
      worker_full_name: this.fullName(worker.last, worker.first, worker.middle),
      passport: worker.passport ?? '',
      worker_pin: worker.pin != null ? String(worker.pin) : '',
      new_contract_date: this.dateTex(contractDate),
      stir: '',
      worker_address: this.joinAddress([
        workerRegion,
        workerCity,
        worker.address,
      ]),
      organization_full_name: org?.full_name ?? '',
      worker_phone: this.phoneFormat(workerPhones),
      director_position: `${director?.position ?? ''} `,
      director_phone: this.phoneFormat(directorPhones),
      organization_address: this.joinAddress([
        orgRegion,
        orgCity?.name ?? null,
        org?.address ?? null,
      ]),
      number: number != null ? String(number) : '',
    };
  }

  // ---- DB helperlar (contract-additional) ----

  private async departmentName(id: number | undefined): Promise<string> {
    if (!id) return '';
    const [d] = await this.db
      .select({ name: departments.name })
      .from(departments)
      .where(eq(departments.id, id))
      .limit(1);
    return d?.name ?? '';
  }

  private async scheduleName(id: number | undefined): Promise<string> {
    if (!id) return '';
    const [s] = await this.db
      .select({ name: schedules.name })
      .from(schedules)
      .where(eq(schedules.id, id))
      .limit(1);
    return s?.name ?? '';
  }

  private async positionName(id: number): Promise<string> {
    const [p] = await this.db
      .select({ name: positionsTable.name })
      .from(positionsTable)
      .where(eq(positionsTable.id, id))
      .limit(1);
    return p?.name ?? '';
  }

  private async departmentPositionShort(id: number): Promise<string> {
    const [dp] = await this.db
      .select({
        department_id: department_positions.department_id,
        position_id: department_positions.position_id,
      })
      .from(department_positions)
      .where(eq(department_positions.id, id))
      .limit(1);
    if (!dp) return '';
    return this.buildShortPosition(dp.department_id, dp.position_id);
  }

  // PositionHelper::getShortPosition — lavozim nomi, CENTER bo'lmagan bo'lim oldida.
  private async buildShortPosition(
    departmentId: number | null,
    positionId: number | null,
  ): Promise<string> {
    if (!positionId) return '';
    let result = await this.positionName(positionId);
    if (departmentId) {
      const [dept] = await this.db
        .select({ name: departments.name, level: departments.level })
        .from(departments)
        .where(eq(departments.id, departmentId))
        .limit(1);
      if (dept && dept.level !== 1 && dept.name) {
        result = `${dept.name} ${result}`;
      }
    }
    return result;
  }

  // ---- Template engine (sodda — scalar) ----

  private async resolveTemplate(
    model: 'contracts' | 'contract-additional',
    orgId: number | null,
    type: number,
  ): Promise<Buffer> {
    if (orgId != null) {
      const table =
        model === 'contracts' ? contract_types : contract_additional_types;
      const [ct] = await this.db
        .select({ file: table.file })
        .from(table)
        .where(
          and(
            eq(table.organization_id, orgId),
            eq(table.type, type),
            notDeleted(table),
          ),
        )
        .limit(1);
      if (ct?.file) return this.minio.getObject(ct.file);
    }
    return readFile(
      join(process.cwd(), 'public', 'resumes', model, `${type}.docx`),
    );
  }

  private fillTemplate(
    content: Buffer,
    scalars: Record<string, string>,
  ): Buffer {
    const zip = new PizZip(content);
    const xmlFile = zip.file('word/document.xml');
    if (!xmlFile) {
      throw new BusinessException(500, 'document.xml topilmadi');
    }
    let xml = xmlFile.asText();
    xml = this.normalizePlaceholders(xml);
    for (const [k, v] of Object.entries(scalars)) {
      xml = xml.split(`\${${k}}`).join(this.escapeXml(v));
    }
    // Non-breaking hyphen (U+2011 + <w:noBreakHyphen/>) → oddiy defis (PDF □ oldini olish).
    xml = xml.split('‑').join('-');
    xml = xml.replace(/<w:noBreakHyphen\s*\/>/g, '<w:t>-</w:t>');
    zip.file('word/document.xml', xml);
    return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  }

  // ---- DB helperlar ----

  private async regionName(id: number | null): Promise<string> {
    if (!id) return '';
    const [r] = await this.db
      .select({ name: regions.name })
      .from(regions)
      .where(eq(regions.id, id))
      .limit(1);
    return r?.name ?? '';
  }

  private async cityName(id: number | null): Promise<string> {
    const c = await this.cityRow(id);
    return c?.name ?? '';
  }

  private async cityRow(
    id: number | null,
  ): Promise<{ name: string | null; region_id: number | null } | undefined> {
    if (!id) return undefined;
    const [c] = await this.db
      .select({ name: cities.name, region_id: cities.region_id })
      .from(cities)
      .where(eq(cities.id, id))
      .limit(1);
    return c;
  }

  private async phones(workerId: number): Promise<string[]> {
    const rows = await this.db
      .select({ phone: worker_phones.phone })
      .from(worker_phones)
      .where(eq(worker_phones.worker_id, workerId));
    return rows
      .map((r) => (r.phone != null ? String(r.phone) : ''))
      .filter((p) => p !== '');
  }

  // ---- Format helperlar ----

  // Laravel address: org region nomi, "viloyati"→"v.", "shahri"→"sh.".
  private regionAbbrev(name: string): string {
    return name
      .replace(/viloyati/g, 'v.')
      .replace(/shahri/g, 'sh.')
      .trim();
  }

  // fullCurrentAddress / full_address — bo'sh bo'lmagan qismlarni vergul bilan.
  private joinAddress(parts: Array<string | null | undefined>): string {
    return parts.filter((p) => p && String(p).trim()).join(', ');
  }

  // Laravel Helper::phoneFormat (uzb) — "(XX)-XXX-XX-XX", vergul bilan.
  private phoneFormat(phones: string[]): string {
    return phones
      .map((p) => {
        const d = String(p).replace(/\D/g, '');
        if (d.length < 9) return p;
        return `(${d.slice(0, 2)})-${d.slice(2, 5)}-${d.slice(5, 7)}-${d.slice(7, 9)}`;
      })
      .join(',');
  }

  private commandTypeLabel(type: number | undefined): string {
    if (!type) return '';
    const val = this.i18n.t(`messages.command.types.${type}`, { lang: 'uz' });
    return typeof val === 'string' && !val.includes('messages.') ? val : '';
  }

  private fullName(
    last: string | null,
    first: string | null,
    middle: string | null,
  ): string {
    return [last, first, middle].filter((x) => x && x.trim()).join(' ');
  }

  private numberFormat(v: number | string | null | undefined): string {
    const n = Number(v);
    if (!Number.isFinite(n)) return '';
    return Math.trunc(n).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  private dateTex(d: string | null | undefined): string {
    if (!d) return '';
    const dt = new Date(`${d}T00:00:00Z`);
    if (isNaN(dt.getTime())) return '';
    return `${dt.getUTCFullYear()}-yil ${dt.getUTCDate()}-${UZ_MONTHS[dt.getUTCMonth()]}`;
  }

  private escapeXml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  // `${var}` placeholder'lar Word run'larga bo'lingani — bitta `<w:t>` ga normalize.
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
    // Har bir belgi qaysi `<w:t>` run'iga tegishli (default — o'z run'i).
    const owner = new Int32Array(fullText.length);
    let mi = 0;
    for (let i = 0; i < fullText.length; i++) {
      while (mi + 1 < matches.length && offsets[mi + 1] <= i) mi++;
      owner[i] = mi;
    }

    // Placeholder belgilarini uning BIRINCHI run'iga "ko'chiramiz".
    const phRe = /\$\{\/?([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
    let pm: RegExpExecArray | null;
    let changed = false;
    while ((pm = phRe.exec(fullText)) !== null) {
      const s = pm.index;
      const e = pm.index + pm[0].length - 1;
      if (owner[s] === owner[e]) continue;
      const fm = owner[s];
      for (let i = s; i <= e; i++) owner[i] = fm;
      changed = true;
    }
    if (!changed) return xml;

    // Yangi run matnlari — egalik bo'yicha to'planadi.
    const newTexts = matches.map(() => '');
    for (let i = 0; i < fullText.length; i++) newTexts[owner[i]] += fullText[i];

    // XML'ni qayta quramiz — har run'ni TESKARI tartibda almashtiramiz, shuning
    // uchun pozitsiyalar bir-biriga xalaqit qilmaydi (ustma-ust placeholderlar ham).
    let result = xml;
    for (let k = matches.length - 1; k >= 0; k--) {
      const mm = matches[k];
      const nt = newTexts[k];
      const attrs =
        nt !== mm.text && !mm.attrs.includes('xml:space')
          ? `${mm.attrs} xml:space="preserve"`
          : mm.attrs;
      result =
        result.slice(0, mm.start) +
        `<w:t${attrs}>${nt}</w:t>` +
        result.slice(mm.end);
    }
    return result;
  }
}
