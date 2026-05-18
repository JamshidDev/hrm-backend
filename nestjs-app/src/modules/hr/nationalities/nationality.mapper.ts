// Nationality mapper. Laravel: NationalityResource.

import { nationalities } from '@/db/schema';
import { NationalityItemDto } from '@/modules/hr/nationalities/dto/nationality.dto';

export const NationalityMapper = {
  toItem(this: void, n: typeof nationalities.$inferSelect): NationalityItemDto {
    return {
      id: n.id,
      name: n.name,
    };
  },
};
