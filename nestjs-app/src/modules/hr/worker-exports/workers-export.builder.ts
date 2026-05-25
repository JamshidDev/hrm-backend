// HR Ishchilar Excel builder (foydalanuvchi tanlangan ustunlar bo'yicha).
// Laravel: App\Jobs\HR\WorkersExportToExcelJob.
//
// Foydalanuvchi `columns` array tanlaydi (masalan ["last_name","full_name"]).
// Builder shu ustunlarni `worker_positions` + `workers` + barcha kerakli
// jadvallardan oladi va Excel'ga to'playdi.

import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { DataSource } from '@/db/types';
import {
  cities,
  contracts,
  countries,
  departments,
  meds,
  nationalities,
  organizations,
  positions as positionsTable,
  regions,
  worker_passports,
  worker_phones,
  worker_positions,
  worker_universities,
  workers,
  universities as universitiesTable,
  specialities as specialitiesTable,
} from '@/db/schema';
import { notDeleted } from '@/common/database/soft-delete.helper';
import type { ExcelService } from '@/shared/excel/excel.service';

const POSITION_STATUS_ACTIVE = 2;

export interface WorkersExportParams {
  columns: string[]; // user-selected column names
  orgScopeIds: number[];
  organizations?: string;
  organizationId?: number;
  // Translation maps (Laravel Enums).
  contractTypeMinimized: Record<number, string>; // 1..N
  educationLabels: Record<number, string>; // 1..3
  medStatusLabels: Record<number, string>; // 1=Sog'lom, 2=Nosog'lom
  // Header labels (i18n) for each column key.
  columnHeaders: Record<string, string>;
}

