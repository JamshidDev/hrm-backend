<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\LMS\Enums\ExamTypeEnum;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('edu_plan_exams', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('edu_plan_id')
                ->nullable()
                ->constrained('edu_plans')
                ->cascadeOnDelete();
            $table->foreignId('lesson_id')
                ->nullable()
                ->constrained('lessons')
                ->cascadeOnDelete();
            $table->tinyInteger('type')
                ->default(ExamTypeEnum::THREE->value);
            $table->foreignId('exam_id')
                ->constrained('exams')
                ->cascadeOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('edu_plan_exams');
    }
};
