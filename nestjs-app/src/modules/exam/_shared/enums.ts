// Exam moduli — enum labellari (Laravel translation key'lariga moslangan).

// Laravel: TopicTypeEnum::get($type).
export function topicTypeName(type: number): string {
  const map: Record<number, string> = {
    1: 'Attestatsiya (Sanoat xavfsizligi)',
    2: 'Attestatsiya (Lavozimga loyiqligi)',
    3: 'Malaka sinovi (Razryadni oshirish uchun)',
    4: 'Bilim sinovi (Mehnat muhofazasi)',
  };
  return map[type] ?? '';
}

// Laravel: ExamWhomEnum::get($whom).
export function examWhomName(whom: number): string {
  const map: Record<number, string> = {
    1: 'Barchaga',
    2: 'Tegishli lavozimlarga',
    3: 'Belgilangan xodimlarga (Ishlab turgan)',
    4: 'Malaka oshirish imtihonlari uchun',
    5: 'Belgilangan xodimlarga (Ishlamayotgan)',
  };
  return map[whom] ?? '';
}

// Laravel: TopicFileEnum::get($type).
export function topicFileTypeName(type: number): string {
  const map: Record<number, string> = {
    1: 'Videolar',
    2: 'Rasmlar',
    3: 'Kitoblar',
    4: 'Audiolar',
  };
  return map[type] ?? '';
}
