// Region entity → response DTO mapper.
// Laravel: Modules/Structure/Transformers/Structure/RegionResource.

import { CountryMapper } from '@/modules/structure/countries/country.mapper';
import { RegionItemDto } from '@/modules/structure/regions/dto/region.dto';

// Relational query natijasi tipini aks ettiruvchi shape (with: { country: true }).
export interface RegionRow {
  id: number;
  country_id: number;
  name: string;
  name_ru: string | null;
  name_en: string | null;
  lat: string | null;
  long: string | null;
  country: {
    id: number;
    name: string;
    name_ru: string | null;
    name_en: string | null;
    lat: string | null;
    long: string | null;
    created_at: string | null;
    updated_at: string | null;
    deleted_at: string | null;
  } | null;
}

export const RegionMapper = {
  toItem(this: void, r: RegionRow): RegionItemDto {
    return {
      id: r.id,
      country: r.country
        ? CountryMapper.toItem({
            id: r.country.id,
            name: r.country.name,
            name_ru: r.country.name_ru,
            name_en: r.country.name_en,
            lat: r.country.lat,
            long: r.country.long,
            created_at: r.country.created_at,
            updated_at: r.country.updated_at,
            deleted_at: r.country.deleted_at,
          })
        : null,
      name: r.name,
      name_ru: r.name_ru,
      name_en: r.name_en,
      lat: r.lat,
      long: r.long,
    };
  },
};
