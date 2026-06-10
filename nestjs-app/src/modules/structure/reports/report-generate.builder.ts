// Report generate builder — POST /api/v1/structure/report/generate.
// Laravel: ReportController::generate + ReportService::generate.
//
// O'tgan oy (now - 1 oy) uchun tanlangan tashkilotlar bo'yicha hisobot yaratadi:
//   1. Amaldagi xodimlar statistikasi (worker_positions agregatsiyasi).
//   2. Tasdiqlangan shtat birliklari (department_positions SUM(rate)).
//   3. Oylik qabul statistikasi (monthHiringFull — contracts + universities).
//   4. Oylik bekor qilish statistikasi (monthTerminationFull — commands).
//   5. Qabul qilingan xodimlar kontrakt tafsilotlari.
// So'ng Report + ReportDetail yozuvlari yaratiladi (data jsonb sifatida saqlanadi).

import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { DataSource } from '@/db/types';
import {
  commands,
  organizations,
  positions,
  report_details,
  report_moth_pers,
  reports,
  specialities,
  universities,
  worker_positions,
  worker_universities,
  workers,
} from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { buildReportStats } from '@/modules/structure/reports/report-labels.constant';

// ============================================================
// TIPLAR
// ============================================================

export interface ReportGenerateParams {
  userId: number;
  userOrganizationId: number;
  organizationIds: number[];
  // EducationEnum.get() — education(1/2/3) => label.
  educationLabels: Record<number, string>;
  // ContractTypeEnum.getMinimized() — type(1..6) => qisqa label.
  contractTypeLabels: Record<number, string>;
}

interface ContractDetail {
  id: number;
  organization: string | null;
  full_name: string;
  birthday: string | null;
  position_name: string | null;
  educations: string;
  old_organization_name: string | null;
  old_position_name: string | null;
  old_position_date: string | null;
  command: string;
  command_reason: string;
  type: string;
}

interface ReportDetailPayload {
  organization_id: number;
  organization_name: string | null;
  stats: Array<{ key: string; value: unknown }>;
  contracts: ContractDetail[];
}

export interface ReportGenerateResult {
  report: typeof reports.$inferSelect | null;
  data: Array<{ reportId: number; data: ReportDetailPayload }>;
}

// ============================================================
// PUBLIC
// ============================================================