export async function buildWorkersExcel(
  db: DataSource,
  excel: ExcelService,
  params: WorkersExportParams,
): Promise<Buffer> {
  if (params.orgScopeIds.length === 0 || params.columns.length === 0) {
    return excel.build({
      creator: 'HRM',
      sheets: [
        {
          name: 'Worksheet',
          headerStyle: { bold: true },
          columns: makeColumns(params),
          rows: [],
        },
      ],
    });
  }

  // Org filtrlar (childIds + organizations + organization_id).
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

  // Birinchi katta SELECT: worker_positions + workers + barcha to'g'ridan-to'g'ri
  // belongs-to relationlar (region, city, country, current_region, current_city,
  // nationality, department, position, organization, contract).
  const baseRows = await db
    .select({
      // worker_position
      wp_id: worker_positions.id,
      wp_group: worker_positions.group,
      wp_rank: worker_positions.rank,
      wp_rate: worker_positions.rate,
      wp_position_date: worker_positions.position_date,
      wp_type: worker_positions.type,
      // worker
      w_id: workers.id,
      w_last: workers.last_name,
      w_first: workers.first_name,
      w_middle: workers.middle_name,
      w_birthday: workers.birthday,
      w_sex: workers.sex,
      w_pin: workers.pin,
      w_address: workers.address,
      w_work_experience: workers.work_experience,
      w_experience_date: workers.experience_date,
      w_marital_status: workers.marital_status,
      w_education: workers.education,
      w_photo: workers.photo,
      // belongs-to: worker
      country_name: countries.name,
      region_name: regions.name,
      city_name: cities.name,
      nationality_name: nationalities.name,
      // department/position/organization
      dept_name: departments.name,
      dept_level: departments.level,
      pos_name: positionsTable.name,
      org_name: organizations.name,
      org_full_name: organizations.full_name,
      // contract
      contract_number: contracts.number,
      contract_date: contracts.contract_date,
    })
    .from(worker_positions)
    .innerJoin(workers, eq(workers.id, worker_positions.worker_id))
    .leftJoin(countries, eq(countries.id, workers.country_id))
    .leftJoin(regions, eq(regions.id, workers.region_id))
    .leftJoin(cities, eq(cities.id, workers.city_id))
    .leftJoin(nationalities, eq(nationalities.id, workers.nationality_id))
    .leftJoin(departments, eq(departments.id, worker_positions.department_id))
    .leftJoin(
      positionsTable,
      eq(positionsTable.id, worker_positions.position_id),
    )
    .leftJoin(
      organizations,
      and(
        eq(organizations.id, worker_positions.organization_id),
        isNull(organizations.deleted_at),
      ),
    )
    .leftJoin(contracts, eq(contracts.id, worker_positions.contract_id))
    .where(
      and(
        notDeleted(worker_positions),
        eq(worker_positions.status, POSITION_STATUS_ACTIVE),
        notDeleted(workers),
        ...orgConds,
      ),
    );

  if (baseRows.length === 0) {
    return excel.build({
      creator: 'HRM',
      sheets: [
        {
          name: 'Worksheet',
          headerStyle: { bold: true },
          columns: makeColumns(params),
          rows: [],
        },
      ],
    });
  }

  // Current region/city — ikkinchi sub-query (vositali aliasing kerak).
  // Optimal — bitta join'da olish; lekin Drizzle alias murakkab. Batch.
  const workerIds = [...new Set(baseRows.map((r) => r.w_id))];
  const needCols = new Set(params.columns);

  const needCurrentRegion = needCols.has('current_region');
  const needCurrentCity = needCols.has('current_city');
  const currentByWorker = new Map<
    number,
    { current_region?: string; current_city?: string }
  >();
  if (needCurrentRegion || needCurrentCity) {
    const rows = await db
      .select({
        worker_id: workers.id,
        cr_name: regions.name,
        cc_name: cities.name,
      })
      .from(workers)
      .leftJoin(regions, eq(regions.id, workers.current_region_id))
      .leftJoin(cities, eq(cities.id, workers.current_city_id))
      .where(inArray(workers.id, workerIds));
    for (const r of rows) {
      currentByWorker.set(r.worker_id, {
        current_region: r.cr_name ?? '',
        current_city: r.cc_name ?? '',
      });
    }
  }

  // Passport — bitta worker uchun joriy (current=true) yoki eng so'nggi.
  const needPassport = [
    'passport_serial_number',
    'passport_from_date',
    'passport_to_date',
    'passport_address',
  ].some((c) => needCols.has(c));
  const passportByWorker = new Map<
    number,
    {
      serial_number: string | null;
      from_date: string | null;
      to_date: string | null;
      address: string | null;
    }
  >();
  if (needPassport) {
    const rows = await db.execute(sql`
      SELECT DISTINCT ON (worker_id) worker_id, serial_number, from_date, to_date, address
      FROM ${worker_passports}
      WHERE worker_id IN (${sql.join(
        workerIds.map((id) => sql`${id}`),
        sql`, `,
      )})
        AND current = true
      ORDER BY worker_id, id DESC
    `);
    for (const r of rows as Array<Record<string, unknown>>) {
      passportByWorker.set(Number(r.worker_id), {
        serial_number: (r.serial_number as string) ?? null,
        from_date: (r.from_date as string) ?? null,
        to_date: (r.to_date as string) ?? null,
        address: (r.address as string) ?? null,
      });
    }
  }

  // Universities + specialities — string_agg.
  const needUni = needCols.has('universities') || needCols.has('specialities');
  const uniByWorker = new Map<
    number,
    { universities: string; specialities: string }
  >();
  if (needUni) {
    const rows = await db
      .select({
        worker_id: worker_universities.worker_id,
        from_date: worker_universities.from_date,
        to_date: worker_universities.to_date,
        uni_name: universitiesTable.name,
        spec_name: specialitiesTable.name,
      })
      .from(worker_universities)
      .leftJoin(
        universitiesTable,
        eq(universitiesTable.id, worker_universities.university_id),
      )
      .leftJoin(
        specialitiesTable,
        eq(specialitiesTable.id, worker_universities.speciality_id),
      )
      .where(
        and(
          notDeleted(worker_universities),
          inArray(worker_universities.worker_id, workerIds),
        ),
      );
    for (const r of rows) {
      if (r.worker_id == null) continue;
      const cur = uniByWorker.get(r.worker_id) ?? {
        universities: '',
        specialities: '',
      };
      const from = r.from_date ? String(r.from_date).slice(0, 4) : '';
      const to = r.to_date ? String(r.to_date).slice(0, 4) : '';
      const uniLabel = `${from}-${to}, ${r.uni_name ?? ''}`;
      cur.universities = cur.universities
        ? `${cur.universities}; ${uniLabel}`
        : uniLabel;
      if (r.spec_name) {
        cur.specialities = cur.specialities
          ? `${cur.specialities}; ${r.spec_name}`
          : r.spec_name;
      }
      uniByWorker.set(r.worker_id, cur);
    }
  }

  // Phones — pluck + join.
  const needPhones = needCols.has('phones');
  const phonesByWorker = new Map<number, string>();
  if (needPhones) {
    const rows = await db
      .select({
        worker_id: worker_phones.worker_id,
        phone: worker_phones.phone,
      })
      .from(worker_phones)
      .where(
        and(
          notDeleted(worker_phones),
          inArray(worker_phones.worker_id, workerIds),
        ),
      );
    for (const r of rows) {
      if (r.worker_id == null) continue;
      const formatted = formatUzPhone(r.phone);
      const cur = phonesByWorker.get(r.worker_id);
      phonesByWorker.set(r.worker_id, cur ? `${cur}; ${formatted}` : formatted);
    }
  }

  // Med — eng so'nggi yozuv.
  const needMed = ['med_from', 'med_to', 'med_status'].some((c) =>
    needCols.has(c),
  );
  const medByWorker = new Map<
    number,
    { from: string | null; to: string | null; status: number | null }
  >();
  if (needMed) {
    const rows = await db.execute(sql`
      SELECT DISTINCT ON (worker_id) worker_id, "from", "to", status
      FROM ${meds}
      WHERE worker_id IN (${sql.join(
        workerIds.map((id) => sql`${id}`),
        sql`, `,
      )})
        AND deleted_at IS NULL
      ORDER BY worker_id, id DESC
    `);
    for (const r of rows as Array<Record<string, unknown>>) {
      medByWorker.set(Number(r.worker_id), {
        from: (r.from as string) ?? null,
        to: (r.to as string) ?? null,
        status: r.status as number | null,
      });
    }
  }

  // Har qatorni tanlangan ustunlar bo'yicha map qilamiz.
  const data = baseRows.map((r) => {
    const out: Record<string, string | number | null> = {};
    for (const col of params.columns) {
      out[col] = resolveColumn(col, r, {
        currentByWorker,
        passportByWorker,
        uniByWorker,
        phonesByWorker,
        medByWorker,
        contractTypeMinimized: params.contractTypeMinimized,
        educationLabels: params.educationLabels,
        medStatusLabels: params.medStatusLabels,
      });
    }
    return out;
  });

  return excel.build({
    creator: 'HRM',
    sheets: [
      {
        name: 'Worksheet',
        headerStyle: { bold: true },
        columns: makeColumns(params),
        rows: data,
      },
    ],
  });
}

