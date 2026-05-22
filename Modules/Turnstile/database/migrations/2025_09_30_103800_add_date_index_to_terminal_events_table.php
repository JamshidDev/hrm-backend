<?php

use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{

    public function up(): void
    {
        if (config('database.default') === 'pgsql') {
            DB::statement('
            CREATE INDEX idx_terminal_events_in
            ON terminal_events (event_date, worker_id, event_date_and_time ASC)
            WHERE direction = true
        ');

            DB::statement('
            CREATE INDEX idx_terminal_events_out
            ON terminal_events (event_date, worker_id, event_date_and_time DESC)
            WHERE direction = false
        ');
        }
    }


    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS idx_terminal_events_in');
        DB::statement('DROP INDEX IF EXISTS idx_terminal_events_out');
    }
};
