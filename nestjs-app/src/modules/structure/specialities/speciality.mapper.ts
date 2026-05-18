// Speciality mapper. Laravel: SpecialityResource.

import { specialities } from '@/db/schema';
import { SpecialityItemDto } from '@/modules/structure/specialities/dto/speciality.dto';

export const SpecialityMapper = {
  toItem(this: void, s: typeof specialities.$inferSelect): SpecialityItemDto {
    return {
      id: s.id,
      name: s.name,
      name_ru: s.name_ru,
    };
  },
};
