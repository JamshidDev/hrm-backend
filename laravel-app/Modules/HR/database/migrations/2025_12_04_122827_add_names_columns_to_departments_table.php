<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('departments', static function (Blueprint $table) {
            $table->string('name_ru')->nullable();
            $table->string('name_en')->nullable();
            $table->text('comment')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('departments', static function (Blueprint $table) {
            $table->dropColumn(['name_ru', 'name_en', 'comment']);
        });
    }
};
