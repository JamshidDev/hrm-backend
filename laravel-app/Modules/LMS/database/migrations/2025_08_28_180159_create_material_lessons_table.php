<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('material_lessons', static function (Blueprint $table) {
            $table->foreignId('material_id')->constrained('materials')->cascadeOnDelete();
            $table->foreignId('lesson_id')->constrained('lessons')->cascadeOnDelete();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('material_lessons');
    }
};
