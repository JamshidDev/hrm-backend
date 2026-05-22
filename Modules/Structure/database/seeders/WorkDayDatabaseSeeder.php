<?php

namespace Modules\Structure\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\Structure\Models\Schedule;
use Modules\Structure\Models\WorkDay;

class WorkDayDatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $schedule = Schedule::create([
            'name'    => '5-kunlik (9-6)',
            'name_ru' => '5-дневная рабочая неделя (9-6)',
            'name_en' => '5-day workweek (9-6)',
        ]);

        WorkDay::insert([
            [
                'schedule_id' => $schedule->id,
                'day_of_week' => 1,
                'start_time'  => '09:00',
                'end_time'    => '18:00',
                'type'        => 1,
            ],
            [
                'schedule_id' => $schedule->id,
                'day_of_week' => 2,
                'start_time'  => '09:00',
                'end_time'    => '18:00',
                'type'        => 1,
            ],
            [
                'schedule_id' => $schedule->id,
                'day_of_week' => 3,
                'start_time'  => '09:00',
                'end_time'    => '18:00',
                'type'        => 1,
            ],
            [
                'schedule_id' => $schedule->id,
                'day_of_week' => 4,
                'start_time'  => '09:00',
                'end_time'    => '18:00',
                'type'        => 1,
            ],
            [
                'schedule_id' => $schedule->id,
                'day_of_week' => 5,
                'start_time'  => '09:00',
                'end_time'    => '18:00',
                'type'        => 1,
            ]
        ]);

        $schedule = Schedule::create([
            'name'    => '5-kunlik (8-5)',
            'name_ru' => '5-дневная рабочая неделя (8-5)',
            'name_en' => '5-day workweek (8-5)',
        ]);

        WorkDay::insert([
            [
                'schedule_id' => $schedule->id,
                'day_of_week' => 1,
                'start_time'  => '08:00',
                'end_time'    => '17:00',
                'type'        => 1,
            ],
            [
                'schedule_id' => $schedule->id,
                'day_of_week' => 2,
                'start_time'  => '08:00',
                'end_time'    => '17:00',
                'type'        => 1,
            ],
            [
                'schedule_id' => $schedule->id,
                'day_of_week' => 3,
                'start_time'  => '08:00',
                'end_time'    => '17:00',
                'type'        => 1,
            ],
            [
                'schedule_id' => $schedule->id,
                'day_of_week' => 4,
                'start_time'  => '08:00',
                'end_time'    => '17:00',
                'type'        => 1,
            ],
            [
                'schedule_id' => $schedule->id,
                'day_of_week' => 5,
                'start_time'  => '08:00',
                'end_time'    => '17:00',
                'type'        => 1,
            ]
        ]);

        $schedule = Schedule::create([
            'name'    => '6-kunlik (8-4)',
            'name_ru' => '6-дневная рабочая неделя (8-4)',
            'name_en' => '6-day workweek (8-4)',
        ]);

        WorkDay::insert([
            [
                'schedule_id' => $schedule->id,
                'day_of_week' => 1,
                'start_time'  => '08:00',
                'end_time'    => '16:00',
                'type'        => 1,
            ],
            [
                'schedule_id' => $schedule->id,
                'day_of_week' => 2,
                'start_time'  => '08:00',
                'end_time'    => '16:00',
                'type'        => 1,
            ],
            [
                'schedule_id' => $schedule->id,
                'day_of_week' => 3,
                'start_time'  => '08:00',
                'end_time'    => '16:00',
                'type'        => 1,
            ],
            [
                'schedule_id' => $schedule->id,
                'day_of_week' => 4,
                'start_time'  => '08:00',
                'end_time'    => '16:00',
                'type'        => 1,
            ],
            [
                'schedule_id' => $schedule->id,
                'day_of_week' => 5,
                'start_time'  => '08:00',
                'end_time'    => '16:00',
                'type'        => 1,
            ],
            [
                'schedule_id' => $schedule->id,
                'day_of_week' => 6,
                'start_time'  => '08:00',
                'end_time'    => '15:00',
                'type'        => 1,
            ]
        ]);

        $schedule = Schedule::create([
            'name'    => '6-kunlik (9-5)',
            'name_ru' => '6-дневная рабочая неделя (9-5)',
            'name_en' => '6-day workweek (8-4)',
        ]);

        WorkDay::insert([
            [
                'schedule_id' => $schedule->id,
                'day_of_week' => 1,
                'start_time'  => '09:00',
                'end_time'    => '17:00',
                'type'        => 1,
            ],
            [
                'schedule_id' => $schedule->id,
                'day_of_week' => 2,
                'start_time'  => '09:00',
                'end_time'    => '17:00',
                'type'        => 1,
            ],
            [
                'schedule_id' => $schedule->id,
                'day_of_week' => 3,
                'start_time'  => '09:00',
                'end_time'    => '17:00',
                'type'        => 1,
            ],
            [
                'schedule_id' => $schedule->id,
                'day_of_week' => 4,
                'start_time'  => '09:00',
                'end_time'    => '17:00',
                'type'        => 1,
            ],
            [
                'schedule_id' => $schedule->id,
                'day_of_week' => 5,
                'start_time'  => '09:00',
                'end_time'    => '17:00',
                'type'        => 1,
            ],
            [
                'schedule_id' => $schedule->id,
                'day_of_week' => 6,
                'start_time'  => '09:00',
                'end_time'    => '16:00',
                'type'        => 1,
            ]
        ]);
    }
}