export async function generateReport(
  db: DataSource,
  params: ReportGenerateParams,
): Promise<ReportGenerateResult> {
  const { userId, userOrganizationId, organizationIds } = params;

  // Laravel: now()->subMonth() — o'tgan oy.
  const now = new Date();
  let month = now.getMonth(); // 0-asosli → joriy oy - 1
  let year = now.getFullYear();
  if (month < 1) {
    month = 12;
    year -= 1;
  }

  if (organizationIds.length === 0) {
    return { report: null, data: [] };
  }

  // Laravel: joriy oy uchun org'da imzolangan (SUCCESS) hisobot bo'lsa — xato.
  const [signed] = await db
    .select({ id: reports.id })
    .from(reports)
    .where(
      and(
        inArray(reports.organization_id, organizationIds),
        eq(reports.year, year),
        eq(reports.month, month),
        eq(reports.confirmation, 3),
        isNull(reports.deleted_at),
      ),
    )
    .limit(1);
  if (signed) {
    // Laravel: imzolangan hisobot bo'lsa ham, foydalanuvchi tashkiloti uchun shu
    // davrga ReportMothPer ruxsati MAVJUD BO'LMASA'gina xato tashlanadi.
    const [monthPer] = await db
      .select({ id: report_moth_pers.id })
      .from(report_moth_pers)
      .where(
        and(
          eq(report_moth_pers.organization_id, userOrganizationId),
          eq(report_moth_pers.year, year),
          eq(report_moth_pers.month, month),
        ),
      )
      .limit(1);
    if (!monthPer) {
      throw new BusinessException(
        400,
        'Ushbu tashkilotda joriy oy uchun hisobot allaqachon imzolangan!',
      );
    }
  }

  // 1-5. Parallel agregatsiyalar.
  const [workerStats, approvedStats, createdStats, deletedStats, orgRows] =
    await Promise.all([
      fetchWorkerStats(db, organizationIds),
      fetchApprovedStats(db, organizationIds),
      fetchMonthHiring(db, organizationIds, month, year),
      fetchMonthTermination(db, organizationIds, month, year),
      db
        .select({ id: organizations.id, name: organizations.name })
        .from(organizations)
        .where(inArray(organizations.id, organizationIds)),
    ]);

  const orgNameById = new Map<number, string | null>();
  for (const o of orgRows) orgNameById.set(o.id, o.name);

  const contractsByOrg = await fetchContractDetails(
    db,
    organizationIds,
    month,
    year,
    orgNameById,
    params.educationLabels,
    params.contractTypeLabels,
  );

  // Report — user_id/year/month/organization_id bo'yicha topiladi yoki yaratiladi.
  const report = await findOrCreateReport(
    db,
    userId,
    userOrganizationId,
    year,
    month,
  );

  // Eski detallar — hard delete (Laravel forceDelete).
  await db
    .delete(report_details)
    .where(eq(report_details.report_id, report.id));

  const result: ReportGenerateResult['data'] = [];
  for (const orgId of organizationIds) {
    const workers = workerStats.get(orgId);
    const stat = {
      ...(createdStats.get(orgId) ?? {}),
      ...(deletedStats.get(orgId) ?? {}),
    };
    const approved = approvedStats.get(orgId) ?? 0;
    const active = num(workers?.total_rate);
    const vacancies = Math.max(0, approved - active);

    const statValues: Record<string, unknown> = {
      all_rate: numberFormat(approved / 100, 2),
      workers_count: num(workers?.total),
      men: num(workers?.men),
      women: num(workers?.women),
      vacancies: numberFormat(vacancies / 100, 2),
      part_time_contract: num(workers?.part_time_contract),
      month_created: num(stat.month_created),
      month_updated: num(stat.month_updated),
      month_updated_men: num(stat.month_updated_men),
      month_updated_women: num(stat.month_updated_women),
      month_other_created: num(stat.month_other_created),
      month_other_created_men: num(stat.month_other_created_men),
      month_other_created_women: num(stat.month_other_created_women),
      month_created_30: num(stat.month_created_30),
      month_created_univer: num(stat.month_created_univer),
      month_created_tex: num(stat.month_created_tex),
      month_created_other_univer: num(stat.month_created_other_univer),
      month_created_coll: num(stat.month_created_coll),
      month_created_school: num(stat.month_created_school),
      month_created_band: num(stat.month_created_band),
      month_deleted: num(stat.month_deleted),
      higher_count: num(workers?.higher_count),
      higher_men_count: num(workers?.higher_men_count),
      higher_women_count: num(workers?.higher_women_count),
      special_count: num(workers?.special_count),
      special_men_count: num(workers?.special_men_count),
      special_women_count: num(workers?.special_women_count),
      middle_count: num(workers?.middle_count),
      middle_men_count: num(workers?.middle_men_count),
      middle_women_count: num(workers?.middle_women_count),
      age_under_30: num(workers?.age_under_30),
      age_under_30_men: num(workers?.age_under_30_men),
      age_under_30_women: num(workers?.age_under_30_women),
      age_31_45: num(workers?.age_31_45),
      age_31_45_men: num(workers?.age_31_45_men),
      age_31_45_women: num(workers?.age_31_45_women),
      age_46_plus: num(workers?.age_46_plus),
      age_46_plus_men: num(workers?.age_46_plus_men),
      age_46_plus_women: num(workers?.age_46_plus_women),
      pension_age_count: num(workers?.pension_age_count),
      pension_count_men: num(workers?.pension_count_men),
      pension_count_women: num(workers?.pension_count_women),
      vacation_count: num(workers?.vacation_count),
      vacation_count_men: num(workers?.vacation_count_men),
      vacation_count_women: num(workers?.vacation_count_women),
      disability_count: num(workers?.disability_count),
      disability_men_count: num(workers?.disability_men_count),
      disability_women_count: num(workers?.disability_women_count),
    };

    const payload: ReportDetailPayload = {
      organization_id: orgId,
      organization_name: orgNameById.get(orgId) ?? null,
      stats: buildReportStats(statValues),
      contracts: contractsByOrg.get(orgId) ?? [],
    };

    const [detail] = await db
      .insert(report_details)
      .values({
        organization_id: orgId,
        report_id: report.id,
        data: payload,
        created_at: sql`NOW()`,
        updated_at: sql`NOW()`,
      })
      .returning({ id: report_details.id });

    result.push({ reportId: detail.id, data: payload });
  }

  return { report, data: result };
}

