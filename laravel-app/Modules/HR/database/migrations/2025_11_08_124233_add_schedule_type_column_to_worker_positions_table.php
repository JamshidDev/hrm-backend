<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        Schema::table('worker_positions', static function (Blueprint $table) {
            $table->foreignId('turnstile_schedule_type_id')->nullable()->constrained('turnstile_schedule_types');
        });
    }

    public function down(): void
    {
        Schema::table('worker_positions', static function (Blueprint $table) {
            $table->dropConstrainedForeignId('turnstile_schedule_type_id');
        });
    }
};
