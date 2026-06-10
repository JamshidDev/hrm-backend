// WorkerApplicationReplaceService — ariza (worker-application) DOCX'ini hosil
// qiladi. Laravel: Modules\HR\Services\WorkerApplicationReplaceService.
//
// 10 tur (1–10). Template: public/resumes/worker-application/{type}.docx
// (org-template override YO'Q — Laravel public_path'dan o'qiydi). Sof setValue.

import { Injectable } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { join } from 'path';
import PizZip from 'pizzip';
import { and, desc, eq } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  cities,
  confirmation_workers,
  department_positions,
  departments,
  organizations,
  positions as positionsTable,
  regions,
  vacations,
  worker_positions,
  workers,
} from '@/db/schema';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { BusinessException } from '@/common/exceptions/business.exception';
import { I18nService } from 'nestjs-i18n';
import {
  getFullPosition,
  getShortPosition,
} from '@/modules/hr/_shared/position-helper';
import type { WorkerAppStoreDto } from '@/modules/confirmation/worker-application-extras/worker-application-extras.controller';

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

// ApplicationEducationTypeEnum::label(uz) — messages.education.types.
const EDUCATION_TYPE_UZ: Record<number, string> = {
  1: 'Oliy',
  2: 'O‘rta maxsus',
  3: 'O‘rta',
};

// VacationTypeEnum::get(uz) — messages.vacations.types.
const VACATION_TYPE_UZ: Record<number, string> = {
  1: "Mehnat ta'tili",
  2: "Homiladorlik va tug'ish ta'tili",
  3: "Bolani parvarishlash ta'tili",
  4: "O'quv ta'tili",
  5: "Ijodiy ta'tili",
  6: "Ish haqi saqlanmaydigan ta'til",
  7: "Ish haqi qisman saqlanadigan ta'til",
  8: "Boshqa turdagi ta'til",
};

interface DirectorInfo {
  organizationId: number;
  directorWorkerId: number | null;
  directorPosition: string | null;
}