// ============================================================
// REPORT — find-or-create (Laravel updateOrCreate + boot creating)
// ============================================================

async function findOrCreateReport(
  db: DataSource,
  userId: number,
  organizationId: number,
  year: number,
  month: number,
): Promise<typeof reports.$inferSelect> {
  const [existing] = await db
    .select()
    .from(reports)
    .where(
      and(
        eq(reports.user_id, userId),
        eq(reports.year, year),
        eq(reports.month, month),
        eq(reports.organization_id, organizationId),
        isNull(reports.deleted_at),
      ),
    )
    .limit(1);
  if (existing) return existing;

  // Laravel Report::boot() creating — uuid + file + confirmation_file.
  const uuid = randomUUID();
  const [created] = await db
    .insert(reports)
    .values({
      uuid,
      user_id: userId,
      organization_id: organizationId,
      year,
      month,
      file: `report/${uuid}.docx`,
      confirmation_file: `documents/report/${uuid}.pdf`,
      created_at: sql`NOW()`,
      updated_at: sql`NOW()`,
    })
    .returning();
  return created;
}

// ============================================================
// 1. WORKER STATS — amaldagi xodimlar agregatsiyasi
// ============================================================

async function fetchWorkerStats(
  db: DataSource,
  orgIds: number[],
): Promise<Map<number, Record<string, unknown>>> {
  const ids = idList(orgIds);
  const result = await db.execute(sql`
    SELECT
      wp.organization_id,
      COUNT(DISTINCT w.id) FILTER (WHERE wp.type IN (1, 6, 3)) as total,
      SUM(wp.rate) FILTER (WHERE wp.type IN (1, 6, 3)) as total_rate,
      COUNT(DISTINCT w.id) FILTER (WHERE w.sex = '1' AND wp.type IN (1, 6, 3)) as men,
      COUNT(DISTINCT w.id) FILTER (WHERE w.sex = '0' AND wp.type IN (1, 6, 3)) as women,
      COUNT(DISTINCT w.id) FILTER (WHERE c.type = 2) as part_time_contract,
      COUNT(DISTINCT w.id) FILTER (WHERE w.education = 1 AND wp.type IN (1, 6, 3)) as higher_count,
      COUNT(DISTINCT w.id) FILTER (WHERE w.education = 1 AND w.sex = '1' AND wp.type IN (1, 6, 3)) as higher_men_count,
      COUNT(DISTINCT w.id) FILTER (WHERE w.education = 1 AND w.sex = '0' AND wp.type IN (1, 6, 3)) as higher_women_count,
      COUNT(DISTINCT w.id) FILTER (WHERE w.education = 2 AND wp.type IN (1, 6, 3)) as special_count,
      COUNT(DISTINCT w.id) FILTER (WHERE w.education = 2 AND w.sex = '1' AND wp.type IN (1, 6, 3)) as special_men_count,
      COUNT(DISTINCT w.id) FILTER (WHERE w.education = 2 AND w.sex = '0' AND wp.type IN (1, 6, 3)) as special_women_count,
      COUNT(DISTINCT w.id) FILTER (WHERE w.education = 3 AND wp.type IN (1, 6, 3)) as middle_count,
      COUNT(DISTINCT w.id) FILTER (WHERE w.education = 3 AND w.sex = '1' AND wp.type IN (1, 6, 3)) as middle_men_count,
      COUNT(DISTINCT w.id) FILTER (WHERE w.education = 3 AND w.sex = '0' AND wp.type IN (1, 6, 3)) as middle_women_count,
      COUNT(DISTINCT w.id) FILTER (
        WHERE w.birthday >= CURRENT_DATE - INTERVAL '30 years' AND wp.type IN (1, 6, 3)
      ) as age_under_30,
      COUNT(DISTINCT w.id) FILTER (
        WHERE w.birthday >= CURRENT_DATE - INTERVAL '30 years' AND wp.type IN (1, 6, 3) AND w.sex = true
      ) as age_under_30_men,
      COUNT(DISTINCT w.id) FILTER (
        WHERE w.birthday >= CURRENT_DATE - INTERVAL '30 years' AND wp.type IN (1, 6, 3) AND w.sex = false
      ) as age_under_30_women,
      COUNT(DISTINCT w.id) FILTER (
        WHERE w.birthday < CURRENT_DATE - INTERVAL '30 years' AND wp.type IN (1, 6, 3)
          AND w.birthday >= CURRENT_DATE - INTERVAL '45 years'
      ) as age_31_45,
      COUNT(DISTINCT w.id) FILTER (
        WHERE w.birthday < CURRENT_DATE - INTERVAL '30 years' AND wp.type IN (1, 6, 3)
          AND w.birthday >= CURRENT_DATE - INTERVAL '45 years' AND w.sex = true
      ) as age_31_45_men,
      COUNT(DISTINCT w.id) FILTER (
        WHERE w.birthday < CURRENT_DATE - INTERVAL '30 years' AND wp.type IN (1, 6, 3)
          AND w.birthday >= CURRENT_DATE - INTERVAL '45 years' AND w.sex = false
      ) as age_31_45_women,
      COUNT(DISTINCT w.id) FILTER (
        WHERE w.birthday < CURRENT_DATE - INTERVAL '45 years' AND wp.type IN (1, 6, 3)
      ) as age_46_plus,
      COUNT(DISTINCT w.id) FILTER (
        WHERE w.birthday < CURRENT_DATE - INTERVAL '45 years' AND wp.type IN (1, 6, 3) AND w.sex = true
      ) as age_46_plus_men,
      COUNT(DISTINCT w.id) FILTER (
        WHERE w.birthday < CURRENT_DATE - INTERVAL '45 years' AND wp.type IN (1, 6, 3) AND w.sex = false
      ) as age_46_plus_women,
      COUNT(DISTINCT w.id) FILTER (
        WHERE (
          (w.sex = '1' AND DATE_PART('year', AGE(w.birthday)) >= 60) AND wp.type IN (1, 6, 3)
          OR (w.sex = '0' AND DATE_PART('year', AGE(w.birthday)) >= 55) AND wp.type IN (1, 6, 3)
        )
      ) as pension_age_count,
      COUNT(DISTINCT w.id) FILTER (
        WHERE w.sex = '1' AND DATE_PART('year', AGE(w.birthday)) >= 60 AND wp.type IN (1, 6, 3)
      ) as pension_count_men,
      COUNT(DISTINCT w.id) FILTER (
        WHERE w.sex = '0' AND DATE_PART('year', AGE(w.birthday)) >= 55 AND wp.type IN (1, 6, 3)
      ) as pension_count_women,
      COUNT(DISTINCT w.id) FILTER (WHERE wd.id IS NOT NULL AND wp.type IN (1, 6, 3)) as disability_count,
      COUNT(DISTINCT w.id) FILTER (WHERE wd.id IS NOT NULL AND w.sex = '1' AND wp.type IN (1, 6, 3)) as disability_men_count,
      COUNT(DISTINCT w.id) FILTER (WHERE wd.id IS NOT NULL AND w.sex = '0' AND wp.type IN (1, 6, 3)) as disability_women_count,
      COUNT(DISTINCT w.id) FILTER (WHERE v.id IS NOT NULL AND v.type IN (45, 46, 49) AND wp.type IN (1, 6, 3)) as vacation_count,
      COUNT(DISTINCT w.id) FILTER (WHERE v.id IS NOT NULL AND v.type IN (45, 46, 49) AND w.sex = '1' AND wp.type IN (1, 6, 3)) as vacation_count_men,
      COUNT(DISTINCT w.id) FILTER (WHERE v.id IS NOT NULL AND v.type IN (45, 46, 49) AND w.sex = '0' AND wp.type IN (1, 6, 3)) as vacation_count_women
    FROM worker_positions wp
    JOIN workers w ON w.id = wp.worker_id
    JOIN contracts c ON c.id = wp.contract_id
    LEFT JOIN worker_disabilities wd
      ON wd.worker_id = w.id
     AND wd.deleted_at IS NULL
     AND (wd."from" IS NULL OR wd."from" <= CURRENT_DATE)
     AND (wd."to" IS NULL OR wd."to" >= CURRENT_DATE)
    LEFT JOIN vacations v
      ON v.worker_id = w.id
     AND v.contract_id = c.id
     AND v.deleted_at IS NULL
     AND v."to" >= CURRENT_DATE
    WHERE wp.status = 2
      AND wp.deleted_at IS NULL
      AND c.deleted_at IS NULL
      AND wp.contract_position = true
      AND wp.organization_id IN (${ids})
    GROUP BY wp.organization_id
  `);

  const map = new Map<number, Record<string, unknown>>();
  for (const r of rowsOf(result)) {
    map.set(num(r.organization_id), r);
  }
  return map;
}

