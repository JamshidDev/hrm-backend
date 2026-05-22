<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('edu_plan_subjects', static function (Blueprint $table) {
            $table->foreignId('edu_plan_id')->constrained('edu_plans')->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained('subjects');
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('edu_plan_subjects');
    }
};
