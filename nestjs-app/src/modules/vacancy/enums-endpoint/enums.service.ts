// Vacancy enums service. Laravel: routes/api.php ichidagi inline `enums` route.
// Frontend dropdownlari uchun: ta'lim, tillar, millatlar, davlatlar, oilaviy holat, fayl turlari.

import { Injectable } from '@nestjs/common';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { countries, regions } from '@/db/schema';

// Laravel: EducationEnum::list().
const EDUCATIONS = [
  { id: 1, name: "O'rta" },
  { id: 2, name: "O'rta maxsus" },
  { id: 3, name: 'Oliy' },
];

// Laravel: MaritalStatusEnum::list().
const MARITAL_STATUSES = [
  { id: 1, name: 'Uylanmagan / Turmushga chiqmagan' },
  { id: 2, name: 'Uylangan / Turmushga chiqqan' },
  { id: 3, name: 'Ajrashgan' },
];

// Laravel: VacancyFileTypesEnum::list().
const FILE_TYPES = [
  { id: 1, name: 'Rezyume' },
  { id: 2, name: 'Diplom' },
  { id: 3, name: 'Sertifikat' },
];

@Injectable()
export class VacancyEnumsService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  // Barcha enum va lookup ma'lumotlarini yig'ib qaytaradi.
  async enums() {
    const [countriesRows, regionsRows] = await Promise.all([
      this.db
        .select({ id: countries.id, name: countries.name })
        .from(countries),
      this.db.select({ id: regions.id, name: regions.name }).from(regions),
    ]);
    return {
      educations: EDUCATIONS,
      languages: [] as Array<unknown>,
      nationalities: [] as Array<unknown>,
      countries: countriesRows,
      marital_statuses: MARITAL_STATUSES,
      file_types: FILE_TYPES,
      regions: regionsRows,
    };
  }
}
