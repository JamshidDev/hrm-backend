// HR ko'p ishchi resume'larini ZIP arxivga to'plovchi builder.
// Laravel: App\Jobs\HR\WorkersResumesZipJob.
//
// Oqim:
//   1. worker_positions (scope + ACTIVE + optional worker_ids) — uuid + worker info.
//   2. Har worker uchun ResumeService.generate(uuid) → docx buffer.
//   3. Agar passport=true bo'lsa, worker_passports MinIO fayllarini ham qo'shamiz.
//   4. PizZip orqali ZIP yaratamiz va MinIO'ga `tasks/zip/{name}.zip` joylab.

import { and, eq, inArray, sql } from 'drizzle-orm';
import PizZip from 'pizzip';
import type { DataSource } from '@/db/types';
import { worker_passports, worker_positions, workers } from '@/db/schema';
import { notDeleted } from '@/common/database/soft-delete.helper';
import type { MinioService } from '@/shared/minio/minio.service';
import type { ResumeService } from '@/modules/hr/worker-exports/resume.service';

const POSITION_STATUS_ACTIVE = 2;

export interface ResumesZipParams {
  orgScopeIds: number[];
  organizations?: string;
  organizationId?: number;
  workerIds?: number[]; // worker_positions.id filter (Laravel: ->whereIn('id',...))
  passport: boolean; // passport fayllarini ham qo'shish
}

/**
 * Asosiy builder — ZIP buffer qaytaradi. ExportTaskRunner uni MinIO'ga yuklaydi.
 */
export async function buildResumesZip(
  db: DataSource,
  minio: MinioService,
  resume: ResumeService,
  params: ResumesZipParams,
): Promise<Buffer> {
  // 1. Scope ichidagi worker_positions ni topamiz (uuid kerak resume.generate uchun).
  if (params.orgScopeIds.length === 0) {
    return new PizZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });
  }

  const orgConds: ReturnType<typeof eq>[] = [
    inArray(worker_positions.organization_id, params.orgScopeIds),
  ];
  if (params.organizations) {
    const extra = params.organizations
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);
    if (extra.length > 0) {
      orgConds.push(inArray(worker_positions.organization_id, extra));
    }
  }
  if (params.organizationId != null) {
    orgConds.push(eq(worker_positions.organization_id, params.organizationId));
  }

  const wpQuery = db
    .select({
      id: worker_positions.id,
      uuid: worker_positions.uuid,
      worker_id: worker_positions.worker_id,
      last_name: workers.last_name,
      first_name: workers.first_name,
      middle_name: workers.middle_name,
    })
    .from(worker_positions)
    .innerJoin(workers, eq(workers.id, worker_positions.worker_id))
    .where(
      and(
        notDeleted(worker_positions),
        eq(worker_positions.status, POSITION_STATUS_ACTIVE),
        notDeleted(workers),
        ...orgConds,
        params.workerIds && params.workerIds.length > 0
          ? inArray(worker_positions.id, params.workerIds)
          : undefined,
      ),
    );

  const wpRows = await wpQuery;
  if (wpRows.length === 0) {
    return new PizZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });
  }

  // 2. Har worker uchun resume yaratamiz. PARALLEL emas (DOCX template og'ir).
  const zip = new PizZip();
  let index = 0;
  for (const wp of wpRows) {
    index++;
    const shortName = buildShortName(
      wp.last_name,
      wp.first_name,
      wp.middle_name,
    );
    const docxFilename = `${index}.${shortName}.docx`;

    let docxBuffer: Buffer;
    try {
      const r = await resume.generate(wp.uuid);
      docxBuffer = r.buffer;
    } catch {
      // Worker uchun resume yaratilmasa — o'tib ketamiz.
      continue;
    }

    if (params.passport) {
      // Laravel: passport=true bo'lsa, worker ostida pasport fayllar bilan birga.
      // Subdirectory: `{index}.{shortName}/`
      const subdir = `${index}.${shortName}`;
      zip.file(`${subdir}/${docxFilename}`, docxBuffer);

      // Worker'ning pasport fayllarini MinIO'dan olib qo'shamiz.
      const passports = await db
        .select({ file: worker_passports.file })
        .from(worker_passports)
        .where(
          and(
            eq(worker_passports.worker_id, wp.worker_id!),
            notDeleted(worker_passports),
          ),
        );
      for (const p of passports) {
        if (!p.file) continue;
        try {
          const fileBuf = await minio.getObject(p.file);
          if (fileBuf) {
            const base = p.file.split('/').pop() ?? p.file;
            zip.file(`${subdir}/${base}`, fileBuf);
          }
        } catch {
          // pasport fayl yo'qolgan / o'qib bo'lmadi — skip.
        }
      }
    } else {
      zip.file(docxFilename, docxBuffer);
    }
  }

  return zip.generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

// Laravel `Worker::short_name()` ekvivalenti — "Lastname F.M." format.
function buildShortName(
  last: string | null,
  first: string | null,
  middle: string | null,
): string {
  const parts: string[] = [];
  if (last) parts.push(last);
  if (first) parts.push(`${first.charAt(0)}.`);
  if (middle) parts.push(`${middle.charAt(0)}.`);
  return sanitize(parts.join(' '));
}

// Fayl nomi xavfsiz qilish — slash/control belgilarsiz.
function sanitize(s: string): string {
  return s.replace(/[\\/:*?"<>|]+/g, '').trim() || 'worker';
}

// sql linter — to avoid unused import warning when not referenced directly.
void sql;
