<?php

use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{

    public function up(): void
    {
        Schema::rename('terminal_events', 'terminal_events_old');
        Schema::rename('terminal_events_partitioned', 'terminal_events');
    }


    public function down(): void
    {
        Schema::rename('terminal_events', 'terminal_events_partitioned');
        Schema::rename('terminal_events_old', 'terminal_events');
    }
};
