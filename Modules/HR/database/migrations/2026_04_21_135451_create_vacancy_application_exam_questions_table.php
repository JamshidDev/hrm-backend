<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('vacancy_application_exam_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vacancy_application_exam_id')->constrained('vacancy_application_exams')->cascadeOnDelete();
            $table->text('question');
            $table->boolean('is_correct')->default(false);
            $table->json('answers')->nullable();
            $table->integer('result')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vacancy_application_exam_questions');
    }
};
