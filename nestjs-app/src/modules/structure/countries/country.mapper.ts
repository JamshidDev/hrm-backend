// Country entity → response DTO mapper.
// Laravel: Modules/Structure/Transformers/Structure/CountryResource.

import { countries } from '@/db/schema';
import { toLaravelTimestamp } from '@/common/utils/datetime.util';
import { CountryItemDto } from '@/modules/structure/countries/dto/country.dto';

export const CountryMapper = {
  toItem(this: void, c: typeof countries.$inferSelect): CountryItemDto {
    return {
      id: c.id,
      name: c.name,
      name_ru: c.name_ru,
      name_en: c.name_en,
      lat: c.lat,
      long: c.long,
      created_at: toLaravelTimestamp(c.created_at),
    };
  },
};
