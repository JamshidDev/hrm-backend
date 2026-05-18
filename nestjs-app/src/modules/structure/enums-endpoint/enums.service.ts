// Enums service. Laravel: StructureController::enums().
// 10 ta enum kolleksiyasi qaytaradi — har biri {id, name} array.

import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { RequestContext } from '@/common/context/request.context';
import {
  CONTRACT_TYPES,
  ORGANIZATION_SERVICES,
  POSITION_CATEGORIES,
  SCHEDULES_TYPES,
  WORK_DAY_TYPES,
  COMMAND_TYPES,
  CONFIRMATION_STATUSES,
  HOLIDAY_TYPES,
  UNIVERSITY_TYPES,
  EDUCATION_TYPES,
} from '@/modules/structure/enums-endpoint/enums.constants';

interface EnumItem {
  id: number | string;
  name: string;
}

export interface EnumsResponse {
  contract_types: EnumItem[];
  organization_services: EnumItem[];
  categories: EnumItem[];
  schedules: EnumItem[];
  work_day_types: EnumItem[];
  command_types: EnumItem[];
  confirmation_statuses: EnumItem[];
  holiday_types: EnumItem[];
  university_types: EnumItem[];
  education_types: EnumItem[];
}

@Injectable()
export class EnumsService {
  constructor(
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
  ) {}

  list(): EnumsResponse {
    const lang = this.ctx.lang;
    return {
      contract_types: this.localize(CONTRACT_TYPES, lang),
      // organization_services — har til uchun bir xil (hardcoded).
      organization_services: ORGANIZATION_SERVICES.map((s) => ({
        id: s.id,
        name: s.name,
      })),
      categories: this.localize(POSITION_CATEGORIES, lang),
      schedules: this.localize(SCHEDULES_TYPES, lang),
      work_day_types: this.localize(WORK_DAY_TYPES, lang),
      command_types: this.localize(COMMAND_TYPES, lang),
      confirmation_statuses: this.localize(CONFIRMATION_STATUSES, lang),
      holiday_types: this.localize(HOLIDAY_TYPES, lang),
      university_types: this.localize(UNIVERSITY_TYPES, lang),
      education_types: this.localize(EDUCATION_TYPES, lang),
    };
  }

  private localize(
    list: { id: number | string; key: string }[],
    lang: string,
  ): EnumItem[] {
    return list.map((item) => {
      const name = this.i18n.t(item.key, { lang });
      return {
        id: item.id,
        name: typeof name === 'string' ? name : '',
      };
    });
  }
}
