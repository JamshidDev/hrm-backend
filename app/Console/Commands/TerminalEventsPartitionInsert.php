<?php

namespace App\Console\Commands;

use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class TerminalEventsPartitionInsert extends Command
{

    protected $signature = 'terminal:partition-insert {--batch=50000}';
    protected $description = 'Move terminal_events data into partitioned tables by day';

    public function handle()
    {
        $batchSize = $this->option('batch') ?? 10000;
        $days = DB::table('terminal_events')
            ->selectRaw("DATE(event_date_and_time) as day")
            ->groupBy('day')
            ->orderBy('day')
            ->pluck('day');

        $this->info("Batch size: {$batchSize}");

        foreach ($days as $day) {
            $currentDay = Carbon::parse($day);
            $nextDay = $currentDay->copy()->addDay();
            $dayPartition = "terminal_events_" . $currentDay->format('Ym') . "_" . $currentDay->format('d');
            $this->info("Processing day: {$currentDay->format('Y-m-d')} -> Partition: {$dayPartition}");

            DB::statement("
            CREATE TABLE IF NOT EXISTS terminal_events_{$currentDay->format('Ym')}
            PARTITION OF terminal_events_partitioned
            FOR VALUES FROM ('{$currentDay->copy()->startOfMonth()->format('Y-m-d')}')
            TO ('{$currentDay->copy()->addMonth()->startOfMonth()->format('Y-m-d')}')
            PARTITION BY RANGE (date_trunc('day', event_date_and_time))
        ");

            DB::statement("
            CREATE TABLE IF NOT EXISTS {$dayPartition}
            PARTITION OF terminal_events_{$currentDay->format('Ym')}
            FOR VALUES FROM ('{$currentDay->format('Y-m-d')}')
            TO ('{$nextDay->format('Y-m-d')}')
        ");
            do {
                $inserted = DB::affectingStatement("
                INSERT INTO {$dayPartition} (
                    id, worker_id, worker_position_id, hik_central_access_level_id,
                    event_date_and_time, auth_type,
                    device_name, device_serial, resource_name,
                    last_name, first_name, middle_name, direction,
                    temperature, mask_status, created_at, updated_at, deleted_at
                )
                SELECT
                    id, worker_id, worker_position_id, hik_central_access_level_id,
                    event_date_and_time, auth_type,
                    device_name, device_serial, resource_name,
                    last_name, first_name, middle_name, direction,
                    temperature, mask_status, created_at, updated_at, deleted_at
                FROM terminal_events t
                WHERE event_date_and_time >= '{$currentDay->format('Y-m-d')}'
                  AND event_date_and_time < '{$nextDay->format('Y-m-d')}'
                  AND NOT EXISTS (
                      SELECT 1 FROM {$dayPartition} p
                      WHERE p.worker_id = t.worker_id
                        AND p.event_date_and_time = t.event_date_and_time
                        AND p.direction = t.direction
                  )
                ORDER BY id
                LIMIT {$batchSize}
            ");

                $this->info("Inserted: $inserted for {$currentDay->format('Y-m-d')}");
            } while ($inserted > 0);
        }

        $this->info("Barcha kunlar bo‘yicha ko‘chirish tugadi.");
    }

}
