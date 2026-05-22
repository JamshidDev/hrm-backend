<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vacancy_positions', function (Blueprint $table) {
            $table->boolean('salary_status')->default(true);
            $table->boolean('phd_status')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('vacancy_positions', function (Blueprint $table) {
           $table->dropColumn('salary_status');
           $table->dropColumn('phd_status');
        });
    }
};