interface ResolveContext {
  currentByWorker: Map<
    number,
    { current_region?: string; current_city?: string }
  >;
  passportByWorker: Map<
    number,
    {
      serial_number: string | null;
      from_date: string | null;
      to_date: string | null;
      address: string | null;
    }
  >;
  uniByWorker: Map<number, { universities: string; specialities: string }>;
  phonesByWorker: Map<number, string>;
  medByWorker: Map<
    number,
    { from: string | null; to: string | null; status: number | null }
  >;
  contractTypeMinimized: Record<number, string>;
  educationLabels: Record<number, string>;
  medStatusLabels: Record<number, string>;
}

type Row = Awaited<ReturnType<typeof selectBase>>[number];
// Helper for type inference only — never called.
declare function selectBase(): Promise<
  Array<{
    wp_id: number;
    wp_group: number | null;
    wp_rank: string | null;
    wp_rate: number | null;
    wp_position_date: string | null;
    wp_type: number;
    w_id: number;
    w_last: string | null;
    w_first: string | null;
    w_middle: string | null;
    w_birthday: string | null;
    w_sex: boolean | null;
    w_pin: number | null;
    w_address: string | null;
    w_work_experience: number | null;
    w_experience_date: string | null;
    w_marital_status: number | null;
    w_education: number | null;
    w_photo: string | null;
    country_name: string | null;
    region_name: string | null;
    city_name: string | null;
    nationality_name: string | null;
    dept_name: string | null;
    dept_level: number | null;
    pos_name: string | null;
    org_name: string | null;
    org_full_name: string | null;
    contract_number: string | null;
    contract_date: string | null;
  }>
>;

