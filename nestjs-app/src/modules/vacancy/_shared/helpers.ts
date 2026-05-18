// Vacancy moduli — sub-modullar uchun umumiy yordamchi funksiyalar.

export interface PageQueryLike {
  page?: number | string;
  per_page?: number | string;
}

// Pagination uchun standart hisob: page, perPage, offset qaytaradi.
export function pageOf(q?: PageQueryLike) {
  const page = Number(q?.page ?? 1);
  const perPage = Number(q?.per_page ?? 10);
  return { page, perPage, offset: (page - 1) * perPage };
}
