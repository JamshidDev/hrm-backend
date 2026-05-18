// LearningCenter mapper. Laravel: LearningCenterListResource + LearningCenterUsersResource.

import { MinioService } from '@/shared/minio/minio.service';
import {
  LearningCenterItemDto,
  LearningCenterUserItemDto,
} from '@/modules/structure/learning-centers/dto/learning-center.dto';

export interface LearningCenterRow {
  id: number;
  code: string | null;
  name: string;
  name_ru: string | null;
  name_en: string | null;
  users: LearningCenterUserRow[];
}

export interface LearningCenterUserRow {
  id: number;
  phone: string | number;
  status: boolean; // pivot.status (mapped from JOIN)
  worker: {
    id: number;
    photo: string | null;
    last_name: string | null;
    first_name: string | null;
    middle_name: string | null;
  } | null;
}

export const LearningCenterMapper = {
  async toItem(
    c: LearningCenterRow,
    minio: MinioService,
  ): Promise<LearningCenterItemDto> {
    const users: LearningCenterUserItemDto[] = await Promise.all(
      c.users.map(async (u) => ({
        id: u.id,
        worker: u.worker
          ? {
              id: u.worker.id,
              photo: await minio.fileUrl(u.worker.photo),
              last_name: u.worker.last_name,
              first_name: u.worker.first_name,
              middle_name: u.worker.middle_name,
            }
          : null,
        // Laravel `$this->phone` — user.phone (bigint).
        phone: Number(u.phone),
        status: u.status,
      })),
    );

    return {
      id: c.id,
      users,
      code: c.code,
      name: c.name,
      name_ru: c.name_ru,
      name_en: c.name_en,
    };
  },
};
