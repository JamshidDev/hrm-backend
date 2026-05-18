// Position mapper. Laravel: PositionResource.

import { positions } from '@/db/schema';
import { PositionItemDto } from '@/modules/structure/positions/dto/position.dto';

export const PositionMapper = {
  toItem(this: void, p: typeof positions.$inferSelect): PositionItemDto {
    return {
      id: p.id,
      name: p.name,
      name_ru: p.name_ru,
      classification_index: p.classification_index,
      classification_code: p.classification_code,
    };
  },
};
