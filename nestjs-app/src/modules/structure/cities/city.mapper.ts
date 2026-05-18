// City entity → response DTO mapper.
// Laravel: Modules/Structure/Transformers/Structure/CityResource (region: minimal {id, name}).

import { CityItemDto } from '@/modules/structure/cities/dto/city.dto';

export interface CityRow {
  id: number;
  region_id: number;
  name: string;
  name_ru: string | null;
  name_en: string | null;
  lat: string | null;
  long: string | null;
  region: { id: number; name: string } | null;
}

export const CityMapper = {
  toItem(this: void, c: CityRow): CityItemDto {
    return {
      id: c.id,
      region: c.region ? { id: c.region.id, name: c.region.name } : null,
      name: c.name,
      name_ru: c.name_ru,
      name_en: c.name_en,
      lat: c.lat,
      long: c.long,
    };
  },
};
