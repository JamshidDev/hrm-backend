// HR enums service. Laravel: HRController::enums().
//
// 29 enum/list qaytaradi:
//   - 24 ta static (har til uchun hardcoded — enums.constants.ts)
//   - 2 ta DB'dan (languages, roles)
//   - 2 ta shared (educations, contract_types — Structure'dan)
//   - 1 ta nested object (command_additional — per lang dict)

import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { asc, isNull } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { languages as languagesTable } from '@/db/schema';
import { RequestContext } from '@/common/context/request.context';
import {
  ACADEMIC_TITLES,
  ACADEMIC_DEGREES,
  PARTIES,
  PROBATION_LIST,
  RELATIVES,
  MARITAL_STATUSES,
  MILITARY_STATUSES,
  CONFIRMATION_WORKER,
  CONTRACT_APPLICATION_TYPES,
  CREATE_APPLICATION_TYPES,
  STAFF_CATEGORIES,
  VACATION_ADDITIONAL,
  FINISHED_COMMAND_TYPES,
  MED_STATUSES,
  ORGANIZATION_DOCUMENT_TYPES,
  GIFT_TYPES,
  FINE_TYPES,
  FINANCIAL_ASSISTANCE,
  VACATION_TYPES,
  VACANCY_FILE_TYPES,
  RANKS,
  GROUPS,
  WORK_TYPES,
  ROLES,
  COMMAND_ADDITIONAL,
  type EnumsByLang,
  type EnumItem,
  type Lang,
} from '@/modules/hr/enums-endpoint/enums.constants';
import {
  CONTRACT_TYPES,
  EDUCATION_TYPES,
  UNIVERSITY_TYPES,
} from '@/modules/structure/enums-endpoint/enums.constants';

@Injectable()
export class HrEnumsService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
  ) {}

  async list(): Promise<Record<string, unknown>> {
    const lang = this.normalizeLang(this.ctx.lang);

    const languages = await this.fetchLanguages(lang);

    // Structure'dagi shared enums (educations/contract_types/university_types) — i18n bilan.
    const educations = this.fromStructure(EDUCATION_TYPES, lang);
    const contract_types = this.fromStructure(CONTRACT_TYPES, lang);
    const university_types = this.fromStructure(UNIVERSITY_TYPES, lang);

    return {
      academic_titles: this.pick(ACADEMIC_TITLES, lang),
      academic_degrees: this.pick(ACADEMIC_DEGREES, lang),
      parties: this.pick(PARTIES, lang),
      educations,
      contract_types,
      groups: this.pick(GROUPS, lang),
      ranks: this.pick(RANKS, lang),
      probation_list: this.pick(PROBATION_LIST, lang),
      relatives: this.pick(RELATIVES, lang),
      marital_statuses: this.pick(MARITAL_STATUSES, lang),
      languages,
      university_types,
      military_statuses: this.pick(MILITARY_STATUSES, lang),
      confirmation_worker: this.pick(CONFIRMATION_WORKER, lang),
      contract_application_types: this.pick(CONTRACT_APPLICATION_TYPES, lang),
      create_application_types: this.pick(CREATE_APPLICATION_TYPES, lang),
      staff_categories: this.pick(STAFF_CATEGORIES, lang),
      vacation_additional: this.pick(VACATION_ADDITIONAL, lang),
      finished_command_types: this.pick(FINISHED_COMMAND_TYPES, lang),
      med_statuses: this.pick(MED_STATUSES, lang),
      organization_document_types: this.pick(ORGANIZATION_DOCUMENT_TYPES, lang),
      roles: this.pick(ROLES, lang),
      gift_types: this.pick(GIFT_TYPES, lang),
      fine_types: this.pick(FINE_TYPES, lang),
      financial_assistance: this.pick(FINANCIAL_ASSISTANCE, lang),
      vacation_types: this.pick(VACATION_TYPES, lang),
      work_types: this.pick(WORK_TYPES, lang),
      command_additional: (COMMAND_ADDITIONAL as Record<Lang, unknown>)[lang],
      vacancy_file_types: this.pick(VACANCY_FILE_TYPES, lang),
    };
  }

  private normalizeLang(raw: string): Lang {
    return raw === 'ru' || raw === 'en' ? raw : 'uz';
  }

  private pick(map: EnumsByLang, lang: Lang): EnumItem[] {
    return map[lang];
  }

  private fromStructure(
    list: { id: number | string; key: string }[],
    lang: Lang,
  ): EnumItem[] {
    return list.map((item) => {
      const name = this.i18n.t(item.key, { lang });
      return {
        id: item.id,
        name: typeof name === 'string' ? name : '',
      };
    });
  }

  private async fetchLanguages(lang: Lang): Promise<EnumItem[]> {
    const rows = await this.db
      .select({
        id: languagesTable.id,
        name: languagesTable.name,
        name_ru: languagesTable.name_ru,
        name_en: languagesTable.name_en,
      })
      .from(languagesTable)
      .where(isNull(languagesTable.deleted_at))
      .orderBy(asc(languagesTable.id));

    return rows.map((r) => {
      let name = r.name;
      if (lang === 'ru') name = r.name_ru ?? r.name;
      else if (lang === 'en') name = r.name_en ?? r.name;
      return { id: r.id, name };
    });
  }
}
