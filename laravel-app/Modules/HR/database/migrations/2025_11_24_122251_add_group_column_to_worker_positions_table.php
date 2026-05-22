<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::table('worker_positions',static function (Blueprint $table) {
            $table->foreignId('turnstile_schedule_group_id')
                ->nullable()
                ->after('turnstile_schedule_type_id')
                ->constrained('turnstile_schedule_groups')
                ->cascadeOnDelete();
            $table->boolean('is_turnstile')->after('turnstile_schedule_group_id')->default(true);
        });
    }


    public function down(): void
    {
        Schema::table('worker_positions',static function (Blueprint $table) {
           $table->dropConstrainedForeignId('turnstile_schedule_group_id');
           $table->dropColumn('is_turnstile');
        });
    }
};