// ============================================================
// 2. APPROVED STATS — tasdiqlangan shtat birliklari
// ============================================================

async function fetchApprovedStats(
  db: DataSource,
  orgIds: number[],
): Promise<Map<number, number>> {
  const ids = idList(orgIds);
  const result = await db.execute(sql`
    SELECT organization_id, COALESCE(SUM(rate), 0) as approved
    FROM department_positions
    WHERE organization_id IN (${ids})
      AND deleted_at IS NULL
    GROUP BY organization_id
  `);
  const map = new Map<number, number>();
  for (const r of rowsOf(result)) {
    map.set(num(r.organization_id), num(r.approved));
  }
  return map;
}

// ============================================================
// 3. MONTH HIRING — Laravel monthHiringFull()
// ============================================================

async function fetchMonthHiring(
  db: DataSource,
  orgIds: number[],
  month: number,
  year: number,
): Promise<Map<number, Record<string, unknown>>> {
  const ids = idList(orgIds);
  // $univerId = 1 (TDTrU).
  const result = await db.execute(sql`
    WITH mc AS (
      SELECT c.organization_id, c.worker_id, MIN(c.contract_date) as hired_at
      FROM contracts c
      WHERE c.organization_id IN (${ids})
        AND EXTRACT(MONTH FROM c.contract_date) = ${month}
        AND EXTRACT(YEAR FROM c.contract_date) = ${year}
        AND c.confirmation = 3
        AND c.deleted_at IS NULL
        AND c.worker_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM worker_positions wp
          WHERE wp.contract_id = c.id
            AND wp.contract_position = true
            AND wp.status = 2
            AND wp.deleted_at IS NULL
        )
      GROUP BY c.organization_id, c.worker_id
    )
    SELECT
      mc.organization_id,
      COUNT(*) as month_created,
      COUNT(*) FILTER (
        WHERE EXISTS (
          SELECT 1 FROM contracts old_c
          WHERE old_c.worker_id = mc.worker_id
            AND old_c.deleted_at IS NULL
            AND old_c.contract_date < mc.hired_at
        )
      ) as month_updated,
      COUNT(*) FILTER (
        WHERE EXISTS (
          SELECT 1 FROM contracts old_c
          WHERE old_c.worker_id = mc.worker_id
            AND old_c.deleted_at IS NULL
            AND old_c.contract_date < mc.hired_at
        ) AND w.sex = '1'
      ) as month_updated_men,
      COUNT(*) FILTER (
        WHERE EXISTS (
          SELECT 1 FROM contracts old_c
          WHERE old_c.worker_id = mc.worker_id
            AND old_c.deleted_at IS NULL
            AND old_c.contract_date < mc.hired_at
        ) AND w.sex = '0'
      ) as month_updated_women,
      COUNT(*) FILTER (
        WHERE NOT EXISTS (
          SELECT 1 FROM contracts old_c
          WHERE old_c.worker_id = mc.worker_id
            AND old_c.deleted_at IS NULL
            AND old_c.contract_date < mc.hired_at
        )
      ) as month_other_created,
      COUNT(*) FILTER (
        WHERE NOT EXISTS (
          SELECT 1 FROM contracts old_c
          WHERE old_c.worker_id = mc.worker_id
            AND old_c.deleted_at IS NULL
            AND old_c.contract_date < mc.hired_at
        ) AND w.sex = '1'
      ) as month_other_created_men,
      COUNT(*) FILTER (
        WHERE NOT EXISTS (
          SELECT 1 FROM contracts old_c
          WHERE old_c.worker_id = mc.worker_id
            AND old_c.deleted_at IS NULL
            AND old_c.contract_date < mc.hired_at
        ) AND w.sex = '0'
      ) as month_other_created_women,
      COUNT(*) FILTER (
        WHERE DATE_PART('year', AGE(w.birthday)) < 30
      ) as month_created_30,
      COUNT(*) FILTER (
        WHERE EXISTS (
          SELECT 1 FROM worker_universities wu
          JOIN universities u ON u.id = wu.university_id
          WHERE wu.worker_id = mc.worker_id
            AND wu.deleted_at IS NULL
            AND u.deleted_at IS NULL
            AND u.type = 1
            AND u.id = 1
        )
      ) as month_created_univer,
      COUNT(*) FILTER (
        WHERE EXISTS (
          SELECT 1 FROM worker_universities wu
          JOIN universities u ON u.id = wu.university_id
          WHERE wu.worker_id = mc.worker_id
            AND wu.deleted_at IS NULL
            AND u.deleted_at IS NULL
            AND u.type = 3
        )
      ) as month_created_tex,
      COUNT(*) FILTER (
        WHERE EXISTS (
          SELECT 1 FROM worker_universities wu
          JOIN universities u ON u.id = wu.university_id
          WHERE wu.worker_id = mc.worker_id
            AND wu.deleted_at IS NULL
            AND u.deleted_at IS NULL
            AND u.type = 1
            AND u.id <> 1
        )
      ) as month_created_other_univer,
      COUNT(*) FILTER (
        WHERE EXISTS (
          SELECT 1 FROM worker_universities wu
          JOIN universities u ON u.id = wu.university_id
          WHERE wu.worker_id = mc.worker_id
            AND wu.deleted_at IS NULL
            AND u.deleted_at IS NULL
            AND u.type = 2
        )
      ) as month_created_coll,
      COUNT(*) FILTER (
        WHERE NOT EXISTS (
          SELECT 1 FROM worker_universities wu
          WHERE wu.worker_id = mc.worker_id
            AND wu.deleted_at IS NULL
        )
      ) as month_created_school,
      0 as month_created_band
    FROM mc
    JOIN workers w ON w.id = mc.worker_id
    GROUP BY mc.organization_id
  `);

  const map = new Map<number, Record<string, unknown>>();
  for (const r of rowsOf(result)) {
    map.set(num(r.organization_id), r);
  }
  return map;
}

