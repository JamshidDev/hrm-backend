// Worker minimal mapper. Laravel: WorkerMinimalResource (id, last_name, first_name, middle_name, photo).
// Photo URL'i hozircha to'g'ridan-to'g'ri saqlangan stringi qaytariladi (MinIO signed URL keyin).

import type { workers } from '@/db/schema';

type WorkerRow = typeof workers.$inferSelect;

export interface WorkerBrief {
  id: number;
  last_name: string | null;
  first_name: string | null;
  middle_name: string | null;
  photo: string | null;
}

export const WorkerBriefMapper = {
  toItem(
    r:
      | Pick<
          WorkerRow,
          'id' | 'last_name' | 'first_name' | 'middle_name' | 'photo'
        >
      | null
      | undefined,
  ): WorkerBrief | null {
    if (!r) return null;
    return {
      id: r.id,
      last_name: r.last_name,
      first_name: r.first_name,
      middle_name: r.middle_name,
      photo: r.photo,
    };
  },
};
