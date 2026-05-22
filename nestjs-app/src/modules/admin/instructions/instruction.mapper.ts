// AppInstruction mapper. Laravel: AppInstructionResource.
// Shape: {id, menu, sub_menu, title, text, photos: [{id, photo}]}

import type { app_instruction_photos, app_instructions } from '@/db/schema';

type InstrRow = typeof app_instructions.$inferSelect;
type PhotoRow = typeof app_instruction_photos.$inferSelect;

export interface InstructionPhotoItem {
  id: number;
  photo: string;
}

export interface InstructionItem {
  id: number;
  menu: string;
  sub_menu: string;
  title: string | null;
  text: string | null;
  photos: InstructionPhotoItem[];
}

export const InstructionMapper = {
  toItem(
    r: InstrRow,
    photosByInstr: Record<number, PhotoRow[]>,
  ): InstructionItem {
    const photos = (photosByInstr[r.id] ?? []).map((p) => ({
      id: p.id,
      photo: p.photo,
    }));
    return {
      id: r.id,
      menu: r.menu,
      sub_menu: r.sub_menu,
      title: r.title,
      text: r.text,
      photos,
    };
  },
};