// ============================================================
// 4. MONTH TERMINATION — Laravel monthTerminationFull()
// ============================================================

async function fetchMonthTermination(
  db: DataSource,
  orgIds: number[],
  month: number,
  year: number,
): Promise<Map<number, Record<string, unknown>>> {
  const ids = idList(orgIds);
  // CommandTypeEnum THIRTY_ONE..THIRTY_NINE = 31..39.
  const result = await db.execute(sql`
    SELECT cmd.organization_id, COUNT(DISTINCT cmd.command_number) as month_deleted
    FROM commands cmd
    WHERE cmd.organization_id IN (${ids})
      AND cmd.type IN (31, 32, 33, 34, 35, 36, 37, 38, 39)
      AND EXTRACT(MONTH FROM cmd.command_date) = ${month}
      AND EXTRACT(YEAR FROM cmd.command_date) = ${year}
      AND cmd.confirmation = 3
      AND cmd.deleted_at IS NULL
    GROUP BY cmd.organization_id
  `);
  const map = new Map<number, Record<string, unknown>>();
  for (const r of rowsOf(result)) {
    map.set(num(r.organization_id), r);
  }
  return map;
}

// ============================================================
// 5. CONTRACT DETAILS — qabul qilingan xodimlar kontraktlari
// ============================================================

