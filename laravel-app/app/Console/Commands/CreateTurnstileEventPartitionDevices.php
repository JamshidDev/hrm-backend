<?php

namespace App\Console\Commands;

use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CreateTurnstileEventPartitionDevices extends Command
{
    protected $signature = 'table:create-partition';
    protected $description = 'Update in call';

    public function handle($date): void
    {
        $today = Carbon::parse($date)->startOfMonth();

        $monthName = $today->format('Ym');
        $monthStart = $today->format('Y-m-d');
        $monthEnd = $today->copy()->addMonth();
        $monthEndFormat = $today->copy()->addMonth()->format('Y-m-d');

        DB::statement("
            CREATE TABLE IF NOT EXISTS terminal_events_{$monthName} PARTITION OF terminal_events
            FOR VALUES FROM ('$monthStart') TO ('$monthEndFormat')
            PARTITION BY RANGE (event_date_and_time);
        ");

        $daysInMonth = $today->daysInMonth;

        for ($day = 1; $day <= $daysInMonth; $day++) {
            $currentDay = $today->copy()->day($day);
            if ($currentDay >= $monthEnd->startOfDay()) {
                break;
            }
            $dayStart = $currentDay->format('Y-m-d');
            $dayEnd = $currentDay->copy()->addDay()->format('Y-m-d');
            $dayPartition = "terminal_events_{$monthName}_" . str_pad($day, 2, '0', STR_PAD_LEFT);

            DB::statement("
                    CREATE TABLE IF NOT EXISTS {$dayPartition} PARTITION OF terminal_events_{$monthName}
                    FOR VALUES FROM ('$dayStart') TO ('$dayEnd');
                ");

            DB::statement("SELECT create_terminal_events_indexes('{$dayPartition}');");
        }
    }
}
