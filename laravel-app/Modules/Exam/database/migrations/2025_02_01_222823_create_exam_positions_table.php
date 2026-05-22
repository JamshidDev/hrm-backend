<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('exam_positions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_id')->nullable()->constrained('exams')->cascadeOnDelete();
            $table->foreignId('position_id')->nullable()->constrained('positions')->cascadeOnDelete();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('exam_positions');
    }
};
