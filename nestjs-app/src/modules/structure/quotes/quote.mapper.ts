// Quote mapper. Laravel: QuoteResource (raw passthrough).

import { quotes } from '@/db/schema';
import {
  QuoteItemDto,
  QuoteTranslationDto,
} from '@/modules/structure/quotes/dto/quote.dto';

export const QuoteMapper = {
  toItem(this: void, q: typeof quotes.$inferSelect): QuoteItemDto {
    return {
      id: q.id,
      // JSON columns Drizzle'da `unknown` — cast.
      author: q.author as QuoteTranslationDto,
      text: q.text as QuoteTranslationDto,
    };
  },
};