async function fetchContractDetails(
  db: DataSource,
  orgIds: number[],
  month: number,
  year: number,
  orgNameById: Map<number, string | null>,
  educationLabels: Record<number, string>,
  contractTypeLabels: Record<number, string>,
): Promise<Map<number, ContractDetail[]>> {
  const ids = idList(orgIds);
  // Contract::whereHas('contract_position') — contract_position'li kontraktlar.
  const contractResult = await db.execute(sql`
    SELECT c.id, c.organization_id, c.worker_id, c.type
    FROM contracts c
    WHERE c.organization_id IN (${ids})
      AND EXTRACT(MONTH FROM c.contract_date) = ${month}
      AND EXTRACT(YEAR FROM c.contract_date) = ${year}
      AND c.deleted_at IS NULL
      AND EXISTS (
        SELECT 1 FROM worker_positions wp
        WHERE wp.contract_id = c.id
          AND wp.contract_position = true
          AND wp.deleted_at IS NULL
      )
    ORDER BY c.id ASC
  `);

  const contractRows = rowsOf(contractResult).map((r) => ({
    id: num(r.id),
    organization_id: num(r.organization_id),
    worker_id: r.worker_id == null ? null : num(r.worker_id),
    type: num(r.type),
  }));

  const byOrg = new Map<number, ContractDetail[]>();
  if (contractRows.length === 0) return byOrg;

  const contractIds = contractRows.map((c) => c.id);
  const workerIds = [
    ...new Set(
      contractRows
        .map((c) => c.worker_id)
        .filter((id): id is number => id != null),
    ),
  ];

  // Batch: workers, universities, contract_position, all_positions, commands.
  const [workerRows, uniRows, cpRows, apRows, cmdRows] = await Promise.all([
    workerIds.length
      ? db
          .select({
            id: workers.id,
            last_name: workers.last_name,
            first_name: workers.first_name,
            middle_name: workers.middle_name,
            birthday: workers.birthday,
            education: workers.education,
          })
          .from(workers)
          .where(inArray(workers.id, workerIds))
      : Promise.resolve([]),
    workerIds.length
      ? db
          .select({
            worker_id: worker_universities.worker_id,
            to_date: worker_universities.to_date,
            uni_name: universities.name,
            spec_name: specialities.name,
          })
          .from(worker_universities)
          .leftJoin(
            universities,
            eq(universities.id, worker_universities.university_id),
          )
          .leftJoin(
            specialities,
            eq(specialities.id, worker_universities.speciality_id),
          )
          .where(
            and(
              inArray(worker_universities.worker_id, workerIds),
              isNull(worker_universities.deleted_at),
            ),
          )
          .orderBy(asc(worker_universities.id))
      : Promise.resolve([]),
    db
      .select({
        contract_id: worker_positions.contract_id,
        position_name: positions.name,
      })
      .from(worker_positions)
      .leftJoin(positions, eq(positions.id, worker_positions.position_id))
      .where(
        and(
          inArray(worker_positions.contract_id, contractIds),
          eq(worker_positions.contract_position, true),
          isNull(worker_positions.deleted_at),
        ),
      ),
    workerIds.length
      ? db
          .select({
            worker_id: worker_positions.worker_id,
            contract_id: worker_positions.contract_id,
            to: worker_positions.to,
            org_name: organizations.name,
            pos_name: positions.name,
          })
          .from(worker_positions)
          .leftJoin(
            organizations,
            and(
              eq(organizations.id, worker_positions.organization_id),
              isNull(organizations.deleted_at),
            ),
          )
          .leftJoin(positions, eq(positions.id, worker_positions.position_id))
          .where(
            and(
              inArray(worker_positions.worker_id, workerIds),
              isNull(worker_positions.deleted_at),
            ),
          )
          .orderBy(
            desc(worker_positions.position_date),
            asc(worker_positions.id),
          )
      : Promise.resolve([]),
    db
      .select({
        contract_model_id: commands.contract_model_id,
        command_number: commands.command_number,
        command_date: commands.command_date,
      })
      .from(commands)
      .where(
        and(
          eq(commands.contract_model_type, 'Modules\\HR\\Models\\Contract'),
          inArray(commands.contract_model_id, contractIds),
          isNull(commands.deleted_at),
        ),
      ),
  ]);

  // Map'lar.
  const workerById = new Map<number, (typeof workerRows)[number]>();
  for (const w of workerRows) workerById.set(w.id, w);

  const uniByWorker = new Map<number, (typeof uniRows)[number][]>();
  for (const u of uniRows) {
    const arr = uniByWorker.get(u.worker_id) ?? [];
    arr.push(u);
    uniByWorker.set(u.worker_id, arr);
  }

  // contract_position — kontrakt bo'yicha birinchisi.
  const positionByContract = new Map<number, string | null>();
  for (const cp of cpRows) {
    if (cp.contract_id != null && !positionByContract.has(cp.contract_id)) {
      positionByContract.set(cp.contract_id, cp.position_name);
    }
  }

  // all_positions — xodim bo'yicha (position_date DESC tartibida).
  const positionsByWorker = new Map<number, (typeof apRows)[number][]>();
  for (const ap of apRows) {
    if (ap.worker_id == null) continue;
    const arr = positionsByWorker.get(ap.worker_id) ?? [];
    arr.push(ap);
    positionsByWorker.set(ap.worker_id, arr);
  }

  // command — kontrakt bo'yicha birinchisi (morphOne).
  const commandByContract = new Map<
    number,
    { command_number: string | null; command_date: string | null }
  >();
  for (const cm of cmdRows) {
    if (
      cm.contract_model_id != null &&
      !commandByContract.has(cm.contract_model_id)
    ) {
      commandByContract.set(cm.contract_model_id, {
        command_number: cm.command_number,
        command_date: cm.command_date,
      });
    }
  }

  // Har kontrakt uchun detail.
  for (const c of contractRows) {
    const worker =
      c.worker_id != null ? workerById.get(c.worker_id) : undefined;
    const cmd = commandByContract.get(c.id);

    // lastPosition — shu kontraktdan bo'lmagan eng so'nggi pozitsiya.
    let lastPosition: (typeof apRows)[number] | undefined;
    if (c.worker_id != null) {
      const wpList = positionsByWorker.get(c.worker_id) ?? [];
      lastPosition = wpList.find((p) => p.contract_id !== c.id);
    }

    const educationLabel =
      worker && worker.education != null
        ? (educationLabels[worker.education] ?? '')
        : '';

    const detail: ContractDetail = {
      id: c.id,
      organization: orgNameById.get(c.organization_id) ?? null,
      full_name: worker
        ? [worker.last_name, worker.first_name, worker.middle_name]
            .map((x) => x ?? '')
            .join(' ')
        : '',
      birthday: worker?.birthday ?? null,
      position_name: positionByContract.get(c.id) ?? null,
      educations:
        educationLabel +
        ', ' +
        fullEducations(uniByWorker.get(c.worker_id ?? -1) ?? []),
      old_organization_name: lastPosition?.org_name ?? null,
      old_position_name: lastPosition?.pos_name ?? null,
      old_position_date: lastPosition?.to ?? null,
      command: cmd
        ? `№ ${cmd.command_number ?? ''}, ${cmd.command_date ?? ''}`
        : '',
      command_reason: '',
      type: contractTypeLabels[c.type] ?? '',
    };

    const arr = byOrg.get(c.organization_id) ?? [];
    arr.push(detail);
    byOrg.set(c.organization_id, arr);
  }

  return byOrg;
}

