// MedReplaceService — tibbiy ko'rik yo'llanmasi (med) DOCX shablonini to'ldiradi.
// Laravel: Med\MedController::sendToMed ichidagi TemplateProcessor mantig'i.
//
// Oqim: `resumes/med/template.docx` → ${placeholder}'lar to'ldiriladi →
//   ${photo} (xodim surati) va ${hr_signature} (QR kod) rasmlar joylanadi.
// commission_* / med_* placeholderlar to'ldirilmaydi (komissiya bosqichida).

import { Injectable } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { join } from 'path';
import PizZip from 'pizzip';
import QRCode from 'qrcode';
import { and, eq } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  departments,
  organizations,
  positions as positionsTable,
  users as usersTable,
  worker_positions,
  workers,
} from '@/db/schema';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { BusinessException } from '@/common/exceptions/business.exception';
import { MinioService } from '@/shared/minio/minio.service';
import {
  embedImageIntoZip,
  escapeXml,
  normalizePlaceholders,
} from '@/shared/docx/docx-template.util';

const UZ_MONTHS = [
  'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avgust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr',
];

export interface MedDocxParams {
  uuid: string;
  workerId: number;
  workerPositionId: number | null;
  departmentPositionId: number | null;
  hrUserId: number;
  hrPosition: string;
  number: number;
}

