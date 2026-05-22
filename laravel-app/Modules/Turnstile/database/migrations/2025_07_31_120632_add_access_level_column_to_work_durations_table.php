<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::table('work_durations', static function (Blueprint $table) {
            $table->foreignId('access_level_id')
                ->nullable()
                ->after('building_id')
                ->constrained('hik_central_access_levels');
        });
    }


    public function down(): void
    {
        Schema::table('work_durations', static function (Blueprint $table) {
            $table->dropConstrainedForeignId('access_level_id');
        });
    }
};