// Laravel Worker::fullEducations() porti.
function fullEducations(
  unis: Array<{
    to_date: string | null;
    uni_name: string | null;
    spec_name: string | null;
  }>,
): string {
  if (unis.length === 0) return '';
  const uniArr: string[] = [];
  const specArr: string[] = [];
  for (const u of unis) {
    // Laravel: faqat university relation mavjud bo'lsa.
    if (u.uni_name != null) {
      const yr = u.to_date
        ? new Date(u.to_date).getFullYear()
        : new Date().getFullYear();
      uniArr.push(`${yr}-yil,${u.uni_name}`);
      specArr.push(u.spec_name ?? '');
    }
  }
  return uniArr.join(', ') + ', ' + specArr.join(', ');
}

// ============================================================
// HELPER'LAR
// ============================================================

// db.execute natijasidan qatorlarni ajratadi (driver'ga qarab {rows} yoki array).
function rowsOf(result: unknown): Record<string, unknown>[] {
  const r = result as { rows?: unknown[] };
  return (Array.isArray(r.rows) ? r.rows : result) as Record<string, unknown>[];
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// PHP number_format(n, 2) — verguI bilan minglik, 2 kasr.
function numberFormat(n: number, decimals: number): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// number[] → SQL "1, 2, 3" fragmenti (IN ro'yxati uchun).
function idList(ids: number[]): ReturnType<typeof sql.join> {
  return sql.join(
    ids.map((id) => sql`${id}`),
    sql`, `,
  );
}