@Injectable()
export class MedReplaceService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly minio: MinioService,
  ) {}

  // HR (joriy foydalanuvchi)ning o'z tashkilotidagi qisqa lavozim nomi.
  // Laravel: $user->worker->positions->where('organization_id', org)->first().
  async resolveHrShortPosition(hrUserId: number): Promise<string> {
    const [u] = await this.db
      .select({
        worker_id: usersTable.worker_id,
        organization_id: usersTable.organization_id,
      })
      .from(usersTable)
      .where(eq(usersTable.id, hrUserId))
      .limit(1);
    if (!u?.worker_id || !u.organization_id) return '';

    const [wp] = await this.db
      .select({
        dept_name: departments.name,
        dept_level: departments.level,
        pos_name: positionsTable.name,
      })
      .from(worker_positions)
      .leftJoin(departments, eq(departments.id, worker_positions.department_id))
      .leftJoin(
        positionsTable,
        eq(positionsTable.id, worker_positions.position_id),
      )
      .where(
        and(
          eq(worker_positions.worker_id, u.worker_id),
          eq(worker_positions.organization_id, u.organization_id),
          notDeleted(worker_positions),
        ),
      )
      .limit(1);
    if (!wp) return '';
    return this.shortPosition(wp.dept_name, wp.dept_level, wp.pos_name);
  }

  // Med yo'llanma DOCX'ini hosil qiladi.
  async buildDocx(params: MedDocxParams): Promise<Buffer> {
    // 1) Yuborilayotgan xodim.
    const [worker] = await this.db
      .select({
        last_name: workers.last_name,
        first_name: workers.first_name,
        middle_name: workers.middle_name,
        birthday: workers.birthday,
        photo: workers.photo,
      })
      .from(workers)
      .where(eq(workers.id, params.workerId))
      .limit(1);
    if (!worker) {
      throw new BusinessException(404, 'worker_not_found');
    }

    // 2) Xodimning worker_position (post_name + position_date uchun).
    let postName = '';
    let positionExperience = this.formatDmy(new Date());
    if (params.workerPositionId) {
      const [wp] = await this.db
        .select({
          position_date: worker_positions.position_date,
          dept_name: departments.name,
          dept_level: departments.level,
          pos_name: positionsTable.name,
        })
        .from(worker_positions)
        .leftJoin(
          departments,
          eq(departments.id, worker_positions.department_id),
        )
        .leftJoin(
          positionsTable,
          eq(positionsTable.id, worker_positions.position_id),
        )
        .where(eq(worker_positions.id, params.workerPositionId))
        .limit(1);
      if (wp) {
        postName = this.shortPosition(wp.dept_name, wp.dept_level, wp.pos_name);
        if (wp.position_date) {
          positionExperience = this.formatDmy(new Date(wp.position_date));
        }
      }
    }

    // 3) HR foydalanuvchi — tashkilot, telefon, F.I.SH.
    const [hr] = await this.db
      .select({
        phone: usersTable.phone,
        org_full_name: organizations.full_name,
        worker_last: workers.last_name,
        worker_first: workers.first_name,
        worker_middle: workers.middle_name,
      })
      .from(usersTable)
      .leftJoin(workers, eq(workers.id, usersTable.worker_id))
      .leftJoin(organizations, eq(organizations.id, usersTable.organization_id))
      .where(eq(usersTable.id, params.hrUserId))
      .limit(1);

    const today = new Date();
    const fullName = this.fullName(
      worker.last_name,
      worker.first_name,
      worker.middle_name,
    );

    // 4) Scalar qiymatlar (Laravel setValues bilan bir xil).
    const scalars: Record<string, string> = {
      number: String(params.number),
      worker_full_name: fullName,
      birthday: worker.birthday ? this.formatDmy(new Date(worker.birthday)) : '',
      post_name: postName,
      position_experience: positionExperience,
      new_position: params.departmentPositionId ? 'a' : '',
      work_type: params.workerPositionId
        ? 'Ishlab turgan xodim'
        : 'Yangi ishga kirayotgan xodim',
      organization_name: hr?.org_full_name ?? '',
      organization_phones: this.phoneFormat(hr?.phone ?? null),
      hr_full_name: this.shortName(
        hr?.worker_last ?? null,
        hr?.worker_first ?? null,
        hr?.worker_middle ?? null,
      ),
      hr_position: params.hrPosition,
      created: this.dateTex(today),
    };

    // 5) Shablonni o'qib, to'ldirish.
    const templatePath = join(
      process.cwd(),
      'public',
      'resumes',
      'med',
      'template.docx',
    );
    const content = await readFile(templatePath);
    const zip = new PizZip(content);
    const xmlFile = zip.file('word/document.xml');
    if (!xmlFile) {
      throw new BusinessException(500, 'document.xml topilmadi');
    }
    let xml = normalizePlaceholders(xmlFile.asText());
    for (const [k, v] of Object.entries(scalars)) {
      xml = xml.split(`\${${k}}`).join(escapeXml(v));
    }

    // 6) QR kod — `${hr_signature}` (Laravel: convertQrCode).
    const qrText = `${fullName}\nhttps://hrm.railway.uz/v1/document/med/${params.uuid}`;
    const qrBuffer = await QRCode.toBuffer(qrText, {
      type: 'png',
      width: 200,
      margin: 0,
    });
    xml = embedImageIntoZip(zip, xml, {
      placeholder: 'hr_signature',
      buffer: qrBuffer,
      ext: 'png',
      mediaName: 'med_qr',
      relId: 'rId951',
      docPrId: 951,
      cx: 1143000, // 120px
      cy: 1524000, // 160px
    });

    // 7) Xodim surati — `${photo}`.
    const photoEmbedded = await this.embedWorkerPhoto(zip, xml, worker.photo);
    xml = photoEmbedded;

    zip.file('word/document.xml', xml);
    return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  }

  // Xodim suratini MinIO'dan yuklab, `${photo}` o'rniga joylaydi.
  private async embedWorkerPhoto(
    zip: PizZip,
    xml: string,
    photoKey: string | null,
  ): Promise<string> {
    if (!photoKey) {
      // Surat yo'q — placeholder'ni bo'shatamiz.
      return xml.split('${photo}').join('');
    }
    let buffer: Buffer;
    try {
      buffer = await this.minio.getObject(photoKey);
    } catch {
      return xml.split('${photo}').join('');
    }
    const ext = this.imageExt(photoKey);
    return embedImageIntoZip(zip, xml, {
      placeholder: 'photo',
      buffer,
      ext,
      mediaName: 'med_photo',
      relId: 'rId950',
      docPrId: 950,
      cx: 1076325, // 113px
      cy: 1419225, // 149px
    });
  }

  private imageExt(key: string): 'png' | 'jpg' | 'jpeg' {
    const e = key.split('.').pop()?.toLowerCase();
    if (e === 'png') return 'png';
    if (e === 'jpeg') return 'jpeg';
    return 'jpg';
  }

  // ---- formatlovchi yordamchilar ----

  // Laravel PositionHelper::getShortPosition.
  private shortPosition(
    deptName: string | null,
    deptLevel: number | null,
    posName: string | null,
  ): string {
    if (!posName) return '';
    let position = posName;
    if (deptLevel !== 1 && deptName) position = `${deptName} ${position}`;
    return position.charAt(0).toUpperCase() + position.slice(1);
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
      'Yu', 'YU', 'yu', 'Sh', 'SH', 'sh', 'Ch', 'CH', 'ch',
      "O'", "o'", "G'", "g'", 'Oʻ', 'oʻ', 'Gʻ', 'gʻ',
    ];
    const shorten = (name: string | null): string => {
      if (!name) return '';
      const two = name.slice(0, 2);
      return digraphs.includes(two) ? two : name.slice(0, 1);
    };
    return `${shorten(first)}.${shorten(middle)}.${last ?? ''}`;
  }

  // Laravel Helper::getDateTex — "2026-yil 20-may".
  private dateTex(d: Date): string {
    const month = UZ_MONTHS[d.getMonth()] ?? '';
    return `${d.getFullYear()}-yil ${d.getDate()}-${month}`;
  }

  // `dd.mm.yyyy`.
  private formatDmy(d: Date): string {
    return `${String(d.getDate()).padStart(2, '0')}.${String(
      d.getMonth() + 1,
    ).padStart(2, '0')}.${d.getFullYear()}`;
  }

  // Laravel Helper::formatUzPhoneNumber — "(XX)-XXX-XX-XX".
  private phoneFormat(phone: string | number | null): string {
    if (!phone) return '';
    const p = String(phone);
    if (p.length < 9) return p;
    return `(${p.slice(0, 2)})-${p.slice(2, 5)}-${p.slice(5, 7)}-${p.slice(7, 9)}`;
  }
}
