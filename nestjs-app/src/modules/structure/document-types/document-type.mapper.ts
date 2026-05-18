// DocumentType mapper. Laravel: ContractTypeResource / CommandTypeResource.
//   - type: enum lookup (i18n via translation key list).
//   - organization: OrganizationListResource (id, name localized, group).

import type { I18nService } from 'nestjs-i18n';
import {
  DocumentTypeItemDto,
  DocumentTypeEnumItemDto,
} from '@/modules/structure/document-types/dto/document-type.dto';

export interface DocumentTypeRow {
  id: number;
  type: number;
  organization: {
    id: number;
    name: string | null;
    name_ru: string | null;
    name_en: string | null;
    group: boolean;
  } | null;
}

// Locale tanlash — OrganizationListResource ekvivalenti.
function localizedOrgName(
  org: {
    name: string | null;
    name_ru: string | null;
    name_en: string | null;
  },
  lang: string,
): string | null {
  if (lang === 'ru') return org.name_ru ?? org.name;
  if (lang === 'en') return org.name_en ?? org.name;
  return org.name;
}

export const DocumentTypeMapper = {
  // `enumKeys` — Laravel ContractTypeEnum / CommandTypeEnum dan kelgan translation key list.
  // Map: numeric type → translation key.
  toItem(
    this: void,
    row: DocumentTypeRow,
    enumMap: Record<number, string>,
    i18n: I18nService,
    lang: string,
  ): DocumentTypeItemDto {
    const typeKey = enumMap[row.type];
    const typeName = typeKey ? i18n.t(typeKey, { lang }) : '';
    const typeDto: DocumentTypeEnumItemDto = {
      id: row.type,
      name: typeof typeName === 'string' ? typeName : '',
    };

    return {
      id: row.id,
      type: typeDto,
      organization: row.organization
        ? {
            id: row.organization.id,
            name: localizedOrgName(row.organization, lang),
            group: row.organization.group,
          }
        : null,
    };
  },
};
