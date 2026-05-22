<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::table('hik_central_access_levels', static function (Blueprint $table) {
            $table->foreignId('hik_central_department_id')
                ->nullable()
                ->after('devices_count')
                ->constrained('hik_central_departments');
        });
    }


    public function down(): void
    {
        Schema::table('hik_central_access_levels', static function (Blueprint $table) {
            $table->dropConstrainedForeignId('hik_central_department_id');
        });
    }
};
