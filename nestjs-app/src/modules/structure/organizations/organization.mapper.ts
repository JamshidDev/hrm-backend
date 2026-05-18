// Organization mapper. Laravel: OrganizationResource + OrganizationListResource.

import {
  OrganizationItemDto,
  OrganizationListMinimalDto,
} from '@/modules/structure/organizations/dto/organization.dto';

// Drizzle organizations row (with eager-loaded city.region — minimal {id, name}).
export interface OrganizationRow {
  id: number;
  name: string | null;
  full_name: string | null;
  level: number;
  parent_id: number | null;
  lat: string | null;
  long: string | null;
  code: string;
  group: boolean;
  name_ru: string | null;
  name_en: string | null;
  _lft: number;
  _rgt: number;
  city: {
    id: number;
    region_id: number;
    name: string;
    name_ru: string | null;
    name_en: string | null;
    lat: string | null;
    long: string | null;
    region: { id: number; name: string } | null;
  } | null;
}

// Laravel CityResource (cities/dto): {id, region: minimal, name, ...}.
// Lekin Organization Laravel CityResource'i `region: RegionResource(full)` ishlatadi
// (chunki OrganizationResource->city—new CityResource(...)). Cities mapper region'ni minimal beradi.
// Organization use case'da to'liq region+country shape kerak, qo'lda yig'amiz.

export const OrganizationMapper = {
  // Descendants count Laravel'da soft-delete filter bilan computed → service'da
  // alohida hisoblanadi va parametr sifatida uzatiladi.
  toItem(
    this: void,
    o: OrganizationRow,
    descendantsCount: number,
  ): OrganizationItemDto {
    return {
      id: o.id,
      name: o.name,
      full_name: o.full_name,
      level: o.level,
      parent_id: o.parent_id,
      // Laravel OrganizationResource: city -> CityResource bilan ekzakt parity:
      // {id, region: {id, name}, name, name_ru, name_en, lat, long}.
      city: o.city
        ? {
            id: o.city.id,
            region: o.city.region
              ? { id: o.city.region.id, name: o.city.region.name }
              : null,
            name: o.city.name,
            name_ru: o.city.name_ru,
            name_en: o.city.name_en,
            lat: o.city.lat,
            long: o.city.long,
          }
        : null,
      lat: o.lat,
      long: o.long,
      code: o.code,
      descendants: descendantsCount,
    };
  },

  // OrganizationListResource — minimal: id, name (localized), group.
  toListMinimal(
    this: void,
    o: {
      id: number;
      name: string | null;
      name_ru: string | null;
      name_en: string | null;
      group: boolean;
    },
    lang: string,
  ): OrganizationListMinimalDto {
    let name = o.name;
    if (lang === 'ru') name = o.name_ru ?? o.name;
    else if (lang === 'en') name = o.name_en ?? o.name;
    return { id: o.id, name, group: o.group };
  },
};