@Injectable()
export class WorkerApplicationReplaceService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
  ) {}

  // Ariza DOCX'i + (org/director ma'lumotlari store uchun).
  async buildDocx(
    dto: WorkerAppStoreDto,
    userWorkerId: number | null,
  ): Promise<{ buffer: Buffer; director: DirectorInfo }> {
    // Director — ConfirmationWorker → worker + position + organization.
    const [director] = await this.db
      .select({
        position: confirmation_workers.position,
        worker_id: confirmation_workers.worker_id,
        organization_id: confirmation_workers.organization_id,
        d_last: workers.last_name,
        d_first: workers.first_name,
        d_middle: workers.middle_name,
        org_full_name: organizations.full_name,
      })
      .from(confirmation_workers)
      .leftJoin(workers, eq(workers.id, confirmation_workers.worker_id))
      .leftJoin(
        organizations,
        eq(organizations.id, confirmation_workers.organization_id),
      )
      .where(eq(confirmation_workers.id, dto.director_id))
      .limit(1);
    if (!director) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }

    const scalars: Record<string, string> = {
      director_short_name: this.shortName(
        director.d_first,
        director.d_middle,
        director.d_last,
      ),
      director_position: director.position ?? '',
      organization_name: director.org_full_name ?? '',
    };

    await this.applyType(dto, userWorkerId, scalars);

    const content = await readFile(
      join(
        process.cwd(),
        'public',
        'resumes',
        'worker-application',
        `${dto.type}.docx`,
      ),
    );
    return {
      buffer: this.fillTemplate(content, scalars),
      director: {
        organizationId: director.organization_id ?? 0,
        directorWorkerId: director.worker_id,
        directorPosition: director.position,
      },
    };
  }

  // ---- Tur bo'yicha setValue (Laravel switch) ----

  private async applyType(
    dto: WorkerAppStoreDto,
    userWorkerId: number | null,
    s: Record<string, string>,
  ): Promise<void> {
    switch (dto.type) {
      case 1:
        await this.typeApplicant(dto, userWorkerId, s, true);
        break;
      case 2:
        await this.typeTwo(dto, userWorkerId, s);
        break;
      case 3:
        await this.typeThree(dto, s);
        break;
      case 4:
        await this.typeWorkerPos(dto, s);
        this.vacationFour(dto, s);
        break;
      case 5:
        await this.typeWorkerPos(dto, s);
        s.vacation_date = `${this.dateTex(dto.from)}dan ${this.dateTex(dto.to)}gacha`;
        break;
      case 6:
      case 7:
        await this.typeWorkerPos(dto, s);
        await this.sixHelper(dto, s);
        break;
      case 8:
        await this.typeWorkerPos(dto, s);
        s.univer_date = this.dateTex(dto.univer_date);
        s.univer_number = dto.univer_number ? String(dto.univer_number) : '';
        s.education_type = EDUCATION_TYPE_UZ[dto.education_type ?? 1] ?? '';
        break;
      case 9:
        await this.typeWorkerPos(dto, s);
        s.reason = dto.reason ?? '';
        break;
      case 10:
        await this.typeWorkerPos(dto, s);
        s.reason = dto.reason ?? '';
        s.contract_to_date = this.dateTex(dto.contract_to_date);
        break;
    }
  }

  // Tur 1 — ariza beruvchi (user) + department_position (getFullPosition).
  private async typeApplicant(
    dto: WorkerAppStoreDto,
    userWorkerId: number | null,
    s: Record<string, string>,
    withPost: boolean,
  ): Promise<void> {
    const worker = await this.loadWorker(userWorkerId);
    s.worker_short_name = worker
      ? this.shortName(worker.first, worker.middle, worker.last)
      : '';
    s.worker_full_birthday_address = await this.fullBirthdayAddress(
      worker?.region_id ?? null,
      worker?.city_id ?? null,
    );
    s.from_date = this.dateTex(dto.from_date);
    s.rate = dto.rate != null ? String(dto.rate) : '1';
    if (withPost && dto.department_position_id) {
      s.post_name = await this.fullPositionByDeptPos(
        dto.department_position_id,
      );
    }
  }

  // Tur 2 — vaqtincha o'rinbosar yoki muddatli.
  private async typeTwo(
    dto: WorkerAppStoreDto,
    userWorkerId: number | null,
    s: Record<string, string>,
  ): Promise<void> {
    if (dto.contract_to_date) {
      s.reason = `${this.dateTex(dto.contract_to_date)} kuniga qadar`;
      return;
    }
    if (dto.temporarily_absent) {
      const [lastVac] = await this.db
        .select({ type: vacations.type })
        .from(vacations)
        .where(eq(vacations.worker_position_id, dto.temporarily_absent))
        .orderBy(desc(vacations.id))
        .limit(1);
      if (!lastVac) {
        throw new BusinessException(
          404,
          this.i18n.t('messages.worker.not_found'),
        );
      }
      // twoHelper — user worker + temporarily_absent lavozimi (getShortPosition).
      const worker = await this.loadWorker(userWorkerId);
      s.worker_short_name = worker
        ? this.shortName(worker.first, worker.middle, worker.last)
        : '';
      s.worker_full_birthday_address = await this.fullBirthdayAddress(
        worker?.region_id ?? null,
        worker?.city_id ?? null,
      );
      s.from_date = this.dateTex(dto.from_date);
      s.rate = dto.rate != null ? String(dto.rate) : '1';
      s.post_name = await this.shortPositionByWorkerPos(dto.temporarily_absent);
      s.reason = `${VACATION_TYPE_UZ[lastVac.type ?? 0] ?? ''}dan qaytguniga qadar`;
      return;
    }
    throw new BusinessException(404, this.i18n.t('messages.worker.not_found'));
  }

  // Tur 3 — workerPosition + ta'til sanalari (period_from/to SWAPPED — Laravel parity).
  private async typeThree(
    dto: WorkerAppStoreDto,
    s: Record<string, string>,
  ): Promise<void> {
    await this.typeWorkerPos(dto, s);
    const from = this.dateTex(dto.from);
    // Laravel: period_to = getDateTex(period_from); period_from = getDateTex(period_to)
    s.period_to = this.dateTex(dto.period_from);
    s.period_from = this.dateTex(dto.period_to);
    if (dto.to) {
      s.vacation_date = `${from}dan ${this.dateTex(dto.to)}gacha`;
    } else {
      s.vacation_date = `${this.dateTex(dto.from)}dan`;
    }
    s.reason = dto.reason ?? '';
  }

  // Tur 4 — ta'til sanasi matni (soat bilan).
  private vacationFour(
    dto: WorkerAppStoreDto,
    s: Record<string, string>,
  ): void {
    const from = this.dateTex(dto.from);
    let text = '';
    if (dto.to) {
      if (dto.to === dto.from) {
        text += `${from} kuni`;
        if (dto.from_time) text += `soat ${dto.from_time}dan `;
        if (dto.to_time) text += ` soat ${dto.to_time}gacha`;
      } else {
        const to = this.dateTex(dto.to);
        text += dto.from_time
          ? `${from} soat ${dto.from_time}dan `
          : `${from}dan `;
        text += dto.to_time ? `${to} soat ${dto.to_time}gacha` : `${to}gacha`;
      }
    } else {
      text += `${from} kuni`;
      if (dto.from_time) text += `soat ${dto.from_time}dan `;
      if (dto.to_time) text += ` soat ${dto.to_time}gacha`;
    }
    s.vacation_date = text;
  }

  // Tur 6/7 — yangi lavozim (getFullPosition) + from_date + reason.
  private async sixHelper(
    dto: WorkerAppStoreDto,
    s: Record<string, string>,
  ): Promise<void> {
    s.from_date = this.dateTex(dto.from_date);
    s.new_position = dto.department_position_id
      ? await this.fullPositionByDeptPos(dto.department_position_id)
      : '';
    s.reason = dto.reason ?? '';
  }

  // worker_position_id → worker_short_name + worker_position (post_name).
  private async typeWorkerPos(
    dto: WorkerAppStoreDto,
    s: Record<string, string>,
  ): Promise<void> {
    if (!dto.worker_position_id) {
      s.worker_short_name = '';
      s.worker_position = '';
      return;
    }
    const [wp] = await this.db
      .select({
        post_name: worker_positions.post_name,
        last: workers.last_name,
        first: workers.first_name,
        middle: workers.middle_name,
      })
      .from(worker_positions)
      .leftJoin(workers, eq(workers.id, worker_positions.worker_id))
      .where(
        and(
          eq(worker_positions.id, dto.worker_position_id),
          notDeleted(worker_positions),
        ),
      )
      .limit(1);
    s.worker_short_name = wp
      ? this.shortName(wp.first, wp.middle, wp.last)
      : '';
    s.worker_position = wp?.post_name ?? '';
  }

  // ---- Lavozim helperlar ----

  private async fullPositionByDeptPos(deptPosId: number): Promise<string> {
    const [dp] = await this.db
      .select({
        department_id: department_positions.department_id,
        position_id: department_positions.position_id,
        organization_id: department_positions.organization_id,
      })
      .from(department_positions)
      .where(eq(department_positions.id, deptPosId))
      .limit(1);
    if (!dp) return '';
    const shape = await this.positionShape(
      dp.position_id,
      dp.department_id,
      dp.organization_id,
    );
    return getFullPosition(shape);
  }

  private async shortPositionByWorkerPos(wpId: number): Promise<string> {
    const [wp] = await this.db
      .select({
        position_id: worker_positions.position_id,
        department_id: worker_positions.department_id,
        organization_id: worker_positions.organization_id,
      })
      .from(worker_positions)
      .where(eq(worker_positions.id, wpId))
      .limit(1);
    if (!wp) return '';
    const shape = await this.positionShape(
      wp.position_id,
      wp.department_id,
      wp.organization_id,
    );
    return getShortPosition(shape);
  }

  private async positionShape(
    positionId: number | null,
    departmentId: number | null,
    organizationId: number | null,
  ): Promise<{
    position_name: string | null;
    department_name: string | null;
    department_level: number | null;
    organization_full_name: string | null;
  }> {
    const positionName = positionId
      ? ((
          await this.db
            .select({ name: positionsTable.name })
            .from(positionsTable)
            .where(eq(positionsTable.id, positionId))
            .limit(1)
        )[0]?.name ?? null)
      : null;
    const dept = departmentId
      ? (
          await this.db
            .select({ name: departments.name, level: departments.level })
            .from(departments)
            .where(eq(departments.id, departmentId))
            .limit(1)
        )[0]
      : undefined;
    const orgName = organizationId
      ? ((
          await this.db
            .select({ full_name: organizations.full_name })
            .from(organizations)
            .where(eq(organizations.id, organizationId))
            .limit(1)
        )[0]?.full_name ?? null)
      : null;
    return {
      position_name: positionName,
      department_name: dept?.name ?? null,
      department_level: dept?.level ?? null,
      organization_full_name: orgName,
    };
  }

  // ---- DB helperlar ----

  private async loadWorker(workerId: number | null): Promise<
    | {
        last: string | null;
        first: string | null;
        middle: string | null;
        region_id: number | null;
        city_id: number | null;
      }
    | undefined
  > {
    if (!workerId) return undefined;
    const [w] = await this.db
      .select({
        last: workers.last_name,
        first: workers.first_name,
        middle: workers.middle_name,
        region_id: workers.region_id,
        city_id: workers.city_id,
      })
      .from(workers)
      .where(eq(workers.id, workerId))
      .limit(1);
    return w;
  }

  // Worker::fullBirthdayAddress — region nomi + shahar nomi (vergul bilan).
  private async fullBirthdayAddress(
    regionId: number | null,
    cityId: number | null,
  ): Promise<string> {
    const parts: string[] = [];
    if (regionId) {
      const [r] = await this.db
        .select({ name: regions.name })
        .from(regions)
        .where(eq(regions.id, regionId))
        .limit(1);
      if (r?.name) parts.push(r.name);
    }
    if (cityId) {
      const [c] = await this.db
        .select({ name: cities.name })
        .from(cities)
        .where(eq(cities.id, cityId))
        .limit(1);
      if (c?.name) parts.push(c.name);
    }
    return parts.join(', ');
  }

  // ---- Format helperlar ----

  // Worker::short_name — shorten(first).shorten(middle).last_name.
  // shorten: dastlabki 2 harf maxsus digraf (Sh, Ch, Oʻ, Gʻ, Yu...) bo'lsa 2,
  // aks holda 1 harf.
  private shortName(
    first: string | null,
    middle: string | null,
    last: string | null,
  ): string {
    const digraphs = new Set([
      'Yu',
      'YU',
      'SH',
      'sh',
      'Sh',
      'Ch',
      'CH',
      'ch',
      'yu',
      "O'",
      "o'",
      'O?',
      'o?',
      "G'",
      'G?',
      'g?',
      "g'",
      'Oʻ',
      'O’',
      'Gʻ',
      'G’',
      'oʻ',
      'o’',
      'gʻ',
      'g’',
    ]);
    const shorten = (name: string | null): string => {
      if (!name) return '';
      const two = name.substring(0, 2);
      return digraphs.has(two) ? two : name.substring(0, 1);
    };
    return `${shorten(first)}.${shorten(middle)}.${last ?? ''}`;
  }

  private dateTex(d: string | null | undefined): string {
    if (!d) return '';
    const dt = new Date(`${d}T00:00:00Z`);
    if (isNaN(dt.getTime())) return '';
    return `${dt.getUTCFullYear()}-yil ${dt.getUTCDate()}-${UZ_MONTHS[dt.getUTCMonth()]}`;
  }

  // ---- Template engine (scalar) ----

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
    xml = xml.split('‑').join('-');
    xml = xml.replace(/<w:noBreakHyphen\s*\/>/g, '<w:t>-</w:t>');
    zip.file('word/document.xml', xml);
    return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  }

  private escapeXml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  // `${var}` Word run'larga bo'lingani — belgi-egalik (char-ownership) bilan
  // bitta run'ga normalize (ustma-ust placeholderlarga bardosh).
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

    const owner = new Int32Array(fullText.length);
    let mi = 0;
    for (let i = 0; i < fullText.length; i++) {
      while (mi + 1 < matches.length && offsets[mi + 1] <= i) mi++;
      owner[i] = mi;
    }

    const phRe = /\$\{\/?([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
    let pm: RegExpExecArray | null;
    let changed = false;
    while ((pm = phRe.exec(fullText)) !== null) {
      const startIdx = pm.index;
      const endIdx = pm.index + pm[0].length - 1;
      if (owner[startIdx] === owner[endIdx]) continue;
      const fm = owner[startIdx];
      for (let i = startIdx; i <= endIdx; i++) owner[i] = fm;
      changed = true;
    }
    if (!changed) return xml;

    const newTexts = matches.map(() => '');
    for (let i = 0; i < fullText.length; i++) newTexts[owner[i]] += fullText[i];

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
