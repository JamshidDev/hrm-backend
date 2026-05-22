<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::table('terminal_events', static function (Blueprint $table) {
            $table->unique(['worker_id', 'event_date_and_time', 'direction'], 'unique_worker_events');
        });
    }


    public function down(): void
    {
        Schema::table('terminal_events', static function (Blueprint $table) {
            $table->dropUnique('unique_worker_events');
        });
    }
};
