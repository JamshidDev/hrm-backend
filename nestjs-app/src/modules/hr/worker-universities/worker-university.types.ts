// WorkerUniversity internal row types (5+ JOIN).

export interface WorkerUniversityRow {
  id: number;
  from_date: string | null;
  to_date: string | null;
  file: string | null;
  spec_id: number | null;
  spec_name: string | null;
  spec_name_ru: string | null;
  uni_id: number | null;
  uni_name: string | null;
  uni_name_ru: string | null;
  uni_name_en: string | null;
  uni_education: number | null;
  uni_type: number | null;
  city_id: number | null;
  city_name: string | null;
  city_name_ru: string | null;
  city_name_en: string | null;
  city_lat: string | null;
  city_long: string | null;
  region_id: number | null;
  region_name: string | null;
}
