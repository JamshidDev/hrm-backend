<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('turnstile_schedule_groups', static function (Blueprint $table) {
            $table->unsignedInteger('workers_count')->default(0);
            $table->unsignedInteger('worker_positions_count')->default(0);
        });
    }

    public function down(): void
    {
        Schema::table('turnstile_schedule_groups', static function (Blueprint $table) {
            $table->dropColumn('workers_count');
            $table->dropColumn('worker_positions_count');
        });
    }
};
