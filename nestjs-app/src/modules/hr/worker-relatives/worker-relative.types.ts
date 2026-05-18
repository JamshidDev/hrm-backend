// WorkerRelative internal row types — service query natijasi.

export interface WorkerRelativeRow {
  id: number;
  relative: number;
  relative_worker_id: number | null;
  birthday: string | null;
  last_name: string | null;
  first_name: string | null;
  middle_name: string | null;
  birth_place: string | null;
  post_name: string | null;
  address: string | null;
}

export interface WorkerRelativeWorkerRow {
  id: number;
  uuid: string;
  photo: string | null;
  last_name: string | null;
  first_name: string | null;
  middle_name: string | null;
  birthday: string;
  pin: number | null;
}

export interface WorkerRelativeDisabilityRow {
  id: number;
  worker_relative_id: number;
  level: number;
  number: string | null;
  from: string | null;
  to: string | null;
  comment: string | null;
}
