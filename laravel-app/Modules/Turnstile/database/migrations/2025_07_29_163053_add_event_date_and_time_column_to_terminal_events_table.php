<?php

use Carbon\Carbon;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\Turnstile\Models\TerminalEvent;

return new class extends Migration
{

    public function up(): void
    {
        Schema::table('terminal_events', static function (Blueprint $table) {
            $table->timestamp('event_date_and_time')
                ->nullable()
                ->after('event_time')
                ->index('event_date_and_time_index');
        });

        foreach (TerminalEvent::all() as $event) {
            $datetime = Carbon::parse($event->event_date . ' ' . $event->event_time);
            $event->update([
                'event_date_and_time' => $datetime,
            ]);
        }
    }


    public function down(): void
    {
        Schema::table('terminal_events', static function (Blueprint $table) {
            $table->dropIndex('event_date_and_time_index');
            $table->dropColumn('event_date_and_time');
        });
    }
};