function resolveColumn(
  col: string,
  r: Row,
  ctx: ResolveContext,
): string | number | null {
  switch (col) {
    case 'last_name':
      return r.w_last ?? '';
    case 'first_name':
      return r.w_first ?? '';
    case 'middle_name':
      return r.w_middle ?? '';
    case 'full_name':
      return [r.w_last, r.w_first, r.w_middle].filter((x) => x).join(' ');
    case 'birthday':
      return r.w_birthday ?? '';
    case 'sex':
      return r.w_sex ? 'Erkak' : 'Ayol';
    case 'pin':
      return r.w_pin != null ? String(r.w_pin) : '';
    case 'address':
      return r.w_address ?? '';
    case 'work_experience':
      return formatExperience(r.w_work_experience);
    case 'experience_date':
      return r.w_experience_date ?? '';
    case 'marital':
    case 'marital_status': {
      const ms = r.w_marital_status;
      if (ms === 2) return r.w_sex ? 'Uylangan' : 'Turmushga chiqqan';
      if (ms === 1) return r.w_sex ? 'Uylanmagan' : 'Turmushga chiqmagan';
      return '';
    }
    case 'education':
      return r.w_education != null
        ? (ctx.educationLabels[r.w_education] ?? '')
        : '';
    case 'country':
      return r.country_name ?? '';
    case 'region':
      return r.region_name ?? '';
    case 'city':
      return r.city_name ?? '';
    case 'nationality':
      return r.nationality_name ?? '';
    case 'current_region':
      return ctx.currentByWorker.get(r.w_id)?.current_region ?? '';
    case 'current_city':
      return ctx.currentByWorker.get(r.w_id)?.current_city ?? '';
    case 'phones':
      return ctx.phonesByWorker.get(r.w_id) ?? '';
    case 'photo':
      return ''; // Laravel HasOne: hardcoded path — frontend signed URL kerak. Default bo'sh.
    // worker_position
    case 'group':
      return r.wp_group != null ? String(r.wp_group) : '';
    case 'rank':
      return r.wp_rank ?? '';
    case 'rate':
      return r.wp_rate != null ? (r.wp_rate / 100).toString() : '';
    case 'position_date':
      return r.wp_position_date ?? '';
    case 'position_experience':
      return r.wp_position_date ?? '';
    case 'type':
      return ctx.contractTypeMinimized[r.wp_type] ?? '';
    case 'organization':
    case 'organization_name':
      return r.org_name ?? '';
    case 'department':
      return r.dept_name ?? '';
    case 'position':
      return r.pos_name ?? '';
    case 'full_position':
      return buildFullPosition(
        r.org_full_name,
        r.dept_name,
        r.dept_level,
        r.pos_name,
      );
    case 'short_position':
      return buildShortPosition(r.dept_name, r.dept_level, r.pos_name);
    case 'contract':
      return r.contract_number ?? '';
    case 'contract_date':
      return r.contract_date ?? '';
    // passport
    case 'passport_serial_number':
      return ctx.passportByWorker.get(r.w_id)?.serial_number ?? '';
    case 'passport_from_date':
      return ctx.passportByWorker.get(r.w_id)?.from_date ?? '';
    case 'passport_to_date':
      return ctx.passportByWorker.get(r.w_id)?.to_date ?? '';
    case 'passport_address':
      return ctx.passportByWorker.get(r.w_id)?.address ?? '';
    // universities & specialities
    case 'universities':
      return ctx.uniByWorker.get(r.w_id)?.universities ?? '';
    case 'specialities':
      return ctx.uniByWorker.get(r.w_id)?.specialities ?? '';
    // med
    case 'med_from':
      return ctx.medByWorker.get(r.w_id)?.from ?? '';
    case 'med_to':
      return ctx.medByWorker.get(r.w_id)?.to ?? '';
    case 'med_status': {
      const s = ctx.medByWorker.get(r.w_id)?.status;
      return s != null ? (ctx.medStatusLabels[s] ?? '') : '';
    }
    default:
      return '';
  }
}

function makeColumns(params: WorkersExportParams) {
  return params.columns.map((col) => ({
    header: params.columnHeaders[col] ?? col,
    key: col,
    width: pickWidth(col),
  }));
}

function pickWidth(col: string): number {
  if (
    /_name$|address|universit|specialit|full_position|short_position|phones/.test(
      col,
    )
  )
    return 30;
  if (/date|birthday|pin|passport_/.test(col)) return 18;
  return 18;
}

// Laravel Helper::formatExperience — oylarni "X yil Y oy" formatga.
function formatExperience(months: number | null | undefined): string {
  if (months == null || months <= 0) return '';
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m} oy`;
  if (m === 0) return `${y} yil`;
  return `${y} yil ${m} oy`;
}

// Uz telefon formatlash: 998901234567 → +998 90 123 45 67.
function formatUzPhone(phone: number | string | null): string {
  if (phone == null) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('998')) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10, 12)}`;
  }
  return String(phone);
}

function buildFullPosition(
  orgFullName: string | null,
  deptName: string | null,
  deptLevel: number | null,
  posName: string | null,
): string {
  if (!posName) return '';
  let p = posName;
  if (deptLevel !== 1 && deptName) p = `${deptName} ${p}`;
  if (orgFullName) p = `${orgFullName} ${p}`;
  return p.trim();
}

function buildShortPosition(
  deptName: string | null,
  deptLevel: number | null,
  posName: string | null,
): string {
  if (!posName) return '';
  let p = posName;
  if (deptLevel !== 1 && deptName) p = `${deptName} ${p}`;
  return p.charAt(0).toUpperCase() + p.slice(1);
}
