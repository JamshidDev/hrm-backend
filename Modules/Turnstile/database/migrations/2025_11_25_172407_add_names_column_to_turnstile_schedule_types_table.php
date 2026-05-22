<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::table('turnstile_schedule_types', static function (Blueprint $table) {
            $table->string('name_ru')->nullable()->after('name');
            $table->string('name_en')->nullable()->after('name_ru');
            $table->integer('per_day')->nullable()->after('days');
        });
    }


    public function down(): void
    {
        Schema::table('turnstile_schedule_types', static function (Blueprint $table) {
            $table->dropColumn('name_ru');
            $table->dropColumn('name_en');
            $table->dropColumn('per_day');
        });
    }
};
