// Language entity → response DTO mapper.

import { languages } from '@/db/schema';
import { LanguageItemDto } from '@/modules/structure/languages/dto/language.dto';

export const LanguageMapper = {
  toItem(this: void, l: typeof languages.$inferSelect): LanguageItemDto {
    return {
      id: l.id,
      name: l.name,
      name_ru: l.name_ru,
      name_en: l.name_en,
    };
  },
};
